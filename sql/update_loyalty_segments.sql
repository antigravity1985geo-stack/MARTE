-- =============================================
-- CRM & Loyalty 2.0: Automated Segmentation
-- Handles VIP, At Risk, and Lost client states
-- =============================================

CREATE OR REPLACE FUNCTION update_customer_segments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer := 0;
BEGIN
  -- 1. Update VIP segment
  -- VIP: Total spent > 5000 and purchased in the last 60 days
  UPDATE clients
  SET segment = 'vip'
  WHERE total_spent > 5000 
    AND (last_purchase >= now() - interval '60 days' OR last_purchase IS NULL);

  -- 2. Update Regular segment
  -- Regular: Not VIP, total spent > 500
  UPDATE clients
  SET segment = 'regular'
  WHERE segment != 'vip' 
    AND total_spent > 500 
    AND (last_purchase >= now() - interval '90 days' OR last_purchase IS NULL);

  -- 3. Update At Risk segment
  -- At Risk: Haven't purchased in 60-180 days
  UPDATE clients
  SET segment = 'at_risk'
  WHERE last_purchase < now() - interval '60 days' 
    AND last_purchase >= now() - interval '180 days';

  -- 4. Update Lost segment
  -- Lost: Haven't purchased in 180+ days
  UPDATE clients
  SET segment = 'lost'
  WHERE last_purchase < now() - interval '180 days';

  -- 5. Update New segment
  -- New: Created in the last 30 days and not yet Regular/VIP
  UPDATE clients
  SET segment = 'new'
  WHERE created_at >= now() - interval '30 days' 
    AND segment NOT IN ('vip', 'regular');

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'timestamp', now()
  );
END;
$$;

-- Trigger to update points history after client update (optional but good for consistency)
CREATE OR REPLACE FUNCTION on_client_loyalty_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.loyalty_tier != NEW.loyalty_tier THEN
    INSERT INTO client_points_history (client_id, points, type, description)
    VALUES (NEW.id, 0, 'adjustment', 'სტატუსი შეიცვალა: ' || OLD.loyalty_tier || ' -> ' || NEW.loyalty_tier);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_client_loyalty_change ON clients;
CREATE TRIGGER tr_client_loyalty_change
  AFTER UPDATE OF loyalty_tier ON clients
  FOR EACH ROW
  EXECUTE FUNCTION on_client_loyalty_change();
