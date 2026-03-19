-- ============================================================
-- CASH DRAWER TRACKING SYSTEM
-- საწყობი ERP — POS Module
-- ============================================================

-- 1. Cash Drawers (physical drawers / registers)
CREATE TABLE IF NOT EXISTS cash_drawers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                     -- e.g. "სალარო №1"
  location        TEXT,                              -- e.g. "მთავარი მაღაზია"
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Cash Drawer Sessions (one per shift open/close cycle)
CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  drawer_id             UUID NOT NULL REFERENCES cash_drawers(id) ON DELETE CASCADE,
  opened_by             UUID NOT NULL REFERENCES auth.users(id),
  closed_by             UUID REFERENCES auth.users(id),

  -- Opening
  opening_float         NUMERIC(12,2) NOT NULL DEFAULT 0,   -- declared opening cash
  opened_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_notes         TEXT,

  -- Closing
  closing_declared      NUMERIC(12,2),    -- cashier counted amount
  closed_at             TIMESTAMPTZ,
  closing_notes         TEXT,

  -- Computed on close (snapshot)
  expected_cash         NUMERIC(12,2),    -- opening + cash_sales - cash_refunds + cash_in - cash_out
  variance              NUMERIC(12,2),    -- closing_declared - expected_cash
  
  status                TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','closed','suspended')),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Cash Drawer Transactions (every movement inside a session)
CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES cash_drawer_sessions(id) ON DELETE CASCADE,
  drawer_id       UUID NOT NULL REFERENCES cash_drawers(id) ON DELETE CASCADE,

  type            TEXT NOT NULL CHECK (type IN (
                    'sale',          -- cash received from POS sale
                    'refund',        -- cash given back for refund
                    'cash_in',       -- manual cash added (e.g. petty cash top-up)
                    'cash_out',      -- manual cash removed (e.g. expense, safe drop)
                    'opening_float', -- initial float at session open
                    'closing_count'  -- final count at session close
                  )),

  amount          NUMERIC(12,2) NOT NULL,  -- always positive; direction determined by type
  reference_id    UUID,                    -- links to transactions table if type='sale'/'refund'
  performed_by    UUID NOT NULL REFERENCES auth.users(id),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cds_tenant_drawer   ON cash_drawer_sessions(tenant_id, drawer_id);
CREATE INDEX IF NOT EXISTS idx_cds_status          ON cash_drawer_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cdt_session         ON cash_drawer_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_cdt_tenant_created  ON cash_drawer_transactions(tenant_id, created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE cash_drawers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_transactions ENABLE ROW LEVEL SECURITY;

-- Drawers: tenant isolation
CREATE POLICY "tenant_cash_drawers" ON cash_drawers
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- Sessions: tenant isolation
CREATE POLICY "tenant_drawer_sessions" ON cash_drawer_sessions
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- Transactions: tenant isolation
CREATE POLICY "tenant_drawer_transactions" ON cash_drawer_transactions
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================
-- HELPER FUNCTION: compute expected cash for a session
-- ============================================================
CREATE OR REPLACE FUNCTION get_session_expected_cash(p_session_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC := 0;
BEGIN
  SELECT
    SUM(CASE
      WHEN type IN ('opening_float', 'sale', 'cash_in') THEN  amount
      WHEN type IN ('refund', 'cash_out')               THEN -amount
      ELSE 0
    END)
  INTO v_total
  FROM cash_drawer_transactions
  WHERE session_id = p_session_id
    AND type != 'closing_count';

  RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: close a session (atomic — computes & saves snapshot)
-- ============================================================
CREATE OR REPLACE FUNCTION close_cash_drawer_session(
  p_session_id      UUID,
  p_declared_amount NUMERIC,
  p_closing_notes   TEXT DEFAULT NULL
)
RETURNS cash_drawer_sessions AS $$
DECLARE
  v_expected  NUMERIC;
  v_session   cash_drawer_sessions;
BEGIN
  v_expected := get_session_expected_cash(p_session_id);

  UPDATE cash_drawer_sessions SET
    closed_by        = auth.uid(),
    closed_at        = now(),
    closing_declared = p_declared_amount,
    closing_notes    = p_closing_notes,
    expected_cash    = v_expected,
    variance         = p_declared_amount - v_expected,
    status           = 'closed',
    updated_at       = now()
  WHERE id = p_session_id
    AND status = 'open'
  RETURNING * INTO v_session;

  -- Record the closing count as a transaction
  INSERT INTO cash_drawer_transactions
    (tenant_id, session_id, drawer_id, type, amount, performed_by, note)
  VALUES
    (v_session.tenant_id, p_session_id, v_session.drawer_id,
     'closing_count', p_declared_amount, auth.uid(), p_closing_notes);

  RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE cash_drawer_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_drawer_transactions;

-- ============================================================
-- SEED: default drawer (adjust tenant_id as needed)
-- ============================================================
-- INSERT INTO cash_drawers (tenant_id, name, location)
-- VALUES ('<your-tenant-id>', 'სალარო №1', 'მთავარი მაღაზია');
