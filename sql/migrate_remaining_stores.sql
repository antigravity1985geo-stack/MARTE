-- =============================================
-- მიგრაცია: warehouse, auto_order, production, queue stores
-- =============================================

-- 1. საწყობები
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text DEFAULT '',
  location text DEFAULT '',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own warehouses" ON warehouses
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. ჩამოწერები
CREATE TABLE IF NOT EXISTS write_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  reason text NOT NULL DEFAULT 'damage',
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE write_offs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own write_offs" ON write_offs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. გადაცემები
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  from_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  to_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  note text DEFAULT '',
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transfers" ON transfers
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. ვალუტები
CREATE TABLE IF NOT EXISTS currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  rate numeric NOT NULL DEFAULT 1,
  symbol text DEFAULT '',
  UNIQUE(user_id, code)
);
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own currencies" ON currencies
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. ავტო-შეკვეთების წესები
CREATE TABLE IF NOT EXISTS auto_order_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  order_quantity integer NOT NULL DEFAULT 1,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE auto_order_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own auto_order_rules" ON auto_order_rules
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. ავტო-შეკვეთების ისტორია
CREATE TABLE IF NOT EXISTS auto_order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rule_id uuid REFERENCES auto_order_rules(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name text NOT NULL,
  quantity integer NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  order_id text,
  date timestamptz DEFAULT now()
);
ALTER TABLE auto_order_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own auto_order_history" ON auto_order_history
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. ინგრედიენტები
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'კგ',
  cost_per_unit numeric DEFAULT 0,
  current_stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ingredients" ON ingredients
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 8. რეცეპტები
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  output_quantity integer DEFAULT 1,
  output_unit text DEFAULT 'ცალი',
  estimated_cost numeric DEFAULT 0,
  sale_price numeric DEFAULT 0,
  modifiers jsonb DEFAULT '[]',
  extras jsonb DEFAULT '[]',
  instructions text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recipes" ON recipes
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 9. რეცეპტის ინგრედიენტები
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT ''
);
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage recipe_ingredients via recipe" ON recipe_ingredients
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid()));

-- 10. წარმოების შეკვეთები
CREATE TABLE IF NOT EXISTS production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  type text DEFAULT 'manual',
  total_cost numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own production_orders" ON production_orders
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 11. რიგის ბილეთები
CREATE TABLE IF NOT EXISTS queue_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  number integer NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  counter text DEFAULT '',
  notes text DEFAULT '',
  called_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE queue_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own queue_tickets" ON queue_tickets
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
