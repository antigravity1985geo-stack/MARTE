-- ============================================================
-- RETURN & REFUND SYSTEM — საწყობი ERP
-- ============================================================
-- Dependencies: transactions, transaction_items, products,
--               cash_drawer_transactions, rsge_audit_logs

-- 1. Returns (header) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Link to original sale
  original_tx_id      UUID NOT NULL REFERENCES transactions(id),
  return_number       TEXT NOT NULL,          -- e.g. RET-2026-00042 (auto-generated)

  -- Who / when
  processed_by        UUID NOT NULL REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Financials
  refund_amount       NUMERIC(12,2) NOT NULL,
  refund_method       TEXT NOT NULL CHECK (refund_method IN ('cash','card','store_credit')),

  -- Cash drawer link (populated when refund_method='cash')
  cash_drawer_tx_id   UUID REFERENCES cash_drawer_transactions(id),

  -- RS.GE
  rsge_status         TEXT NOT NULL DEFAULT 'pending'
                      CHECK (rsge_status IN ('pending','sent','failed','not_required')),
  rsge_document_id    TEXT,        -- credit note ID from RS.GE
  rsge_error          TEXT,

  -- Status
  status              TEXT NOT NULL DEFAULT 'completed'
                      CHECK (status IN ('completed','cancelled')),

  reason              TEXT,        -- optional reason text
  notes               TEXT
);

-- 2. Return Items (lines) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS return_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  return_id           UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,

  -- Original line
  original_item_id    UUID NOT NULL REFERENCES transaction_items(id),
  product_id          UUID NOT NULL REFERENCES products(id),

  -- Quantities
  original_qty        NUMERIC(12,3) NOT NULL,   -- snapshot from original
  returned_qty        NUMERIC(12,3) NOT NULL,   -- what's being returned now

  -- Prices (snapshot from original)
  unit_price          NUMERIC(12,2) NOT NULL,
  discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total          NUMERIC(12,2) NOT NULL,   -- returned_qty * unit_price - proportional discount

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Auto Return Number ────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS return_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.return_number := 'RET-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                       LPAD(NEXTVAL('return_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_return_number ON returns;
CREATE TRIGGER trg_return_number
  BEFORE INSERT ON returns
  FOR EACH ROW EXECUTE FUNCTION generate_return_number();

-- ─── Stock Restore Trigger ─────────────────────────────────────
-- When a return_item is inserted, automatically restore stock
CREATE OR REPLACE FUNCTION restore_stock_on_return()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET
    stock_quantity = stock_quantity + NEW.returned_qty,
    updated_at     = now()
  WHERE id = NEW.product_id;

  -- Log to activity_logs if table exists
  INSERT INTO activity_logs (tenant_id, user_id, action, entity_type, entity_id, details)
  SELECT
    NEW.tenant_id,
    auth.uid(),
    'stock_restored',
    'product',
    NEW.product_id,
    jsonb_build_object(
      'return_id',    NEW.return_id,
      'qty_restored', NEW.returned_qty
    )
  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_restore_stock ON return_items;
CREATE TRIGGER trg_restore_stock
  AFTER INSERT ON return_items
  FOR EACH ROW EXECUTE FUNCTION restore_stock_on_return();

-- ─── Helper: already_returned_qty ─────────────────────────────
-- How much of a transaction_item has already been returned?
CREATE OR REPLACE FUNCTION get_returned_qty(p_original_item_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(ri.returned_qty), 0)
  FROM return_items ri
  JOIN returns r ON r.id = ri.return_id
  WHERE ri.original_item_id = p_original_item_id
    AND r.status = 'completed';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── Atomic Return Creation ────────────────────────────────────
-- Creates return + items + cash_drawer entry in one transaction
CREATE OR REPLACE FUNCTION create_return(
  p_tenant_id         UUID,
  p_original_tx_id    UUID,
  p_refund_method     TEXT,
  p_reason            TEXT,
  p_notes             TEXT,
  p_items             JSONB,   -- [{original_item_id, product_id, returned_qty, unit_price, discount_amount, line_total}]
  p_cash_session_id   UUID DEFAULT NULL,
  p_cash_drawer_id    UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_return        returns;
  v_total         NUMERIC := 0;
  v_item          JSONB;
  v_cash_tx_id    UUID;
BEGIN
  -- Calculate total refund
  SELECT SUM((item->>'line_total')::NUMERIC)
  INTO v_total
  FROM jsonb_array_elements(p_items) AS item;

  -- Create return header
  INSERT INTO returns (
    tenant_id, original_tx_id, processed_by,
    refund_amount, refund_method, reason, notes, status, rsge_status
  ) VALUES (
    p_tenant_id, p_original_tx_id, auth.uid(),
    v_total, p_refund_method, p_reason, p_notes, 'completed',
    CASE WHEN p_refund_method IN ('cash','card') THEN 'pending' ELSE 'not_required' END
  ) RETURNING * INTO v_return;

  -- Insert return items (triggers stock restore per item)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO return_items (
      tenant_id, return_id, original_item_id, product_id,
      original_qty, returned_qty, unit_price, discount_amount, line_total
    ) VALUES (
      p_tenant_id,
      v_return.id,
      (v_item->>'original_item_id')::UUID,
      (v_item->>'product_id')::UUID,
      (v_item->>'original_qty')::NUMERIC,
      (v_item->>'returned_qty')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'discount_amount')::NUMERIC,
      (v_item->>'line_total')::NUMERIC
    );
  END LOOP;

  -- Cash drawer refund transaction
  IF p_refund_method = 'cash' AND p_cash_session_id IS NOT NULL THEN
    INSERT INTO cash_drawer_transactions (
      tenant_id, session_id, drawer_id, type,
      amount, reference_id, performed_by, note
    ) VALUES (
      p_tenant_id, p_cash_session_id, p_cash_drawer_id,
      'refund', v_total, v_return.id, auth.uid(),
      'დაბრუნება #' || v_return.return_number
    ) RETURNING id INTO v_cash_tx_id;

    UPDATE returns SET cash_drawer_tx_id = v_cash_tx_id WHERE id = v_return.id;
  END IF;

  RETURN jsonb_build_object(
    'return_id',      v_return.id,
    'return_number',  v_return.return_number,
    'refund_amount',  v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_returns_tenant       ON returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_returns_original_tx  ON returns(original_tx_id);
CREATE INDEX IF NOT EXISTS idx_returns_created      ON returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_items_return  ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_orig    ON return_items(original_item_id);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE returns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_returns" ON returns
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_return_items" ON return_items
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- ─── Realtime ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE returns;
