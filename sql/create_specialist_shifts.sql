-- ========================================
-- MARTE - სალონის სპეციალისტების ცვლები (Shift Scheduling)
-- ========================================

CREATE TABLE IF NOT EXISTS public.specialist_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  specialist_id UUID REFERENCES public.salon_specialists(id) ON DELETE CASCADE NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '21:00:00',
  is_day_off BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(specialist_id, shift_date)
);

ALTER TABLE public.specialist_shifts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'specialist_shifts' AND policyname = 'crud_specialist_shifts'
    ) THEN
        CREATE POLICY "crud_specialist_shifts" ON public.specialist_shifts 
          FOR ALL TO authenticated 
          USING (user_id = auth.uid()) 
          WITH CHECK (user_id = auth.uid());
    END IF;
END
$$;

-- სატესტო მოდელი
INSERT INTO public.specialist_shifts (user_id, specialist_id, shift_date, start_time, end_time, is_day_off)
SELECT user_id, id, CURRENT_DATE, '09:00:00', '15:00:00', false
FROM public.salon_specialists
ON CONFLICT (specialist_id, shift_date) DO NOTHING;

INSERT INTO public.specialist_shifts (user_id, specialist_id, shift_date, start_time, end_time, is_day_off)
SELECT user_id, id, CURRENT_DATE + INTERVAL '1 day', '12:00:00', '21:00:00', false
FROM public.salon_specialists
ON CONFLICT (specialist_id, shift_date) DO NOTHING;
