-- ========================================
-- MARTE - სალონის მოდულის ტაბლები (Phase 2)
-- ========================================

-- 1. სპეციალისტები (სტილისტები, კოსმეტოლოგები და ა.შ.)
CREATE TABLE IF NOT EXISTS public.salon_specialists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  color TEXT DEFAULT '#3b82f6', -- სპეციალისტის ფერი კალენდარში
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ჯავშნები (Appointments)
CREATE TABLE IF NOT EXISTS public.salon_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  client_name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL, -- რეალური კლიენტის მიბმა (არასავალდებულო)
  service_name TEXT NOT NULL,
  specialist_id UUID REFERENCES public.salon_specialists(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL, -- ჯავშნის დაწყების დრო და თარიღი
  duration_minutes INTEGER NOT NULL DEFAULT 60, -- ხანგრძლივობა წუთებში
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- RLS პოლიტიკები
-- ========================================
ALTER TABLE public.salon_specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_appointments ENABLE ROW LEVEL SECURITY;

-- Specialists RLS
CREATE POLICY "crud_salon_specialists" ON public.salon_specialists 
  FOR ALL TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Appointments RLS
CREATE POLICY "crud_salon_appointments" ON public.salon_appointments 
  FOR ALL TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());
