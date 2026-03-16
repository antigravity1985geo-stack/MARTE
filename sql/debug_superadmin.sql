-- =========================================================================
-- SUPERADMIN ACCESS & SECURITY SETUP
-- ეს სკრიპტი დაგეხმარებათ წვდომის აღდგენაში და მის შეზღუდვაში მხოლოდ თქვენს იმეილზე
-- =========================================================================

-- 1. შევამოწმოთ თქვენი იუზერის სტატუსი
SELECT id, email, is_superadmin 
FROM public.profiles 
WHERE id = auth.uid();

-- 2. გავხადოთ თქვენი იუზერი სუპერადმინი (თუ ჯერ არ არის)
-- (აქ ჩაწერეთ თქვენი იმეილი რათა მხოლოდ თქვენ გქონდეთ წვდომა)
UPDATE public.profiles 
SET is_superadmin = true 
WHERE email = 'j19mt85@gmail.com'; -- შეცვალეთ თქვენი რეალური იმეილით

-- 3. განვაახლოთ is_superadmin() ფუნქცია, რომ იყოს უფრო დაცული
-- ეს ფუნქცია ახლა უფრო მკაცრად ამოწმებს სტატუსს
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_superadmin = true
  );
$$;

-- 4. შევამოწმოთ რამდენი ბიზნესი ჩანს ახლა (ფუნქციის განახლების შემდეგ)
SELECT count(*) as "Visible Tenants for Superadmin" 
FROM public.tenants 
WHERE public.is_superadmin();

-- 5. უსაფრთხოებისთვის: დავრწმუნდეთ რომ RLS პოლიტიკები სწორად არის
-- (ეს ნაწილი გადაამოწმებს რომ სხვა იუზერები ვერ ხედავენ მონაცემებს)
SELECT policyname, tablename, cmd, qual
FROM pg_policies
WHERE tablename IN ('tenants', 'audit_logs');
