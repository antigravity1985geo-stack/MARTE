-- ========================================
-- MARTE - სალონის სერვისები და მასალები (BOM)
-- ========================================

-- 1. სალონის სერვისები
CREATE TABLE IF NOT EXISTS public.salon_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'საერთო',
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. სერვისის მასალების ნორმატივები (Bill of Materials - BOM)
-- რომელ სერვისს რა მასალა მიაქვს და რამდენი
CREATE TABLE IF NOT EXISTS public.salon_service_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  service_id UUID REFERENCES public.salon_services(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL, -- კავშირი საერთო საწყობთან
  quantity NUMERIC(10,3) NOT NULL, -- მაგ: 0.05 ლიტრი, ა.შ.
  unit TEXT NOT NULL, -- მაგ: შეკვრა, მლ, გრ
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.salon_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_service_materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'salon_services' AND policyname = 'crud_salon_services'
    ) THEN
        CREATE POLICY "crud_salon_services" ON public.salon_services 
          FOR ALL TO authenticated 
          USING (user_id = auth.uid()) 
          WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'salon_service_materials' AND policyname = 'crud_salon_service_materials'
    ) THEN
        CREATE POLICY "crud_salon_service_materials" ON public.salon_service_materials 
          FOR ALL TO authenticated 
          USING (user_id = auth.uid()) 
          WITH CHECK (user_id = auth.uid());
    END IF;
END
$$;

-- სატესტო სერვისების დამატება
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.salon_services (user_id, name, category, price, duration_minutes)
    VALUES 
      (v_user_id, 'თმის შეჭრა', 'თმა', 40.00, 45),
      (v_user_id, 'თმის შეღებვა (მოკლე)', 'თმა', 80.00, 90),
      (v_user_id, 'სტანდარტული მანიკიური', 'ფრჩხილები', 35.00, 60),
      (v_user_id, 'სახის წმენდა (ულტრაბგერითი)', 'კოსმეტოლოგია', 120.00, 90)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
