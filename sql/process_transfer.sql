-- =============================================
-- Phase 6: process_transfer RPC
-- Handles atomic stock movement between warehouses
-- =============================================

CREATE OR REPLACE FUNCTION process_transfer(
  p_product_id uuid,
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_quantity numeric,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer_id uuid;
  v_from_product record;
  v_to_product record;
BEGIN
  -- 1. Validate source product
  SELECT * INTO v_from_product FROM products 
  WHERE id = p_product_id AND warehouse_id = p_from_warehouse_id::text FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'პროდუქტი ამ საწყობში ვერ მოიძებნა');
  END IF;

  IF v_from_product.stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'საწყობში არ არის საკმარისი მარაგი');
  END IF;

  -- 2. Validate/Find destination product
  -- Note: We look for a product with the same barcode in the destination warehouse
  SELECT * INTO v_to_product FROM products 
  WHERE barcode = v_from_product.barcode AND warehouse_id = p_to_warehouse_id::text FOR UPDATE;

  -- 3. Atomic Updates
  -- Decrease from source
  UPDATE products SET stock = stock - p_quantity WHERE id = v_from_product.id;

  -- Increase or Create in destination
  IF FOUND THEN
    UPDATE products SET stock = stock + p_quantity WHERE id = v_to_product.id;
  ELSE
    -- Create new entry for this product in the destination warehouse
    INSERT INTO products (
      user_id, name, barcode, buy_price, sell_price, category_id, subcategory_id, 
      unit, stock, min_stock, warehouse_id
    ) VALUES (
      p_user_id, v_from_product.name, v_from_product.barcode, v_from_product.buy_price, 
      v_from_product.sell_price, v_from_product.category_id, v_from_product.subcategory_id,
      v_from_product.unit, p_quantity, v_from_product.min_stock, p_to_warehouse_id::text
    );
  END IF;

  -- 4. Record Transfer
  INSERT INTO transfers (
    user_id, product_id, product_name, quantity, from_warehouse_id, to_warehouse_id, date
  ) VALUES (
    p_user_id, p_product_id, v_from_product.name, p_quantity, p_from_warehouse_id, p_to_warehouse_id, now()
  ) RETURNING id INTO v_transfer_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
