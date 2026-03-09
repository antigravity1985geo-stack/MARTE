-- =============================================
-- user_roles გაფართოება: 2 → 9 როლი
-- გაუშვით Supabase Dashboard → SQL Editor
-- =============================================

-- 1. ახალი როლების დამატება app_role enum-ში
-- PostgreSQL-ში enum-ს მხოლოდ ADD VALUE შეიძლება
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'senior_cashier';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'warehouse_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supplier';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

-- 2. შეამოწმეთ რომ enum ახალი მნიშვნელობები შეიცავს
-- SELECT enum_range(NULL::app_role);
-- Expected: {admin,cashier,manager,senior_cashier,warehouse_manager,hr,accountant,supplier,driver}
