-- ============================================================
-- SPLIT PAYMENT SYSTEM — საწყობი ERP / POS Module
-- ============================================================
-- Extends existing: transactions, cash_drawer_sessions

-- ─── 1. Payment methods enum ──────────────────────────────────
-- Stored as TEXT with CHECK; no enum type so migrations stay
-- flexible and the list is extendable.

-- ─── 2. transaction_payments  ────────────────────────────────
-- One row per payment leg on a transaction.
-- A plain single-method sale gets exactly 1 row.
-- A split sale gets 2+ rows.
CREATE TABLE IF NOT EXISTS transaction_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_id    UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,

  method            TEXT NOT NULL CHECK (method IN (
                      'cash', 'card', 'store_credit',
                      'gift_card', 'bank_transfer'
                    )),
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),

  -- Card-specific (filled when method = 'card')
  card_last4        TEXT,
  card_brand        TEXT,          -- 'visa','mastercard','amex',…
  terminal_ref      TEXT,          -- POS terminal reference number
  approval_code     TEXT,          -- bank approval code

  -- Cash-specific
  cash_tendered     NUMERIC(12,2), -- amount given by customer
  cash_change       NUMERIC(12,2), -- change returned

  -- Cash drawer link
  cash_drawer_tx_id UUID REFERENCES cash_drawer_transactions(id),

  -- RS.GE
  rsge_payment_type TEXT,          -- '1'=cash '2'=card per RS.GE spec

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Migrate existing transactions ─────────────────────────
-- Backfill: one payment row per existing transaction
-- Run once after creating the table.
-- INSERT INTO transaction_payments (
--   tenant_id, transaction_id, method, amount
-- )
-- SELECT tenant_id, id, payment_method, total
-- FROM transactions
-- WHERE NOT EXISTS (
--   SELECT 1 FROM transaction_payments tp WHERE tp.transaction_id = transactions.id
-- );

-- ─── 4. Alter transactions — add payment summary columns ──────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_split_payment   BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cash_amount         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS card_amount         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS other_amount        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cash_tendered       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cash_change         NUMERIC(12,2);

-- ─── 5. Atomic split-payment finalize function ────────────────
-- Called from client via supabase.rpc('finalize_split_payment', …)
-- Creates the transaction + payment legs + cash-drawer entries atomically.
CREATE OR REPLACE FUNCTION finalize_split_payment(
  p_tenant_id         UUID,
  p_cart_items        JSONB,   -- [{product_id,name,qty,unit_price,discount,line_total,tax_rate}]
  p_subtotal          NUMERIC,
  p_discount_total    NUMERIC,
  p_tax_total         NUMERIC,
  p_total             NUMERIC,
  p_payments          JSONB,   -- [{method,amount,cash_tendered?,card_last4?,approval_code?,terminal_ref?}]
  p_client_id         UUID DEFAULT NULL,
  p_client_name       TEXT DEFAULT NULL,
  p_notes             TEXT DEFAULT NULL,
  p_cash_session_id   UUID DEFAULT NULL,
  p_cash_drawer_id    UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tx            transactions%ROWTYPE;
  v_receipt_num   TEXT;
  v_pay           JSONB;
  v_cash_amount   NUMERIC := 0;
  v_card_amount   NUMERIC := 0;
  v_other_amount  NUMERIC := 0;
  v_cash_tendered NUMERIC := 0;
  v_cash_change   NUMERIC := 0;
  v_cash_drawer_tx UUID;
  v_item          JSONB;
BEGIN
  -- ── Validate payment sum ────────────────────────────────────
  IF (SELECT COALESCE(SUM((p->>'amount')::NUMERIC),0)
      FROM jsonb_array_elements(p_payments) p) < p_total THEN
    RAISE EXCEPTION 'გადახდის ჯამი ნაკლებია სულ თანხაზე';
  END IF;

  -- ── Generate receipt number ─────────────────────────────────
  v_receipt_num := 'RCP-' || TO_CHAR(NOW(),'YYYY') || '-' ||
                   LPAD(NEXTVAL('receipt_number_seq')::TEXT, 5, '0');

  -- ── Aggregate payment buckets ───────────────────────────────
  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    CASE v_pay->>'method'
      WHEN 'cash' THEN
        v_cash_amount   := v_cash_amount + (v_pay->>'amount')::NUMERIC;
        v_cash_tendered := COALESCE((v_pay->>'cash_tendered')::NUMERIC, (v_pay->>'amount')::NUMERIC);
        v_cash_change   := GREATEST(0, v_cash_tendered - (v_pay->>'amount')::NUMERIC);
      WHEN 'card' THEN
        v_card_amount   := v_card_amount + (v_pay->>'amount')::NUMERIC;
      ELSE
        v_other_amount  := v_other_amount + (v_pay->>'amount')::NUMERIC;
    END CASE;
  END LOOP;

  -- ── Create transaction ──────────────────────────────────────
  INSERT INTO transactions (
    tenant_id, receipt_number, client_id, client_name,
    subtotal, discount_total, tax_total, total,
    payment_method,
    is_split_payment, cash_amount, card_amount, other_amount,
    cash_tendered, cash_change,
    notes, status, created_by
  ) VALUES (
    p_tenant_id, v_receipt_num, p_client_id, p_client_name,
    p_subtotal, p_discount_total, p_tax_total, p_total,
    CASE
      WHEN v_cash_amount > 0 AND v_card_amount > 0 THEN 'split'
      WHEN v_cash_amount > 0 THEN 'cash'
      WHEN v_card_amount > 0 THEN 'card'
      ELSE 'other'
    END,
    (SELECT COUNT(*)::INT > 1 FROM jsonb_array_elements(p_payments)),
    NULLIF(v_cash_amount, 0),
    NULLIF(v_card_amount, 0),
    NULLIF(v_other_amount, 0),
    NULLIF(v_cash_tendered, 0),
    NULLIF(v_cash_change, 0),
    p_notes, 'completed', auth.uid()
  ) RETURNING * INTO v_tx;

  -- ── Insert cart items ───────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    INSERT INTO transaction_items (
      tenant_id, transaction_id, product_id, name,
      qty, unit_price, discount_amount, line_total, tax_rate
    ) VALUES (
      p_tenant_id, v_tx.id,
      (v_item->>'product_id')::UUID,
      v_item->>'name',
      (v_item->>'qty')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0),
      (v_item->>'line_total')::NUMERIC,
      COALESCE((v_item->>'tax_rate')::NUMERIC, 18)
    );

    -- Deduct stock
    UPDATE products
    SET stock_quantity = stock_quantity - (v_item->>'qty')::NUMERIC,
        updated_at = now()
    WHERE id = (v_item->>'product_id')::UUID;
  END LOOP;

  -- ── Insert payment legs ─────────────────────────────────────
  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    -- Cash drawer entry for cash leg
    v_cash_drawer_tx := NULL;
    IF v_pay->>'method' = 'cash' AND p_cash_session_id IS NOT NULL THEN
      INSERT INTO cash_drawer_transactions (
        tenant_id, session_id, drawer_id, type,
        amount, reference_id, performed_by, note
      ) VALUES (
        p_tenant_id, p_cash_session_id, p_cash_drawer_id,
        'sale', (v_pay->>'amount')::NUMERIC,
        v_tx.id, auth.uid(),
        'გაყიდვა #' || v_receipt_num
      ) RETURNING id INTO v_cash_drawer_tx;
    END IF;

    INSERT INTO transaction_payments (
      tenant_id, transaction_id, method, amount,
      cash_tendered, cash_change,
      card_last4, card_brand, terminal_ref, approval_code,
      cash_drawer_tx_id,
      rsge_payment_type
    ) VALUES (
      p_tenant_id, v_tx.id,
      v_pay->>'method',
      (v_pay->>'amount')::NUMERIC,
      NULLIF((v_pay->>'cash_tendered')::NUMERIC, 0),
      NULLIF((v_pay->>'cash_change')::NUMERIC,   0),
      v_pay->>'card_last4',
      v_pay->>'card_brand',
      v_pay->>'terminal_ref',
      v_pay->>'approval_code',
      v_cash_drawer_tx,
      CASE v_pay->>'method' WHEN 'cash' THEN '1' WHEN 'card' THEN '2' ELSE '9' END
    );
  END LOOP;

  RETURN jsonb_build_object(
    'transaction_id',  v_tx.id,
    'receipt_number',  v_receipt_num,
    'total',           p_total,
    'cash_amount',     v_cash_amount,
    'card_amount',     v_card_amount,
    'cash_change',     v_cash_change
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tx_payments_tx   ON transaction_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_payments_meth ON transaction_payments(method);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_tx_payments" ON transaction_payments
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
