-- ==========================================
-- MARTE Phase 3.3: Usage Limits
-- ==========================================

-- Adding 'limits' JSONB column to define max quantities (e.g. max_users, max_storage_kb)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}'::jsonb;

-- Adding 'usage' JSONB column to track current consumption (e.g. current_users, current_storage_kb)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS usage JSONB DEFAULT '{}'::jsonb;
