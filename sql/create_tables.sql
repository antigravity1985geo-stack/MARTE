-- ========================================
-- MARTE - Supabase ტაბლების შექმნა
-- გაუშვით Supabase Dashboard → SQL Editor
-- ========================================

-- 1. კატეგორიები
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ქვეკატეგორიები
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. კლიენტები
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  tin TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  total_purchases NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. მომწოდებლები
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  tin TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  total_orders NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ტრანზაქციები
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  type TEXT NOT NULL CHECK (type IN ('receive', 'sale')),
  product_id TEXT,
  product_name TEXT,
  quantity NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  client_id TEXT,
  client_name TEXT,
  supplier_id TEXT,
  supplier_name TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'completed',
  cashier_id TEXT,
  coupon_discount NUMERIC DEFAULT 0,
  loyalty_discount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ტრანზაქციის პროდუქტები
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ხარჯები
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT DEFAULT '',
  date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- RLS პოლიტიკები
-- ========================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crud_categories" ON public.categories FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "crud_subcategories" ON public.subcategories FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "crud_clients" ON public.clients FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "crud_suppliers" ON public.suppliers FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "crud_transactions" ON public.transactions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "crud_transaction_items" ON public.transaction_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()));
CREATE POLICY "crud_expenses" ON public.expenses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Products ტაბლის განახლება
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'purchase_price') THEN
    ALTER TABLE public.products ADD COLUMN purchase_price NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'subcategory_id') THEN
    ALTER TABLE public.products ADD COLUMN subcategory_id TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'min_stock') THEN
    ALTER TABLE public.products ADD COLUMN min_stock NUMERIC DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'warehouse_id') THEN
    ALTER TABLE public.products ADD COLUMN warehouse_id TEXT DEFAULT '';
  END IF;
END $$;
