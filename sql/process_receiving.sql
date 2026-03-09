-- =============================================
-- Phase 1 - ACID Transaction: process_receiving
-- =============================================

CREATE OR REPLACE FUNCTION process_receiving(
  p_product_id text,
  p_product_name text,
  p_quantity numeric,
  p_price numeric,
  p_supplier_id text,
  p_supplier_name text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id uuid;
  v_entry_id uuid;
  v_total numeric := p_quantity * p_price;
  v_debit_acc record;
  v_credit_acc record;
  v_je_count integer;
  v_entry_num text;
  v_debit_delta numeric;
  v_credit_delta numeric;
  v_product record;
BEGIN
  -- 1. ADVISORY LOCKS / STOCK CHECKS
  SELECT * INTO v_product FROM products WHERE id = p_product_id::uuid FOR UPDATE;
  IF NOT FOUND THEN
     RAISE EXCEPTION 'PRODUCT_NOT_FOUND: %', p_product_id;
  END IF;

  -- 2. CREATE TRANSACTION
  INSERT INTO transactions (
    user_id, type, total, payment_method, status, date,
    product_id, product_name, quantity, price,
    supplier_id, supplier_name
  )
  VALUES (
    p_user_id, 'receive', v_total, 'bank', 'completed', now(),
    p_product_id, p_product_name, p_quantity, p_price,
    p_supplier_id, p_supplier_name
  ) RETURNING id INTO v_transaction_id;

  -- 3. INCREASE STOCK & UPDATE BUY PRICE
  UPDATE products 
  SET stock = stock + p_quantity,
      buy_price = p_price
  WHERE id = p_product_id::uuid;

  -- 4. ACCOUNTING (Journal Entries)
  -- 1300 = Inventory (Debit), 2110 = Accounts Payable (Credit)
  SELECT * INTO v_debit_acc FROM accounts WHERE code = '1300' AND user_id = p_user_id;
  SELECT * INTO v_credit_acc FROM accounts WHERE code = '2110' AND user_id = p_user_id;
  
  IF FOUND AND v_debit_acc IS NOT NULL AND v_credit_acc IS NOT NULL THEN
    -- Get next JE number
    SELECT count(*) INTO v_je_count FROM journal_entries WHERE user_id = p_user_id;
    v_entry_num := 'JE-' || lpad((v_je_count + 1)::text, 4, '0');

    -- Insert Entry
    INSERT INTO journal_entries (user_id, entry_number, date, description, total_debit, total_credit, status, reference)
    VALUES (p_user_id, v_entry_num, now()::date, 'მიღება: ' || p_product_name || ' x' || p_quantity::text, v_total, v_total, 'posted', v_transaction_id::text)
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
