-- ========================================
-- მარაგების ავტომატური ჩამოწერა (BOM Depletion) ჯავშნის დასრულებისას
-- ========================================

CREATE OR REPLACE FUNCTION public.deduct_salon_materials()
RETURNS TRIGGER AS $$
DECLARE
  v_material RECORD;
  v_service_id UUID;
BEGIN
  -- ვამოწმებთ თუ სტატუსი შეიცვალა 'completed'-ზე
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- მოვძებნოთ სერვისის ID
    SELECT id INTO v_service_id FROM public.salon_services WHERE name = NEW.service_name AND user_id = NEW.user_id LIMIT 1;
    
    IF v_service_id IS NOT NULL THEN
      -- გავიაროთ ყველა მასალა
      FOR v_material IN 
        SELECT product_id, quantity 
        FROM public.salon_service_materials 
        WHERE service_id = v_service_id
      LOOP
        UPDATE public.products 
        SET stock = stock - CEIL(v_material.quantity)
        WHERE id = v_material.product_id;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_deduct_salon_materials ON public.salon_appointments;

CREATE TRIGGER trigger_deduct_salon_materials
AFTER UPDATE ON public.salon_appointments
FOR EACH ROW
EXECUTE FUNCTION public.deduct_salon_materials();
