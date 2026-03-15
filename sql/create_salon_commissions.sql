-- ========================================
-- MARTE - სალონის ბონუსები და გამომუშავება
-- ========================================

-- 1. დავუმატოთ salon_specialists-ს საკომისიოს პარამეტრები
ALTER TABLE public.salon_specialists 
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_fixed NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed', 'none'));

-- 2. შევქმნათ გამომუშავების (Commissions) ცხრილი
CREATE TABLE IF NOT EXISTS public.salon_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  specialist_id UUID REFERENCES public.salon_specialists(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.salon_appointments(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.salon_commissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.calculate_salon_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_service_price NUMERIC(10,2);
  v_spec_rate NUMERIC(5,2);
  v_spec_fixed NUMERIC(10,2);
  v_spec_type TEXT;
  v_calculated_amount NUMERIC(10,2) := 0.00;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT price INTO v_service_price FROM public.salon_services WHERE name = NEW.service_name AND user_id = NEW.user_id LIMIT 1;
    
    SELECT commission_type, commission_rate, commission_fixed 
    INTO v_spec_type, v_spec_rate, v_spec_fixed 
    FROM public.salon_specialists 
    WHERE id = NEW.specialist_id;

    IF v_service_price IS NOT NULL AND v_spec_type != 'none' THEN
      IF v_spec_type = 'percentage' THEN
        v_calculated_amount := (v_service_price * v_spec_rate) / 100.0;
      ELSIF v_spec_type = 'fixed' THEN
        v_calculated_amount := v_spec_fixed;
      END IF;

      IF v_calculated_amount > 0 THEN
        INSERT INTO public.salon_commissions (user_id, specialist_id, appointment_id, amount)
        VALUES (NEW.user_id, NEW.specialist_id, NEW.id, v_calculated_amount);
      END IF;
    END IF;
  END IF;
  
  IF (NEW.status = 'cancelled' OR NEW.status = 'no_show') AND OLD.status = 'completed' THEN
    DELETE FROM public.salon_commissions WHERE appointment_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_calc_salon_commission ON public.salon_appointments;

CREATE TRIGGER trigger_calc_salon_commission
AFTER UPDATE ON public.salon_appointments
FOR EACH ROW
EXECUTE FUNCTION public.calculate_salon_commission();

UPDATE public.salon_specialists SET commission_type = 'percentage', commission_rate = 30.00;
