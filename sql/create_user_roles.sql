-- =============================================
-- მომხმარებლის როლები: ადმინი vs მოლარე
-- =============================================

-- 1. Enum
CREATE TYPE public.app_role AS ENUM ('admin', 'cashier');

-- 2. user_roles ცხრილი
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer ფუნქცია (RLS რეკურსიის თავიდან ასაცილებლად)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. ნებისმიერ ავტორიზებულ მომხმარებელს შეუძლია საკუთარი როლის ნახვა
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. მხოლოდ ადმინს შეუძლია როლების მართვა
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. პირველ მომხმარებელს ავტომატურად მიანიჭეთ ადმინის როლი
-- (ხელით: INSERT INTO user_roles (user_id, role) VALUES ('your-user-id', 'admin');)

-- 7. ახალ მომხმარებელს ავტომატურად მიენიჭოს 'cashier' როლი
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cashier')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();
