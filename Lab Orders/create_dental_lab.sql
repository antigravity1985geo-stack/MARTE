-- ============================================================
-- DENTAL LAB ORDERS MODULE — საწყობი ERP / Clinic
-- ============================================================

-- ─── 1. External dental labs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS dental_labs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  turnaround_days INT NOT NULL DEFAULT 7,   -- default working days to deliver
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Lab order types / work types ──────────────────────────
-- Stored as lookup table so pricing can be maintained per lab
CREATE TABLE IF NOT EXISTS lab_work_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lab_id        UUID REFERENCES dental_labs(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,           -- 'PFM Crown', 'Zirconia Bridge', 'Full Denture'…
  category      TEXT NOT NULL CHECK (category IN (
                  'crown', 'bridge', 'denture', 'veneer',
                  'implant', 'orthodontic', 'other'
                )),
  material      TEXT,                    -- 'Zirconia', 'PFM', 'Acrylic', 'Metal'…
  base_cost     NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL DEFAULT 'unit',  -- 'unit', 'per tooth', 'per arch'
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Lab orders (main table) ───────────────────────────────
CREATE TABLE IF NOT EXISTS lab_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number     TEXT NOT NULL,         -- LOD-2026-00042 (auto-generated)

  -- Relationships
  lab_id           UUID NOT NULL REFERENCES dental_labs(id),
  patient_id       UUID REFERENCES patients(id),   -- adjust to your patients table name
  doctor_id        UUID NOT NULL REFERENCES auth.users(id),
  appointment_id   UUID,                           -- optional link to appointment

  -- Work details
  work_type_id     UUID REFERENCES lab_work_types(id),
  work_type_name   TEXT NOT NULL,         -- snapshot even if work_type deleted
  category         TEXT NOT NULL CHECK (category IN (
                     'crown', 'bridge', 'denture', 'veneer',
                     'implant', 'orthodontic', 'other'
                   )),
  material         TEXT,
  shade            TEXT,                  -- A1, A2, B2, C3, VITA… (tooth colour)
  teeth            TEXT[],                -- e.g. ARRAY['16','17'] (FDI notation)
  units            INT NOT NULL DEFAULT 1,

  -- Instructions
  instructions     TEXT,
  special_notes    TEXT,

  -- Files (X-rays, impressions photos, STL scans)
  attachments      JSONB NOT NULL DEFAULT '[]',  -- [{name, url, type, size}]

  -- Dates
  sent_date        DATE,                  -- when physically dispatched to lab
  due_date         DATE NOT NULL,         -- expected return date
  received_date    DATE,                  -- actual return date
  fit_date         DATE,                  -- when fitted to patient

  -- Cost
  lab_cost         NUMERIC(10,2) NOT NULL DEFAULT 0,   -- what clinic pays lab
  patient_cost     NUMERIC(10,2) NOT NULL DEFAULT 0,   -- what patient pays clinic
  paid_to_lab      BOOLEAN NOT NULL DEFAULT FALSE,
  paid_date        DATE,

  -- Status workflow
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN (
                     'draft',        -- created, not yet sent
                     'sent',         -- dispatched to lab
                     'in_progress',  -- lab confirmed working on it
                     'ready',        -- lab says it's done, awaiting pickup
                     'received',     -- back at clinic
                     'fitted',       -- fitted to patient
                     'remake',       -- returned to lab for remake
                     'cancelled'
                   )),
  remake_reason    TEXT,
  cancel_reason    TEXT,

  -- Tracking
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. Status history / timeline ────────────────────────────
CREATE TABLE IF NOT EXISTS lab_order_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  note        TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. Auto order number ─────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS lab_order_seq START 1;

CREATE OR REPLACE FUNCTION set_lab_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'LAB-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                      LPAD(NEXTVAL('lab_order_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lab_order_number ON lab_orders;
CREATE TRIGGER trg_lab_order_number
  BEFORE INSERT ON lab_orders
  FOR EACH ROW WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION set_lab_order_number();

-- ─── 6. Auto-log status changes ───────────────────────────────
CREATE OR REPLACE FUNCTION log_lab_order_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status <> OLD.status THEN
    INSERT INTO lab_order_events(tenant_id, order_id, status, performed_by)
    VALUES (NEW.tenant_id, NEW.id, NEW.status, auth.uid());
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lab_order_log ON lab_orders;
CREATE TRIGGER trg_lab_order_log
  BEFORE INSERT OR UPDATE ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION log_lab_order_status();

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lo_tenant_status ON lab_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_lo_lab           ON lab_orders(lab_id);
CREATE INDEX IF NOT EXISTS idx_lo_patient       ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lo_due           ON lab_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_lo_events        ON lab_order_events(order_id, created_at);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE dental_labs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_work_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_order_events  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_dental_labs"      ON dental_labs
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "tenant_lab_work_types"   ON lab_work_types
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "tenant_lab_orders"       ON lab_orders
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "tenant_lab_order_events" ON lab_order_events
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- ─── Realtime ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE lab_orders;

-- ─── Seed: sample work types ──────────────────────────────────
-- Run after inserting your lab:
-- INSERT INTO lab_work_types (tenant_id, name, category, material, base_cost) VALUES
--   ('<tid>', 'PFM Crown',        'crown',     'PFM',      120),
--   ('<tid>', 'Zirconia Crown',   'crown',     'Zirconia', 180),
--   ('<tid>', 'Zirconia Bridge',  'bridge',    'Zirconia', 160),  -- per unit
--   ('<tid>', 'Full Denture',     'denture',   'Acrylic',  250),
--   ('<tid>', 'Partial Denture',  'denture',   'Acrylic',  180),
--   ('<tid>', 'Porcelain Veneer', 'veneer',    'Ceramic',  140),
--   ('<tid>', 'Implant Crown',    'implant',   'Zirconia', 220);
