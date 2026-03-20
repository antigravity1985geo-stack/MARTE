# MARTE ERP - AI Handover Document (Senior Architect Resume)

> **To Future AI Developer/Architect:** 
> Read this document completely before modifying the MARTE ERP codebase. This contains the current architectural state, recent critical fixes, and the exact roadmap.

---

## 🏗️ 1. Architecture & Tech Stack
**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui.
**State Management:** Zustand (Global State/Auth), React Query (Data Fetching/Caching).
**Backend & DB:** Supabase (Auth, Database, Edge Functions, Storage).
**Routing:** React Router v6.
**i18n:** Custom translation dictionary (`src/lib/i18n`) supporting Georgian (ka), English (en), Russian (ru), Azerbaijani (az).

### 🔐 Security & Tenant Isolation (CRITICAL)
- **Multi-Tenancy:** The system is strictly multi-tenant.
- **Client-Side Enforcer:** `src/integrations/supabase/client.ts` overloads the Supabase client `.from()` to automatically inject `.eq('tenant_id', currentTenant)` on all queries, EXCEPT for tables in `EXCLUDED_TABLES`.
- **Database RLS Enforcer:** 100% of tenant-specific tables MUST use `tenant_id = get_tenant_id()` in their RLS policies.
- **NEVER use `USING(true)`** or `WITH CHECK(true)` for standard data tables. This was heavily audited and fixed (March 2026) because PostgreSQL `OR`s same-command policies, leading to cross-tenant data leaks. 

---

## 🚀 2. What Has Been Accomplished (Up to Phase 3.5)

The project currently has >50 pages, >130 components, and >50 database tables. It is ~97% complete for its core modules.

**Core Completed Modules:**
1. **POS & Sales:** Barcode scanning, discounts (with PIN auth overrides), shifts, shift closing summaries, dual-display mode (for customers).
2. **Clinic Core:** Appointment booking, Interactive Dental Chart (v2), Lab Orders, Medical Billing (with split payments/installments).
3. **Clinical Notes (SOAP):** Split-panel rich text editor, Georgian localized templates, auto-save, Web Speech API (ka-GE) voice typing, ICD-10 registry integration, vitals tracking, and digital signing logic.
4. **Patient Experience:** Mobile-optimized Patient Portal with OTP login (EHR, prescriptions, requests), digital consent forms, and a Waiting Room Queue System with Georgian Text-to-Speech (TTS).
5. **Salon/Beauty:** Multi-service bookings, employee performance/commission tracking.
6. **Enterprise:** HR data, real estate module (MarteHome), robust multi-language support (4 languages).

---

## 🛠️ 3. Recent Critical Fixes (Deep Audit - March 2026)
If you are modifying existing code, know that the following was recently audited and fixed:
- **Tenant Data Leakage:** Removed dangerous `Allow public manage` and `Allow public view` policies from `employees`, `inventory_counts`, `journal_entries`, `settings`, etc. 
- **Broken Hook Imports:** The `QueuePage.tsx` and `PortalMedicalRecords.tsx` files were completely rewritten to use actual exported hooks (e.g., `useQueueCounters`, `usePortalClinical`), removing dangerous `@ts-nocheck` masking.
- **SOAP Notes Integrity:** Ensure `icd10_codes` uses optional chaining (`draft?.icd10_codes?.length ?? 0`) to prevent UI crashes.

---

## 🎯 4. Outstanding Issues (What to do next)

1. **Construction Module (Next Major Milestone):**
   - We need to build a massive project management system for construction: Bill of Quantities (BOQ), milestones, subcontractor management, heavy machinery tracking, and specialized financial accounting. Global best practices and Georgian accounting standards apply here.
   - *Status:* Research phase started, implementation pending.

2. **Data Validation Hardening:**
   - Currently lacking robust validation. You MUST introduce `Zod` schemas for heavy forms (specifically in CRM, HR, and Billing).

3. **Offline Sync (PWA):**
   - The app has basic offline caching but lacks IndexedDB offline-mutation sync mechanisms. This is critical for the POS and mobile inventory modules.

4. **Multi-Warehouse & Transfers:**
   - Inventory counts exist, but internal stock transfers between warehouses with authorization flows need refinement. 

---

## 🤖 5. Rules for the Next AI
1. **Always verify Database alignment:** Before writing a frontend hook, read the `.sql` migration files to ensure column names exact-match. (e.g., `full_name` in frontend vs `name` in DB).
2. **Do NOT break the Client Interceptor:** Do not add tables to `EXCLUDED_TABLES` in `client.ts` unless they are system-wide globals (like `profiles` or `subscription_plans`).
3. **TypeScript First:** Do not use `@ts-nocheck`. Fix the underlying type/interface.
4. **Georgian Language Priority:** All alerts, `toast` messages, and primary UI texts must be in Georgian by default, integrated into the i18n JSON keys.
5. **Architectural Consistency:** Do not introduce Redux; use Zustand. Do not fetch data inside `useEffect` if `react-query` can handle it natively.
