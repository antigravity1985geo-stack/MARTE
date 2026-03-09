-- =============================================
-- Phase 3.1: HR & Payroll - მონაცემთა ბაზის გაფართოება
-- გაუშვით Supabase Dashboard → SQL Editor
-- =============================================

-- 1. თანამშრომლების ცხრილის გაფართოება (თუ რაიმე სვეტი აკლია)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date date DEFAULT CURRENT_DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_date date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS iban text; -- საბანკო ანგარიში ხელფასისთვის

-- 2. პოზიციების Enum (სურვილისამებრ, ან ტექსტური სვეტის ვალიდაცია)
-- ამ ეტაპზე დავტოვოთ ტექსტური 'position' სვეტი.

-- 3. დასწრების აღრიცხვა (Attendance)
CREATE TABLE IF NOT EXISTS employee_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  clock_in timestamptz,
  clock_out timestamptz,
  status text CHECK (status IN ('present', 'absent', 'late', 'on_leave')) DEFAULT 'present',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own attendance" ON employee_attendance
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. სახელფასო უწყისები (Salary Slips)
CREATE TABLE IF NOT EXISTS salary_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  base_salary numeric DEFAULT 0,
  bonus numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  net_salary numeric GENERATED ALWAYS AS (base_salary + bonus - deductions) STORED,
  status text CHECK (status IN ('draft', 'paid', 'cancelled')) DEFAULT 'draft',
  paid_at timestamptz,
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own salary slips" ON salary_slips
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. Audit Triggers
DROP TRIGGER IF EXISTS audit_employee_attendance ON employee_attendance;
CREATE TRIGGER audit_employee_attendance
  AFTER INSERT OR UPDATE OR DELETE ON employee_attendance
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_salary_slips ON salary_slips;
CREATE TRIGGER audit_salary_slips
  AFTER INSERT OR UPDATE OR DELETE ON salary_slips
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ინდექსები ოპტიმიზაციისთვის
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON employee_attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_salary_slips_employee_month ON salary_slips(employee_id, year, month);
