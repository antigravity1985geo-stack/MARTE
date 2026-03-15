-- ==========================================
-- MARTE Subscription Tracking Migration
-- ==========================================

-- 1. Add subscription tracking fields to public.tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'Free';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10, 2) DEFAULT 0.00;

-- 2. Backfill existing active tenants to have a 1-year default active period for demo purposes
UPDATE public.tenants 
SET 
  subscription_plan = 'Basic', 
  monthly_fee = 50.00,
  subscription_end_date = now() + interval '1 year' 
WHERE subscription_status = 'active'
AND subscription_end_date IS NULL;
