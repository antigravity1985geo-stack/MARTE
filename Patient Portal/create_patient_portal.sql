-- ============================================================
-- PATIENT PORTAL — საწყობი ERP / Clinic Module
-- ============================================================
-- Patients access via magic-link / OTP (no password needed).
-- All portal data is scoped to one patient_id.

-- ─── 1. Portal access tokens (magic link / OTP) ───────────────
CREATE TABLE IF NOT EXISTS portal_access_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id    UUID NOT NULL,
  patient_phone TEXT,
  patient_email TEXT,
  token         TEXT NOT NULL UNIQUE,       -- random 6-digit OTP or UUID link
  token_type    TEXT NOT NULL DEFAULT 'otp' CHECK (token_type IN ('otp','link')),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Portal sessions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id    UUID NOT NULL,
  patient_name  TEXT NOT NULL,
  patient_phone TEXT,
  patient_email TEXT,
  session_token TEXT NOT NULL UNIQUE,       -- sent in cookie / localStorage
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_hint   TEXT
);

-- ─── 3. Online appointment requests ──────────────────────────
-- Patients request via portal → clinic confirms → goes into appointments
CREATE TABLE IF NOT EXISTS appointment_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id      UUID,
  patient_name    TEXT NOT NULL,
  patient_phone   TEXT NOT NULL,
  patient_email   TEXT,
  preferred_date  DATE NOT NULL,
  preferred_time  TEXT,                     -- '09:00' – '17:00' window
  doctor_id       UUID,                     -- optional preference
  service_name    TEXT,                     -- what they need
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','rejected','cancelled')),
  confirmed_appointment_id UUID,            -- set when clinic confirms
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. Patient documents (portal-visible) ────────────────────
CREATE TABLE IF NOT EXISTS patient_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id    UUID NOT NULL,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN (
                  'lab_result','xray','prescription','invoice',
                  'consent','referral','report','other'
                )),
  file_url      TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     INT,
  mime_type     TEXT,
  is_portal_visible BOOLEAN NOT NULL DEFAULT TRUE,  -- clinic controls visibility
  appointment_id    UUID,
  uploaded_by       UUID REFERENCES auth.users(id),
  notes             TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. Portal notifications ─────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id  UUID NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info'
              CHECK (type IN ('info','reminder','result','invoice','system')),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  link_type   TEXT,         -- 'appointment' | 'document' | 'invoice'
  link_id     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RPC: generate OTP ────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_portal_otp(
  p_tenant_id    UUID,
  p_patient_id   UUID,
  p_patient_phone TEXT
) RETURNS TEXT AS $$
DECLARE
  v_otp TEXT;
BEGIN
  -- Invalidate old tokens for this patient
  UPDATE portal_access_tokens SET used_at = NOW()
  WHERE patient_id = p_patient_id AND used_at IS NULL AND expires_at > NOW();

  -- 6-digit OTP
  v_otp := LPAD((FLOOR(RANDOM() * 900000) + 100000)::TEXT, 6, '0');

  INSERT INTO portal_access_tokens
    (tenant_id, patient_id, patient_phone, token, token_type)
  VALUES
    (p_tenant_id, p_patient_id, p_patient_phone, v_otp, 'otp');

  RETURN v_otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RPC: verify OTP + create session ────────────────────────
CREATE OR REPLACE FUNCTION verify_portal_otp(
  p_tenant_id   UUID,
  p_patient_id  UUID,
  p_otp         TEXT,
  p_patient_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tok portal_access_tokens%ROWTYPE;
  v_session_token TEXT;
BEGIN
  SELECT * INTO v_tok
  FROM portal_access_tokens
  WHERE tenant_id  = p_tenant_id
    AND patient_id = p_patient_id
    AND token      = p_otp
    AND token_type = 'otp'
    AND used_at IS NULL
    AND expires_at > NOW()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OTP არასწორია ან ვადა გასულია');
  END IF;

  -- Mark used
  UPDATE portal_access_tokens SET used_at = NOW() WHERE id = v_tok.id;

  -- Create session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO portal_sessions
    (tenant_id, patient_id, patient_name, patient_phone, session_token)
  VALUES
    (p_tenant_id, p_patient_id, p_patient_name, v_tok.patient_phone, v_session_token);

  RETURN jsonb_build_object(
    'ok',           true,
    'session_token', v_session_token,
    'patient_id',   p_patient_id,
    'patient_name', p_patient_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RPC: validate session ────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_portal_session(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_sess portal_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_sess
  FROM portal_sessions
  WHERE session_token = p_token
    AND expires_at > NOW()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session expired');
  END IF;

  UPDATE portal_sessions SET last_seen_at = NOW() WHERE id = v_sess.id;

  RETURN jsonb_build_object(
    'ok',          true,
    'patient_id',  v_sess.patient_id,
    'patient_name',v_sess.patient_name,
    'patient_phone',v_sess.patient_phone,
    'tenant_id',   v_sess.tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pat_tokens   ON portal_access_tokens(patient_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_pat_sessions ON portal_sessions(session_token, expires_at);
CREATE INDEX IF NOT EXISTS idx_appt_req     ON appointment_requests(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pat_docs     ON patient_documents(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_notif ON portal_notifications(patient_id, is_read, created_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE portal_access_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_notifications  ENABLE ROW LEVEL SECURITY;

-- Clinic staff can see everything (tenant-scoped)
CREATE POLICY "staff_appt_requests" ON appointment_requests
  USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "staff_pat_docs" ON patient_documents
  USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));
CREATE POLICY "staff_portal_notif" ON portal_notifications
  USING (tenant_id=(SELECT tenant_id FROM user_profiles WHERE id=auth.uid()));

-- Realtime for clinic staff (new requests)
ALTER PUBLICATION supabase_realtime ADD TABLE appointment_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE portal_notifications;
