-- ==========================================
-- MARTE Phase 3: Feature Flags
-- ==========================================

-- Add a JSONB column to store module access flags for each tenant
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- Typical structure will be:
-- {
--   "hasHR": boolean,
--   "hasAccounting": boolean,
--   "hasInventory": boolean,
--   "hasPos": boolean
-- }
-- If a flag is missing, we can assume it's true (to preserve existing behaviour for older tenants), 
-- or false depending on the frontend implementation. For this app, we will assume true if missing.
