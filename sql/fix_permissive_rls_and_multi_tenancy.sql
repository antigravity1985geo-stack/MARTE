-- =========================================================================
-- Phase 6: Fix Permissive RLS Policies & Add Missing tenant_id Columns
-- =========================================================================

-- 1. Helper function for Superadmin access (ensure it exists)
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

-- 2. Stock Batches (საწყობის პარტიები)
ALTER TABLE public.stock_batches ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.stock_batches sb SET tenant_id = p.tenant_id FROM public.products p WHERE sb.product_id = p.id AND sb.tenant_id IS NULL;

DROP POLICY IF EXISTS "Users can manage stock batches" ON public.stock_batches;
DROP POLICY IF EXISTS "tenant_multi_tenant_stock_batches" ON public.stock_batches;
CREATE POLICY "tenant_multi_tenant_stock_batches" ON public.stock_batches
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin())
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin());

-- 3. Landed Cost Tables (თვითღირებულების დანამატები)
ALTER TABLE public.landed_cost_headers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.landed_cost_headers SET tenant_id = (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() LIMIT 1) WHERE tenant_id IS NULL;

DROP POLICY IF EXISTS "Users can manage landed costs" ON public.landed_cost_headers;
DROP POLICY IF EXISTS "tenant_multi_tenant_landed_costs" ON public.landed_cost_headers;
CREATE POLICY "tenant_multi_tenant_landed_costs" ON public.landed_cost_headers
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin())
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin());

ALTER TABLE public.landed_cost_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.landed_cost_items lci SET tenant_id = (SELECT tenant_id FROM public.landed_cost_headers lch WHERE lch.id = lci.header_id) WHERE tenant_id IS NULL;

DROP POLICY IF EXISTS "Users can manage landed cost items" ON public.landed_cost_items;
DROP POLICY IF EXISTS "tenant_multi_tenant_landed_cost_items" ON public.landed_cost_items;
CREATE POLICY "tenant_multi_tenant_landed_cost_items" ON public.landed_cost_items
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin())
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin());

-- 4. CRM Loyalty (ლოიალობის პროგრამა)
ALTER TABLE public.client_points_history ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.client_points_history cph SET tenant_id = (SELECT tenant_id FROM public.clients c WHERE c.id = cph.client_id) WHERE tenant_id IS NULL;

DROP POLICY IF EXISTS "Users can manage client points" ON public.client_points_history;
DROP POLICY IF EXISTS "tenant_multi_tenant_client_points" ON public.client_points_history;
CREATE POLICY "tenant_multi_tenant_client_points" ON public.client_points_history
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin())
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin());

-- 5. Accounting Rules & Accounts (ბუღალტრული გატარებები და ანგარიშები)
ALTER TABLE public.accounting_rules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.accounting_rules SET tenant_id = (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() LIMIT 1) WHERE tenant_id IS NULL;

DROP POLICY IF EXISTS "Users manage own accounting rules" ON public.accounting_rules;
DROP POLICY IF EXISTS "tenant_multi_tenant_accounting_rules" ON public.accounting_rules;
CREATE POLICY "tenant_multi_tenant_accounting_rules" ON public.accounting_rules
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin())
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin());

-- accounts table use user_id, let's add tenant_id for consistency
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.accounts SET tenant_id = (SELECT tenant_id FROM public.tenant_members WHERE user_id = accounts.user_id LIMIT 1) WHERE tenant_id IS NULL;

DROP POLICY IF EXISTS "Users manage own accounts" ON public.accounts;
DROP POLICY IF EXISTS "tenant_multi_tenant_accounts" ON public.accounts;
CREATE POLICY "tenant_multi_tenant_accounts" ON public.accounts
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin())
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin());

-- 6. Bank Statements (ბანკის ამონაწერები)
ALTER TABLE public.bank_statement_uploads ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.bank_statement_uploads SET tenant_id = (SELECT tenant_id FROM public.tenant_members WHERE user_id = bank_statement_uploads.user_id LIMIT 1) WHERE tenant_id IS NULL;

DROP POLICY IF EXISTS "Users can manage own statement uploads" ON public.bank_statement_uploads;
DROP POLICY IF EXISTS "tenant_multi_tenant_bank_uploads" ON public.bank_statement_uploads;
CREATE POLICY "tenant_multi_tenant_bank_uploads" ON public.bank_statement_uploads
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin())
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin());

ALTER TABLE public.bank_statement_lines ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.bank_statement_lines bsl SET tenant_id = (SELECT tenant_id FROM public.bank_statement_uploads bsu WHERE bsu.id = bsl.upload_id) WHERE tenant_id IS NULL;

DROP POLICY IF EXISTS "Users access lines via uploads" ON public.bank_statement_lines;
DROP POLICY IF EXISTS "tenant_multi_tenant_bank_lines" ON public.bank_statement_lines;
CREATE POLICY "tenant_multi_tenant_bank_lines" ON public.bank_statement_lines
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin())
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()) OR public.is_superadmin());

-- 7. Optimize RLS performance by adding missing indexes on tenant_id
CREATE INDEX IF NOT EXISTS idx_stock_batches_tenant ON public.stock_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_land_cost_header_tenant ON public.landed_cost_headers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_land_cost_item_tenant ON public.landed_cost_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_points_tenant ON public.client_points_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acc_rules_tenant ON public.accounting_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON public.accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_uploads_tenant ON public.bank_statement_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_lines_tenant ON public.bank_statement_lines(tenant_id);
