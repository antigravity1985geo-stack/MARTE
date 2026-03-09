-- ========================================
-- ინვოისების ტაბლა
-- გაუშვით Supabase Dashboard → SQL Editor
-- ========================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  invoice_number TEXT NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  client_id UUID,
  client_name TEXT DEFAULT '',
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'cancelled')),
  payment_method TEXT DEFAULT 'cash',
  notes TEXT DEFAULT '',
  issued_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crud_invoices" ON public.invoices 
  FOR ALL TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- ინვოისის ნომრის უნიკალობა მომხმარებლის ფარგლებში
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number_user ON public.invoices (user_id, invoice_number);
