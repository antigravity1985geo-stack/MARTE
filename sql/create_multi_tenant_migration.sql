-- ==========================================
-- MARTE Multi-Tenant (Phase 4) Migration
-- ==========================================

-- 1. Create the fundamental Tenant tables
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'ჩემი ბიზნესი',
  industry TEXT DEFAULT 'retail',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_members (
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Tenant RLS Policies
DROP POLICY IF EXISTS "tenant_members_select" ON public.tenant_members;
CREATE POLICY "tenant_members_select" ON public.tenant_members 
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants 
  FOR SELECT TO authenticated USING (id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- 2. DYNAMIC BACKFILL AND COLUMN ADDITION
DO $$
DECLARE
  uid UUID;
  t_name TEXT;
  p_name TEXT;
BEGIN
  -- A. Create a default tenant for all existing users in auth.users
  -- We use their user_id as the tenant_id to make migrating existing data absolutely seamless
  FOR uid IN SELECT id FROM auth.users LOOP
    INSERT INTO public.tenants (id, name, industry) 
    VALUES (uid, 'ჩემი ბიზნესი (Migrated)', 'retail') 
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.tenant_members (tenant_id, user_id, role) 
    VALUES (uid, uid, 'owner') 
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END LOOP;

  -- B. Loop through all existing public tables that have a `user_id` column
  FOR t_name IN 
    SELECT c.table_name 
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE c.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'user_id'
      AND c.table_name NOT IN ('tenants', 'tenant_members')
  LOOP
    
    -- B1: Add tenant_id column
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;', t_name);
    
    -- B2: Backfill data (set tenant_id = user_id for existing rows, since we made tenant.id = user.id)
    EXECUTE format('UPDATE public.%I SET tenant_id = user_id WHERE tenant_id IS NULL AND user_id IS NOT NULL;', t_name);
    
    -- C. Update RLS Policies
    -- Drop old policies to enforce strict multi-tenant isolation
    FOR p_name IN 
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = t_name 
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', p_name, t_name);
    END LOOP;
    
    -- Create the new Multi-Tenant Super-Core CRUD policy
    EXECUTE format('
      CREATE POLICY "crud_multi_tenant" ON public.%I
      FOR ALL TO authenticated
      USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
    ', t_name);
    
  END LOOP;
END $$;
