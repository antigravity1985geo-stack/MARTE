-- ============================================================
-- DISCOUNT AUTHORIZATION SYSTEM — საწყობი ERP / POS
-- ============================================================

-- ─── 1. discount_policies — per-role limits ──────────────────
CREATE TABLE IF NOT EXISTS discount_policies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_name             TEXT NOT NULL,          -- 'cashier' | 'supervisor' | 'manager' | 'admin'

  -- Self-authorize limits (no PIN required below these)
  self_max_pct          NUMERIC(5,2) NOT NULL DEFAULT 0,   -- % max without override
  self_max_fixed        NUMERIC(12,2) NOT NULL DEFAULT 0,  -- GEL fixed max without override

  -- Hard ceiling (even with manager PIN, cannot exceed)
  hard_max_pct          NUMERIC(5,2) NOT NULL DEFAULT 100,
  hard_max_fixed        NUMERIC(12,2) NOT NULL DEFAULT 9999,

  -- Which roles can authorize overrides for this role
  requires_override_from TEXT[] NOT NULL DEFAULT '{"manager","admin"}',

  allow_percentage      BOOLEAN NOT NULL DEFAULT TRUE,
  allow_fixed           BOOLEAN NOT NULL DEFAULT TRUE,

  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, role_name)
);

-- ─── 2. manager_pins — hashed override PINs ──────────────────
CREATE TABLE IF NOT EXISTS manager_pins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash    TEXT NOT NULL,            -- bcrypt hash of the PIN
  role_name   TEXT NOT NULL,            -- role this pin grants override for
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, user_id)
);

-- ─── 3. discount_audit_logs — every discount applied ─────────
CREATE TABLE IF NOT EXISTS discount_audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Context
  transaction_id    UUID REFERENCES cash_drawer_transactions(id), -- Null if session isn't saved yet
  cart_session_id   TEXT,

  -- What was discounted
  scope             TEXT NOT NULL CHECK (scope IN ('cart','item')),
  product_id        UUID REFERENCES products(id),
  product_name      TEXT,

  -- Discount details
  discount_type     TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value    NUMERIC(10,2) NOT NULL,
  discount_amount   NUMERIC(12,2) NOT NULL,
  original_amount   NUMERIC(12,2) NOT NULL,

  -- Authorization
  requested_by      UUID NOT NULL REFERENCES auth.users(id),
  requested_role    TEXT NOT NULL,
  override_required BOOLEAN NOT NULL DEFAULT FALSE,
  override_by       UUID REFERENCES auth.users(id),
  override_role     TEXT,
  override_at       TIMESTAMPTZ,

  -- Outcome
  status            TEXT NOT NULL DEFAULT 'approved'
                    CHECK (status IN ('approved','rejected','cancelled')),
  rejection_reason  TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. Function: verify_manager_pin ─────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION verify_manager_pin(
  p_tenant_id UUID,
  p_pin       TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_row   manager_pins%ROWTYPE;
  v_name  TEXT;
BEGIN
  -- Find an active pin for this tenant where bcrypt matches
  SELECT mp.* INTO v_row
  FROM manager_pins mp
  WHERE mp.tenant_id = p_tenant_id
    AND mp.is_active  = TRUE
    AND crypt(p_pin, mp.pin_hash) = mp.pin_hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(full_name, id::text) INTO v_name
  FROM profiles WHERE id = v_row.user_id;

  RETURN jsonb_build_object(
    'user_id',   v_row.user_id,
    'role',      v_row.role_name,
    'name',      v_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. Function: set_manager_pin ────────────────────────────
CREATE OR REPLACE FUNCTION set_manager_pin(
  p_pin       TEXT,
  p_role      TEXT DEFAULT 'manager'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tenant_id UUID;
  v_hashed    TEXT;
BEGIN
  -- Find correct tenant based on current user membership
  SELECT tenant_id INTO v_tenant_id
  FROM tenant_members 
  WHERE user_id = auth.uid() 
  LIMIT 1;

  IF p_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  v_hashed := crypt(p_pin, gen_salt('bf', 10));

  INSERT INTO manager_pins (tenant_id, user_id, pin_hash, role_name)
  VALUES (v_tenant_id, auth.uid(), v_hashed, p_role)
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET pin_hash   = EXCLUDED.pin_hash,
        role_name  = EXCLUDED.role_name,
        updated_at = now(),
        is_active  = TRUE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. Function: log_discount ───────────────────────────────
CREATE OR REPLACE FUNCTION log_discount(
  p_tenant_id        UUID,
  p_scope            TEXT,
  p_discount_type    TEXT,
  p_discount_value   NUMERIC,
  p_discount_amount  NUMERIC,
  p_original_amount  NUMERIC,
  p_override_required BOOLEAN,
  p_override_by      UUID DEFAULT NULL,
  p_override_role    TEXT DEFAULT NULL,
  p_product_id       UUID DEFAULT NULL,
  p_product_name     TEXT DEFAULT NULL,
  p_transaction_id   UUID DEFAULT NULL,
  p_cart_session_id  TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO discount_audit_logs (
    tenant_id, transaction_id, cart_session_id,
    scope, product_id, product_name,
    discount_type, discount_value, discount_amount, original_amount,
    requested_by, requested_role,
    override_required, override_by, override_role,
    override_at, status
  )
  SELECT
    p_tenant_id, p_transaction_id, p_cart_session_id,
    p_scope, p_product_id, p_product_name,
    p_discount_type, p_discount_value, p_discount_amount, p_original_amount,
    auth.uid(),
    COALESCE((SELECT role FROM tenant_members WHERE user_id = auth.uid() LIMIT 1), 'cashier'),
    p_override_required, p_override_by, p_override_role,
    CASE WHEN p_override_by IS NOT NULL THEN now() END,
    'approved'
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE discount_policies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_pins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_audit_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_discount_policies" ON discount_policies
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "tenant_manager_pins" ON manager_pins
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "tenant_discount_logs" ON discount_audit_logs
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
