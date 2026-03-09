-- =============================================
-- Phase 2.2: Warehouse Enhancements
-- მარაგების FIFO აღრიცხვა და ინვენტარიზაცია
-- გაუშვით Supabase Dashboard → SQL Editor
-- =============================================

-- 1. მარაგების პარტიები (Stock Batches / FIFO / LIFO)
CREATE TABLE IF NOT EXISTS stock_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  batch_number text,
  quantity numeric(10,2) NOT NULL DEFAULT 0,
  initial_quantity numeric(10,2) NOT NULL DEFAULT 0,
  cost_price numeric(10,2) NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  manufacture_date date,
  expiry_date date,
  location text, -- e.g. 'A1-B2'
  status text DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'expired', 'quarantine')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
-- Using existing admin/warehouse_manager roles from Phase 1
CREATE POLICY "Users can manage stock batches" ON stock_batches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. ინვენტარიზაციის სესიები (Inventory Counts)
CREATE TABLE IF NOT EXISTS inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name text NOT NULL, -- e.g. "Q3 2026 Annual Count"
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own inventory counts" ON inventory_counts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. ინვენტარიზაციის ნივთები (Inventory Count Items)
CREATE TABLE IF NOT EXISTS inventory_count_items (
  count_id uuid REFERENCES inventory_counts(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  expected_qty numeric(10,2) NOT NULL, -- System quantity at the time of count
  counted_qty numeric(10,2) DEFAULT 0, -- Actual counted quantity
  variance numeric(10,2) GENERATED ALWAYS AS (counted_qty - expected_qty) STORED,
  reason text, -- e.g. "Damaged", "Stolen"
  scanned_at timestamptz DEFAULT now(),
  PRIMARY KEY (count_id, product_id)
);

ALTER TABLE inventory_count_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage items via inventory_counts" ON inventory_count_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM inventory_counts ic WHERE ic.id = inventory_count_items.count_id AND ic.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM inventory_counts ic WHERE ic.id = inventory_count_items.count_id AND ic.user_id = auth.uid()));

-- ინდექსები
CREATE INDEX IF NOT EXISTS idx_stock_batches_product ON stock_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_status ON stock_batches(status);
CREATE INDEX IF NOT EXISTS idx_count_items_product ON inventory_count_items(product_id);
