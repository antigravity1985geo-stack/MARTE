-- ============================================================
-- MEDICAL BILLING SYSTEM — საწყობი ERP / Clinic Module
-- ============================================================

-- ─── 1. Insurance companies ───────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,                    -- internal short code
  contact_name    TEXT,
  phone           TEXT,
  email           TEXT,
  claim_email     TEXT,                    -- where to send claims
  coverage_pct    NUMERIC(5,2) DEFAULT 80, -- typical coverage %
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Patient insurance policies ───────────────────────────
CREATE TABLE IF NOT EXISTS patient_insurance (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL,          -- references your patients table
  insurer_id          UUID NOT NULL REFERENCES insurance_companies(id),
  policy_number       TEXT NOT NULL,
  group_number        TEXT,
  holder_name         TEXT,
  coverage_pct        NUMERIC(5,2) NOT NULL DEFAULT 80,
  annual_limit        NUMERIC(12,2),
  deductible          NUMERIC(12,2) DEFAULT 0,
  deductible_met      NUMERIC(12,2) DEFAULT 0,
  valid_from          DATE NOT NULL,
  valid_to            DATE,
  is_primary          BOOLEAN NOT NULL DEFAULT TRUE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Medical invoices ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number      TEXT NOT NULL,          -- INV-2026-00042

  -- Patient / appointment
  patient_id          UUID NOT NULL,
  patient_name        TEXT NOT NULL,
  patient_phone       TEXT,
  appointment_id      UUID,
  doctor_id           UUID REFERENCES auth.users(id),
  doctor_name         TEXT,

  -- Insurance split
  insurer_id          UUID REFERENCES insurance_companies(id),
  policy_id           UUID REFERENCES patient_insurance(id),
  insurance_pct       NUMERIC(5,2) DEFAULT 0,   -- % covered by insurer
  insurance_amount    NUMERIC(12,2) DEFAULT 0,
  copay_amount        NUMERIC(12,2) DEFAULT 0,  -- patient's portion

  -- Totals
  subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total               NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid         NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due         NUMERIC(12,2) GENERATED ALWAYS AS (total - amount_paid) STORED,

  -- Dates
  issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE NOT NULL,
  paid_date           DATE,

  -- Status
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN (
                        'draft','issued','partially_paid',
                        'paid','overdue','cancelled','written_off'
                      )),

  payment_method      TEXT,  -- 'cash','card','insurance','installment','mixed'
  notes               TEXT,

  created_by          UUID NOT NULL REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. Invoice line items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES medical_invoices(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  procedure_code  TEXT,               -- ICD-10 / CPT code
  quantity        NUMERIC(8,3) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) NOT NULL,
  discount_pct    NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_pct         NUMERIC(5,2) DEFAULT 0,
  line_total      NUMERIC(12,2) NOT NULL,
  is_insured      BOOLEAN DEFAULT TRUE,  -- whether insurer covers this line
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. Invoice payments ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES medical_invoices(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  method          TEXT NOT NULL CHECK (method IN ('cash','card','bank_transfer','insurance','installment')),
  reference       TEXT,               -- card approval, bank ref, etc.
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by     UUID REFERENCES auth.users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 6. Insurance claims ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_claims (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  claim_number        TEXT NOT NULL,          -- CLM-2026-00018

  invoice_id          UUID NOT NULL REFERENCES medical_invoices(id),
  insurer_id          UUID NOT NULL REFERENCES insurance_companies(id),
  policy_id           UUID REFERENCES patient_insurance(id),

  claimed_amount      NUMERIC(12,2) NOT NULL,
  approved_amount     NUMERIC(12,2),
  paid_amount         NUMERIC(12,2),
  rejection_reason    TEXT,

  submitted_at        TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  resubmitted_at      TIMESTAMPTZ,

  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN (
                        'draft','submitted','under_review',
                        'approved','partial','rejected','paid','resubmitted'
                      )),

  diagnosis_codes     TEXT[],         -- ICD-10 codes
  procedure_codes     TEXT[],         -- CPT / service codes
  notes               TEXT,
  attachments         JSONB DEFAULT '[]',

  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 7. Installment plans ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS installment_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id          UUID NOT NULL REFERENCES medical_invoices(id),
  patient_id          UUID NOT NULL,

  total_amount        NUMERIC(12,2) NOT NULL,  -- amount being financed
  down_payment        NUMERIC(12,2) NOT NULL DEFAULT 0,
  financed_amount     NUMERIC(12,2) NOT NULL,  -- total - down_payment
  installment_count   INT NOT NULL,
  installment_amount  NUMERIC(12,2) NOT NULL,  -- per installment
  frequency           TEXT NOT NULL DEFAULT 'monthly'
                      CHECK (frequency IN ('weekly','biweekly','monthly')),

  first_due_date      DATE NOT NULL,
  interest_pct        NUMERIC(5,2) DEFAULT 0,  -- 0 = interest-free

  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','completed','defaulted','cancelled')),

  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 8. Installment payment schedule ─────────────────────────
CREATE TABLE IF NOT EXISTS installment_schedule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES installment_plans(id) ON DELETE CASCADE,
  installment_no  INT NOT NULL,
  due_date        DATE NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  paid_amount     NUMERIC(12,2) DEFAULT 0,
  paid_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','overdue','waived')),
  payment_id      UUID REFERENCES invoice_payments(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Auto-number triggers ─────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS claim_seq   START 1;

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(),'YYYY') || '-' ||
                          LPAD(NEXTVAL('invoice_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
    NEW.claim_number := 'CLM-' || TO_CHAR(NOW(),'YYYY') || '-' ||
                        LPAD(NEXTVAL('claim_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_number ON medical_invoices;
CREATE TRIGGER trg_invoice_number BEFORE INSERT ON medical_invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

DROP TRIGGER IF EXISTS trg_claim_number ON insurance_claims;
CREATE TRIGGER trg_claim_number BEFORE INSERT ON insurance_claims
  FOR EACH ROW EXECUTE FUNCTION set_claim_number();

-- ─── Auto-update balance + status on payment ─────────────────
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total     NUMERIC;
  v_paid      NUMERIC;
  v_new_status TEXT;
BEGIN
  SELECT total, COALESCE(SUM(p.amount), 0)
  INTO v_total, v_paid
  FROM medical_invoices i
  LEFT JOIN invoice_payments p ON p.invoice_id = i.id
  WHERE i.id = NEW.invoice_id
  GROUP BY i.total;

  v_paid := v_paid;

  IF v_paid >= v_total THEN
    v_new_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    v_new_status := 'issued';
  END IF;

  UPDATE medical_invoices SET
    amount_paid  = v_paid,
    status       = v_new_status,
    paid_date    = CASE WHEN v_new_status = 'paid' THEN NOW()::DATE ELSE NULL END,
    updated_at   = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_payment ON invoice_payments;
CREATE TRIGGER trg_invoice_payment AFTER INSERT ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment();

-- ─── Function: generate installment schedule ──────────────────
CREATE OR REPLACE FUNCTION create_installment_schedule(p_plan_id UUID)
RETURNS VOID AS $$
DECLARE
  v_plan    installment_plans%ROWTYPE;
  v_date    DATE;
  v_i       INT;
  v_amount  NUMERIC;
BEGIN
  SELECT * INTO v_plan FROM installment_plans WHERE id = p_plan_id;

  v_date   := v_plan.first_due_date;
  v_amount := v_plan.installment_amount;

  FOR v_i IN 1..v_plan.installment_count LOOP
    INSERT INTO installment_schedule
      (tenant_id, plan_id, installment_no, due_date, amount)
    VALUES
      (v_plan.tenant_id, p_plan_id, v_i, v_date, v_amount);

    v_date := CASE v_plan.frequency
      WHEN 'weekly'    THEN v_date + INTERVAL '7 days'
      WHEN 'biweekly'  THEN v_date + INTERVAL '14 days'
      ELSE                  v_date + INTERVAL '1 month'
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Overdue updater (run as cron or on-demand) ───────────────
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INT AS $$
DECLARE v_count INT;
BEGIN
  UPDATE medical_invoices SET status = 'overdue', updated_at = NOW()
  WHERE status = 'issued'
    AND due_date < CURRENT_DATE
    AND balance_due > 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inv_patient    ON medical_invoices(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_status     ON medical_invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_due        ON medical_invoices(due_date) WHERE status NOT IN ('paid','cancelled');
CREATE INDEX IF NOT EXISTS idx_claims_invoice ON insurance_claims(invoice_id);
CREATE INDEX IF NOT EXISTS idx_claims_status  ON insurance_claims(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sched_plan     ON installment_schedule(plan_id, due_date);
CREATE INDEX IF NOT EXISTS idx_sched_due      ON installment_schedule(due_date) WHERE status = 'pending';

-- ─── RLS ───────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE insurance_companies  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE patient_insurance    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE medical_invoices     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE invoice_items        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE invoice_payments     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE insurance_claims     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE installment_plans    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE installment_schedule ENABLE ROW LEVEL SECURITY;
END $$;

CREATE POLICY "t_insurers"   ON insurance_companies  USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "t_pat_ins"    ON patient_insurance    USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "t_invoices"   ON medical_invoices     USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "t_inv_items"  ON invoice_items        USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "t_inv_pay"    ON invoice_payments     USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "t_claims"     ON insurance_claims     USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "t_inst_plans" ON installment_plans    USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "t_inst_sched" ON installment_schedule USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE medical_invoices, insurance_claims, installment_schedule;
