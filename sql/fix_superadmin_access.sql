-- =========================================================================
-- Phase 5: Fix Superadmin RLS Policies for Tenants & Global Access
-- =========================================================================

-- 1. Create a secure function to check if the current user is a superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 2. Grant Superadmins full access to `tenants`
DROP POLICY IF EXISTS "Superadmin full access to tenants" ON public.tenants;
CREATE POLICY "Superadmin full access to tenants"
  ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- 3. Grant Superadmins full access to `tenant_members`
DROP POLICY IF EXISTS "Superadmin full access to tenant_members" ON public.tenant_members;
CREATE POLICY "Superadmin full access to tenant_members"
  ON public.tenant_members
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- 4. Grant Superadmins full access to `profiles`
DROP POLICY IF EXISTS "Superadmin full access to profiles" ON public.profiles;
CREATE POLICY "Superadmin full access to profiles"
  ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- 5. Grant Superadmins full access to `global_announcements`
ALTER TABLE IF EXISTS public.global_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmin full access to global_announcements" ON public.global_announcements;
CREATE POLICY "Superadmin full access to global_announcements"
  ON public.global_announcements
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- 6. Grant Superadmins full access to `audit_logs`
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmin full access to audit_logs" ON public.audit_logs;
CREATE POLICY "Superadmin full access to audit_logs"
  ON public.audit_logs
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
