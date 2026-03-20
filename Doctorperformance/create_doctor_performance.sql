-- ============================================================
-- DOCTOR PERFORMANCE DASHBOARD — საწყობი ERP / Dental Clinic
-- ============================================================
-- Prerequisites: appointments, transactions, transaction_items,
--                patients, auth.users, user_profiles, dental_chairs

-- ─── 1. Dental chairs (if not yet created) ───────────────────
CREATE TABLE IF NOT EXISTS dental_chairs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,           -- "სავარძელი #1"
  room        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Appointment ← chair link (if not already present) ────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS chair_id      UUID REFERENCES dental_chairs(id),
  ADD COLUMN IF NOT EXISTS doctor_id     UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS duration_min  INT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS procedure_codes TEXT[],       -- ICD / CPT
  ADD COLUMN IF NOT EXISTS no_show       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelled     BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 3. Core analytics view: doctor_daily_stats ──────────────
CREATE OR REPLACE VIEW doctor_daily_stats AS
SELECT
  DATE_TRUNC('day', a.start_time)::DATE            AS day,
  a.doctor_id,
  up.full_name                                     AS doctor_name,
  COUNT(*)                                         AS total_appointments,
  COUNT(*) FILTER (WHERE a.status = 'completed')   AS completed,
  COUNT(*) FILTER (WHERE a.no_show)                AS no_shows,
  COUNT(*) FILTER (WHERE a.cancelled)              AS cancellations,
  ROUND(AVG(a.duration_min) FILTER
        (WHERE a.status = 'completed'), 0)         AS avg_duration_min,
  COUNT(DISTINCT a.patient_id)                     AS unique_patients
FROM appointments a
LEFT JOIN user_profiles up ON up.id = a.doctor_id
WHERE a.doctor_id IS NOT NULL
GROUP BY 1, 2, 3;

-- ─── 4. Core analytics view: doctor_revenue_stats ────────────
CREATE OR REPLACE VIEW doctor_revenue_stats AS
SELECT
  DATE_TRUNC('month', t.created_at)::DATE          AS month,
  a.doctor_id,
  up.full_name                                     AS doctor_name,
  COUNT(DISTINCT t.id)                             AS invoices,
  COALESCE(SUM(t.total), 0)                        AS gross_revenue,
  COALESCE(SUM(t.discount_total), 0)               AS total_discounts,
  COALESCE(SUM(t.total - t.discount_total), 0)     AS net_revenue,
  COALESCE(SUM(t.tax_total), 0)                    AS tax_collected,
  COALESCE(AVG(t.total), 0)                        AS avg_invoice
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
LEFT JOIN user_profiles up ON up.id = a.doctor_id
WHERE a.doctor_id IS NOT NULL
  AND t.status = 'completed'
GROUP BY 1, 2, 3;

-- ─── 5. Chair utilization view ────────────────────────────────
-- Shows how much of available time each chair was in use
CREATE OR REPLACE VIEW chair_utilization AS
SELECT
  DATE_TRUNC('day', a.start_time)::DATE  AS day,
  a.chair_id,
  dc.name                                AS chair_name,
  dc.room,
  COUNT(*)                               AS appointments,
  SUM(a.duration_min)                    AS booked_minutes,
  -- Assume 8-hour working day = 480 min
  ROUND(
    SUM(a.duration_min)::NUMERIC / 480 * 100, 1
  )                                      AS utilization_pct
FROM appointments a
JOIN dental_chairs dc ON dc.id = a.chair_id
WHERE a.chair_id IS NOT NULL
  AND a.status != 'cancelled'
GROUP BY 1, 2, 3, 4;

-- ─── 6. Patient retention function ───────────────────────────
-- Returns per-doctor patient return rate for a date range
CREATE OR REPLACE FUNCTION get_doctor_retention(
  p_tenant_id  UUID,
  p_doctor_id  UUID DEFAULT NULL,
  p_from       DATE DEFAULT (CURRENT_DATE - INTERVAL '6 months')::DATE,
  p_to         DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  doctor_id         UUID,
  doctor_name       TEXT,
  total_patients    BIGINT,
  returning_patients BIGINT,
  new_patients       BIGINT,
  retention_rate     NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH patient_visits AS (
    SELECT
      a.doctor_id,
      a.patient_id,
      MIN(a.start_time) OVER (PARTITION BY a.doctor_id, a.patient_id) AS first_visit,
      a.start_time
    FROM appointments a
    WHERE a.tenant_id = p_tenant_id
      AND a.start_time::DATE BETWEEN p_from AND p_to
      AND a.status = 'completed'
      AND (p_doctor_id IS NULL OR a.doctor_id = p_doctor_id)
  ),
  classified AS (
    SELECT
      pv.doctor_id,
      pv.patient_id,
      CASE WHEN pv.first_visit::DATE < p_from THEN 'returning' ELSE 'new' END AS kind
    FROM patient_visits pv
    WHERE pv.start_time::DATE BETWEEN p_from AND p_to
    GROUP BY pv.doctor_id, pv.patient_id, kind
  )
  SELECT
    c.doctor_id,
    up.full_name                                        AS doctor_name,
    COUNT(DISTINCT c.patient_id)                        AS total_patients,
    COUNT(DISTINCT c.patient_id) FILTER (WHERE c.kind = 'returning') AS returning_patients,
    COUNT(DISTINCT c.patient_id) FILTER (WHERE c.kind = 'new')       AS new_patients,
    ROUND(
      COUNT(DISTINCT c.patient_id) FILTER (WHERE c.kind = 'returning')::NUMERIC /
      NULLIF(COUNT(DISTINCT c.patient_id), 0) * 100, 1
    )                                                   AS retention_rate
  FROM classified c
  LEFT JOIN user_profiles up ON up.id = c.doctor_id
  GROUP BY c.doctor_id, up.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── 7. Procedure breakdown per doctor ───────────────────────
CREATE OR REPLACE FUNCTION get_doctor_procedures(
  p_tenant_id UUID,
  p_doctor_id UUID DEFAULT NULL,
  p_from      DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_to        DATE DEFAULT CURRENT_DATE,
  p_limit     INT  DEFAULT 10
)
RETURNS TABLE (
  doctor_id       UUID,
  doctor_name     TEXT,
  procedure_name  TEXT,
  count           BIGINT,
  total_revenue   NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.doctor_id,
    up.full_name        AS doctor_name,
    ti.name             AS procedure_name,
    COUNT(*)            AS count,
    SUM(ti.line_total)  AS total_revenue
  FROM transaction_items ti
  JOIN transactions t  ON t.id = ti.transaction_id
  JOIN appointments  a ON a.id = t.appointment_id
  LEFT JOIN user_profiles up ON up.id = a.doctor_id
  WHERE t.tenant_id = p_tenant_id
    AND t.created_at::DATE BETWEEN p_from AND p_to
    AND t.status = 'completed'
    AND (p_doctor_id IS NULL OR a.doctor_id = p_doctor_id)
  GROUP BY a.doctor_id, up.full_name, ti.name
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appt_doctor_time ON appointments(doctor_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_appt_chair_time  ON appointments(chair_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_appt_patient     ON appointments(patient_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_tx_appointment   ON transactions(appointment_id);

-- ─── RLS on dental_chairs ─────────────────────────────────────
ALTER TABLE dental_chairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_chairs" ON dental_chairs
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
