-- ============================================================
-- HOLD / PARK ORDERS — საწყობი ERP / POS Module
-- ============================================================

CREATE TABLE IF NOT EXISTS held_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  drawer_id       UUID REFERENCES cash_drawers(id),
  held_by         UUID NOT NULL REFERENCES auth.users(id),

  label           TEXT,                  -- custom name: "მაგ. მომხმარებელი 3"
  hold_number     INT NOT NULL,          -- sequential: 1, 2, 3 …

  -- Serialised cart snapshot
  items           JSONB NOT NULL DEFAULT '[]',
  -- [{product_id, name, barcode, price, qty, discount, line_total, tax_rate}]

  -- Totals snapshot
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Client (optional)
  client_id       UUID,
  client_name     TEXT,

  -- Applied discount from DiscountAuth
  discount_audit_id UUID,
  discount_amount   NUMERIC(12,2),

  -- Notes
  notes           TEXT,

  status          TEXT NOT NULL DEFAULT 'held'
                  CHECK (status IN ('held', 'resumed', 'voided')),

  held_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resumed_at      TIMESTAMPTZ,
  voided_at       TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-increment hold_number per tenant per day
CREATE OR REPLACE FUNCTION assign_hold_number()
RETURNS TRIGGER AS $$
DECLARE v_max INT;
BEGIN
  SELECT COALESCE(MAX(hold_number), 0) INTO v_max
  FROM held_orders
  WHERE tenant_id = NEW.tenant_id
    AND held_at::DATE = CURRENT_DATE;
  NEW.hold_number := v_max + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hold_number ON held_orders;
CREATE TRIGGER trg_hold_number
  BEFORE INSERT ON held_orders
  FOR EACH ROW EXECUTE FUNCTION assign_hold_number();

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_held_tenant_status ON held_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_held_drawer        ON held_orders(drawer_id);
CREATE INDEX IF NOT EXISTS idx_held_held_at       ON held_orders(held_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE held_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_held_orders" ON held_orders
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- ─── Realtime ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE held_orders;
