-- =============================================
-- Phase 2.2: Advanced Financial Engine
-- Module 3: Landed Cost Tracking
-- =============================================

-- Header for a landed cost allocation session
CREATE TABLE IF NOT EXISTS landed_cost_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  total_additional_cost numeric(15,2) NOT NULL DEFAULT 0,
  allocation_method text DEFAULT 'value' CHECK (allocation_method IN ('value', 'quantity', 'weight', 'volume')),
  description text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Break down of additional costs (e.g., Shipping: $500, Custom: $200)
CREATE TABLE IF NOT EXISTS landed_cost_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  header_id uuid REFERENCES landed_cost_headers(id) ON DELETE CASCADE,
  cost_type text NOT NULL, -- e.g. 'Shipping', 'Customs', 'Insurance'
  amount numeric(15,2) NOT NULL,
  vendor_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number text
);

-- Resulting allocation to product items
CREATE TABLE IF NOT EXISTS landed_cost_allocations (
  header_id uuid REFERENCES landed_cost_headers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  transaction_item_id uuid REFERENCES transaction_items(id) ON DELETE CASCADE,
  allocated_amount numeric(15,2) NOT NULL,
  new_unit_cost numeric(15,2) NOT NULL,
  PRIMARY KEY (header_id, product_id, transaction_item_id)
);

ALTER TABLE landed_cost_headers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage landed costs" ON landed_cost_headers FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE landed_cost_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage landed cost items" ON landed_cost_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to apply landed cost to product inventory
-- This should update the cost price in stock_batches or products table
CREATE OR REPLACE FUNCTION apply_landed_cost(p_header_id uuid) RETURNS void AS $$
DECLARE
  v_rec record;
BEGIN
  -- 1. Finalize allocations (simplified: assume it's already calculated in landed_cost_allocations table)
  
  -- 2. Update stock batches cost price if FIFO is active, or product cost_price
  FOR v_rec IN SELECT * FROM landed_cost_allocations WHERE header_id = p_header_id LOOP
    -- Update product average cost (simplified)
    UPDATE products 
    SET cost_price = v_rec.new_unit_cost
    WHERE id = v_rec.product_id;
    
    -- In a real FIFO system, we would update the specific batch associated with this receiving_order
    UPDATE stock_batches
    SET cost_price = v_rec.new_unit_cost
    WHERE product_id = v_rec.product_id 
      AND created_at >= (SELECT created_at FROM landed_cost_headers WHERE id = p_header_id) - interval '1 hour';
  END LOOP;
  
  -- 3. Mark as applied
  UPDATE landed_cost_headers SET status = 'applied' WHERE id = p_header_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
