-- =============================================
-- Migration: Final Zustand Stores to Supabase DB
-- Tables: purchase_orders, purchase_order_items, supplier_payments, price_rules, app_notifications, receipt_configs
-- =============================================

-- 1. purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_number text,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  total_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  order_date date,
  expected_date date,
  received_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own purchase_orders" ON purchase_orders
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. purchase_order_items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0
);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage purchase_order_items via order" ON purchase_order_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND po.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND po.user_id = auth.uid()));

-- 3. supplier_payments
CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('payment', 'debt')),
  method text NOT NULL DEFAULT 'cash',
  description text DEFAULT '',
  reference_number text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own supplier_payments" ON supplier_payments
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. price_rules
CREATE TABLE IF NOT EXISTS price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL,
  tier text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own price_rules" ON price_rules
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. app_notifications
CREATE TABLE IF NOT EXISTS app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  link text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own app_notifications" ON app_notifications
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. receipt_configs
CREATE TABLE IF NOT EXISTS receipt_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_name text DEFAULT '',
  store_address text DEFAULT '',
  tax_id text DEFAULT '',
  phone text DEFAULT '',
  website text DEFAULT '',
  header_text text DEFAULT '',
  footer_text text DEFAULT '',
  show_logo boolean DEFAULT false,
  logo_url text DEFAULT '',
  show_barcode boolean DEFAULT true,
  show_tax_info boolean DEFAULT true,
  paper_size text DEFAULT '80mm',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE receipt_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own receipt_configs" ON receipt_configs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
