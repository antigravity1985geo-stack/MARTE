-- =============================================
-- Audit Trail: ცვლილებების ავტომატური ჟურნალი
-- გაუშვით Supabase Dashboard → SQL Editor
-- =============================================

-- 1. audit_log ცხრილი
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ადმინებს აქვთ წვდომა audit log-ზე
CREATE POLICY "Admins can view audit_log" ON audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert (trigger inserts on their behalf)
CREATE POLICY "System can insert audit_log" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. ინდექსები
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(table_name, record_id);

-- 3. Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _changed text[];
  _key text;
BEGIN
  -- Compute changed fields for UPDATE
  IF TG_OP = 'UPDATE' THEN
    FOR _key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      IF to_jsonb(NEW) -> _key IS DISTINCT FROM to_jsonb(OLD) -> _key THEN
        _changed := array_append(_changed, _key);
      END IF;
    END LOOP;
  END IF;

  INSERT INTO audit_log (user_id, table_name, record_id, action, old_data, new_data, changed_fields)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN (OLD.id)::text
      ELSE (NEW.id)::text
    END,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    _changed
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Apply audit triggers to sensitive tables
-- Products
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Transactions
DROP TRIGGER IF EXISTS audit_transactions ON transactions;
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Accounts (Chart of Accounts)
DROP TRIGGER IF EXISTS audit_accounts ON accounts;
CREATE TRIGGER audit_accounts
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Journal Entries
DROP TRIGGER IF EXISTS audit_journal_entries ON journal_entries;
CREATE TRIGGER audit_journal_entries
  AFTER INSERT OR UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- User Roles
DROP TRIGGER IF EXISTS audit_user_roles ON user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Employees
DROP TRIGGER IF EXISTS audit_employees ON employees;
CREATE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
