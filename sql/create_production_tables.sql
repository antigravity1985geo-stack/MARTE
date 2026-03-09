-- =============================================
-- Phase 2.3: Manufacturing (BOM) & Production
-- რეცეპტები, ინგრედიენტები და წარმოების შეკვეთები
-- გაუშვით Supabase Dashboard → SQL Editor
-- =============================================

-- 1. ინგრედიენტები / ნედლეული
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  unit text DEFAULT 'კგ', -- კგ, ლიტრი, ცალი და ა.შ.
  cost_per_unit numeric(12,2) DEFAULT 0,
  current_stock numeric(12,2) DEFAULT 0,
  min_stock numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own ingredients" ON ingredients;
CREATE POLICY "Users manage own ingredients" ON ingredients
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. რეცეპტები (Bill of Materials - BOM)
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  output_quantity numeric(10,2) DEFAULT 1, -- რამდენი მზა პროდუქტი გამოდის ამ რეცეპტით
  output_unit text DEFAULT 'ცალი',
  estimated_cost numeric(12,2) DEFAULT 0,
  sale_price numeric(12,2) DEFAULT 0,
  instructions text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own recipes" ON recipes;
CREATE POLICY "Users manage own recipes" ON recipes
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. რეცეპტის ინგრედიენტები (BOM Lines)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity numeric(10,4) NOT NULL, -- რაოდენობა 1 ერთეული გამოსავლისთვის
  unit text,
  PRIMARY KEY (recipe_id, ingredient_id)
);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage recipe_ingredients via recipe" ON recipe_ingredients;
CREATE POLICY "Users manage recipe_ingredients via recipe" ON recipe_ingredients
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid()));

-- 4. წარმოების შეკვეთები (Production Orders)
CREATE TABLE IF NOT EXISTS production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_name text, -- Snapshot if recipe is deleted
  quantity numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  total_cost numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own production orders" ON production_orders;
CREATE POLICY "Users manage own production orders" ON production_orders
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ინდექსები
CREATE INDEX IF NOT EXISTS idx_ingredients_user ON ingredients(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_prod_orders_status ON production_orders(status);
