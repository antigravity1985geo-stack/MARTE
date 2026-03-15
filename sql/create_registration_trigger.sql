-- ==========================================
-- Auto-Provision Tenant on User Registration
-- ==========================================

-- 1. Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
  -- Insert into public.tenants
  INSERT INTO public.tenants (id, name, industry, subscription_plan, subscription_status)
  VALUES (
    NEW.id, -- We use the auth.user ID as the tenant ID for the first created workspace
    COALESCE(NEW.raw_user_meta_data->>'businessName', 'My Business'),
    COALESCE(NEW.raw_user_meta_data->>'industry', 'retail'),
    'free',
    'active'
  )
  RETURNING id INTO new_tenant_id;

  -- Insert into public.tenant_members
  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (new_tenant_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- 2. Create the trigger on auth.users
-- Drop if exists first to be safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
