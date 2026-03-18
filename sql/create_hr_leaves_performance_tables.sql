-- =============================================
-- Phase 3: HR & Payroll - Leaves and Performance 
-- გაუშვით Supabase Dashboard → SQL Editor
-- =============================================

-- 1. შვებულებები / გაცდენები (Leaves)
CREATE TABLE IF NOT EXISTS employee_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  leave_type text CHECK (leave_type IN ('vacation', 'sick_leave', 'unpaid', 'other')) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own employee leaves" ON employee_leaves
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. შეფასებები / Performance Reviews
CREATE TABLE IF NOT EXISTS employee_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  performance_score integer CHECK (performance_score BETWEEN 1 AND 5),
  comments text,
  reviewer_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own employee reviews" ON employee_reviews
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. Audit Triggers
DROP TRIGGER IF EXISTS audit_employee_leaves ON employee_leaves;
CREATE TRIGGER audit_employee_leaves
  AFTER INSERT OR UPDATE OR DELETE ON employee_leaves
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_employee_reviews ON employee_reviews;
CREATE TRIGGER audit_employee_reviews
  AFTER INSERT OR UPDATE OR DELETE ON employee_reviews
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ინდექსები ოპტიმიზაციისთვის
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON employee_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_employee ON employee_reviews(employee_id);
