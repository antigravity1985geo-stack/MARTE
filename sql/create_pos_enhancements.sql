-- =============================================
-- Phase 2.1: POS Enhancements
-- პროდუქტების კრებული (Bundles) და დინამიური ფასები (Price Rules)
-- გაუშვით Supabase Dashboard → SQL Editor
-- =============================================

-- 1. პროდუქტების კრებული (Product Bundles / Combos)
CREATE TABLE IF NOT EXISTS product_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  discount_type text CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10,2) DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own product_bundles" ON product_bundles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS bundle_items (
  bundle_id uuid REFERENCES product_bundles(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity integer DEFAULT 1,
  PRIMARY KEY (bundle_id, product_id)
);

ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage bundle_items via bundle" ON bundle_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM product_bundles pb WHERE pb.id = bundle_items.bundle_id AND pb.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM product_bundles pb WHERE pb.id = bundle_items.bundle_id AND pb.user_id = auth.uid()));

-- 2. დინამიური ფასწარმოქმნის წესები (Dynamic Pricing Rules)
CREATE TABLE IF NOT EXISTS price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('bulk', 'loyalty_tier', 'time_based', 'category', 'bundle')),
  condition jsonb NOT NULL, -- e.g. {"min_qty": 5} or {"tier": "gold"} or {"after": "18:00"}
  discount_type text CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10,2) DEFAULT 0,
  priority integer DEFAULT 0, -- higher priority applied first
  active boolean DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own price_rules" ON price_rules
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ინდექსები
CREATE INDEX IF NOT EXISTS idx_bundle_items_product ON bundle_items(product_id);
CREATE INDEX IF NOT EXISTS idx_price_rules_user_active ON price_rules(user_id, active);
