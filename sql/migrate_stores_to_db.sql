-- =============================================
-- მიგრაცია: ლოკალური store-ების DB-ში გადატანა
-- =============================================

-- 1. avatar_url სვეტის დამატება profiles-ში
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. თანამშრომლების ცხრილი
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  position text NOT NULL DEFAULT 'მოლარე',
  pin_code text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  salary numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own employees" ON employees
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Unique PIN per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_user_pin ON employees(user_id, pin_code);

-- 3. ცვლების ცხრილი
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cashier_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  cashier_name text NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_cash numeric DEFAULT 0,
  closing_cash numeric,
  is_open boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shifts" ON shifts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. ცვლის გაყიდვების ცხრილი
CREATE TABLE IF NOT EXISTS shift_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  total numeric NOT NULL DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'cash',
  cash_amount numeric DEFAULT 0,
  card_amount numeric DEFAULT 0,
  client_name text,
  cashier_name text NOT NULL,
  fiscal_number text,
  waybill_number text,
  is_refunded boolean DEFAULT false,
  refund_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shift_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage shift sales via shift" ON shift_sales
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM shifts WHERE shifts.id = shift_sales.shift_id AND shifts.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM shifts WHERE shifts.id = shift_sales.shift_id AND shifts.user_id = auth.uid())
  );

-- 5. shift_sale_items (პროდუქტები ცვლის გაყიდვაში)
CREATE TABLE IF NOT EXISTS shift_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_sale_id uuid REFERENCES shift_sales(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0
);

ALTER TABLE shift_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage shift sale items via shift" ON shift_sale_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shift_sales ss
      JOIN shifts s ON s.id = ss.shift_id
      WHERE ss.id = shift_sale_items.shift_sale_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shift_sales ss
      JOIN shifts s ON s.id = ss.shift_id
      WHERE ss.id = shift_sale_items.shift_sale_id AND s.user_id = auth.uid()
    )
  );
