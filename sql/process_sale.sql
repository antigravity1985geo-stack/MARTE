-- =============================================
-- Phase 1 - ACID Transaction: process_sale
-- =============================================

CREATE OR REPLACE FUNCTION process_sale(
  p_cart jsonb,           -- [{"product_id": "uuid", "name": "...", "qty": 2, "price": 5.50}, ...]
  p_payment text,         -- 'cash' | 'card' | 'mixed'
  p_total numeric,        -- final total amount
  p_cashier_id text,      -- cashier id (from currentShift)
  p_client_id text,       -- client id or null
  p_coupon_discount numeric,
  p_loyalty_discount numeric,
  p_points_earned integer DEFAULT 0,
  p_user_id uuid DEFAULT auth.uid() -- user id performing the sale
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id uuid;
  v_entry_id uuid;
  v_item jsonb;
  v_product record;
  v_debit_account text;
  v_total numeric := p_total;
  v_debit_acc record;
  v_credit_acc record;
  v_je_count integer;
  v_entry_num text;
  v_debit_delta numeric;
  v_credit_delta numeric;
  v_material record;
BEGIN
  -- 1. ADVISORY LOCKS / STOCK CHECKS
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart) LOOP
    -- Acquire row-level lock
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    
    IF NOT FOUND THEN
       RAISE EXCEPTION 'PRODUCT_NOT_FOUND: %', v_item->>'name';
    END IF;

    -- Note: We allow negative stock in this MVP, but we still apply the change atomically
  END LOOP;

  -- 2. CREATE TRANSACTION
  INSERT INTO transactions (
    user_id, type, total, payment_method, cashier_id, client_id, status, coupon_discount, loyalty_discount, date
  )
  VALUES (
    p_user_id, 'sale', v_total, p_payment, p_cashier_id, p_client_id, 'completed', p_coupon_discount, p_loyalty_discount, now()
  ) RETURNING id INTO v_transaction_id;

  -- 3. WRITE TRANSACTION ITEMS AND DECREASE STOCK
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart) LOOP
    INSERT INTO transaction_items (transaction_id, product_id, name, quantity, price)
    VALUES (
      v_transaction_id, 
      v_item->>'product_id', 
      v_item->>'name', 
      (v_item->>'qty')::numeric, 
      (v_item->>'price')::numeric
    );

    UPDATE products 
    SET stock = stock - (v_item->>'qty')::numeric 
    WHERE id = (v_item->>'product_id')::uuid;

    -- 3.5 Deduct service materials if any
    FOR v_material IN SELECT * FROM salon_service_materials WHERE service_id = (v_item->>'product_id')::uuid LOOP
      UPDATE products 
      SET stock = stock - (v_material.quantity * (v_item->>'qty')::numeric)
      WHERE id = v_material.product_id;
    END LOOP;
  END LOOP;

  -- 4. UPDATE LOYALTY (If applicable)
  IF p_client_id IS NOT NULL AND p_client_id != '' THEN
    UPDATE clients 
    SET total_purchases = total_purchases + v_total 
    WHERE id = p_client_id::uuid;
    
    -- In this schema points logic is handled differently, just updating total_purchases is standard based on useClients hook
  END IF;

  -- 5. ACCOUNTING (Journal Entries)
  -- Determine debit account
  IF p_payment = 'cash' THEN
    v_debit_account := '2310';
  ELSIF p_payment = 'card' THEN
    v_debit_account := '2320';
  ELSE
    v_debit_account := '2310'; -- Default for mixed currently
  END IF;

  -- Verify accounts exist
  SELECT * INTO v_debit_acc FROM accounts WHERE code = v_debit_account AND user_id = p_user_id;
  SELECT * INTO v_credit_acc FROM accounts WHERE code = '4100' AND user_id = p_user_id; -- 4100 Income
  
  IF FOUND AND v_debit_acc IS NOT NULL AND v_credit_acc IS NOT NULL THEN
    -- Get next JE number
    SELECT count(*) INTO v_je_count FROM journal_entries WHERE user_id = p_user_id;
    v_entry_num := 'JE-' || lpad((v_je_count + 1)::text, 4, '0');

    -- Insert Entry
    INSERT INTO journal_entries (user_id, entry_number, date, description, total_debit, total_credit, status, reference)
    VALUES (p_user_id, v_entry_num, now()::date, 'გაყიდვა POS', v_total, v_total, 'posted', v_transaction_id::text)
    RETURNING id INTO v_entry_id;

    -- Insert Lines
    INSERT INTO journal_lines (journal_entry_id, account_id, account_code, account_name, debit, credit)
    VALUES (v_entry_id, v_debit_acc.id, v_debit_acc.code, v_debit_acc.name, v_total, 0);

    INSERT INTO journal_lines (journal_entry_id, account_id, account_code, account_name, debit, credit)
    VALUES (v_entry_id, v_credit_acc.id, v_credit_acc.code, v_credit_acc.name, 0, v_total);

    -- Update balances
    v_debit_delta := CASE WHEN v_debit_acc.type IN ('asset', 'expense') THEN v_total ELSE -v_total END;
    v_credit_delta := CASE WHEN v_credit_acc.type IN ('liability', 'equity', 'revenue') THEN v_total ELSE -v_total END;

    UPDATE accounts SET balance = balance + v_debit_delta WHERE id = v_debit_acc.id;
    UPDATE accounts SET balance = balance + v_credit_delta WHERE id = v_credit_acc.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'total', v_total
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
