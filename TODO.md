# TODO List - საწყობი ERP

## 🔥 Critical (Must do before production)

- [x] **Enable Lovable Cloud / Supabase**
  - [x] Enable in project settings
  - [x] Configure connection
  - [x] Test basic CRUD operations
  
- [x] **Run Database Migrations**
  - [x] `sql/create_tables.sql` - Core tables
  - [x] `sql/create_user_roles.sql` - RBAC system
  - [x] `sql/create_invoices_table.sql` - Invoices
  - [x] `sql/create_activity_logs.sql` - Audit trail
  - [x] `sql/admin_panel_policies.sql` - RLS policies
  
- [~] **Implement Authentication**
  - [x] Replace localStorage auth with Supabase Auth
  - [x] Implement `supabase.auth.signInWithPassword()`
  - [ ] Implement `supabase.auth.signUp()`
  - [x] Implement `supabase.auth.signOut()`
  - [ ] Add forgot password flow
  - [ ] Add email verification
  - [ ] Add OAuth (Google Sign-In)
  
- [~] **User Roles & Permissions**
  - [x] Create user_roles table
  - [x] Implement `has_role()` security definer function
  - [x] Apply RLS policies to all tables
  - [x] Test role-based access control
  - [ ] Add admin UI for role assignment
  
- [x] **Data Migration**
  - [x] Migrate products from localStorage → Supabase
  - [x] Migrate categories from localStorage → Supabase
  - [x] Migrate clients from localStorage → Supabase
  - [x] Migrate suppliers from localStorage → Supabase
  - [x] Migrate transactions from localStorage → Supabase
  - [x] Migrate accounting data from localStorage → Supabase
  
- [~] **Security Hardening**
  - [x] Enable RLS on all tables
  - [x] Remove hardcoded credentials
  - [ ] Add input validation (Zod schemas)
  - [ ] Add CSRF protection
  - [ ] Add rate limiting
  - [x] Security audit

---

## 🟡 High Priority (Important features)

- [ ] **POS Enhancements**
  - [ ] Test hardware barcode scanner integration
  - [ ] Add shift handover report
  - [ ] Add cash drawer tracking
  - [ ] Add discount authorization workflow
  - [ ] Add return/refund flow from POS
  - [ ] Add customer display support
  
- [ ] **Accounting Features**
  - [ ] Add automated journal entries from sales
  - [ ] Add bank reconciliation
  - [ ] Add financial year closing
  - [ ] Add cost center tracking
  - [ ] Add budget vs actual reports
  - [ ] Add cash flow forecasting
  
- [ ] **Inventory Management**
  - [ ] Implement FIFO/LIFO/Average costing
  - [ ] Add stock adjustment workflow
  - [ ] Add cycle counting
  - [ ] Add reorder point automation
  - [ ] Add stock transfer between warehouses
  - [ ] Add barcode batch printing
  
- [x] **RS.GE Integration** (Completed)
  - [x] Deploy edge function with DB-backed credentials (secure)
  - [x] Test fiscal document sending from POS
  - [x] Add retry logic with exponential backoff
  - [x] Add RS.GE response logging to `rsge_audit_logs` (fixed duplicate column)
  - [x] UI for Waybills, Invoices, and Fiscal Shifts
  - [x] Configured Deno IDE support for Edge Functions
  - [x] Fixed multi-tenant proxy (client.ts) for RS.GE tables
  
- [ ] **Reporting**
  - [ ] Daily sales report
  - [ ] Stock valuation report
  - [ ] Profit & loss by category
  - [ ] Top selling products
  - [ ] Customer purchase history
  - [ ] Cashier performance report
  
- [x] **File Storage** ✅ Completed (Phase 2)
  - [x] Configure Supabase Storage buckets (`avatars`, `product-images`, `tenant-assets`, `documents`)
  - [x] Add product image upload (FileUpload component)
  - [x] Add receipt logo upload (ReceiptSettingsPage)
  - [x] Add employee document upload (ProfilePage avatars)
  - [x] Implement RLS policies for tenant isolation on all buckets
  - [x] Reusable `FileUpload` component with drag-and-drop

- [x] **Realtime Sync** ✅ Completed (Phase 2)
  - [x] Enable Supabase Realtime on `products`, `transactions`, `inventory_counts`, `queue_tickets`, `shift_sales`
  - [x] Implement `useRealtimeSync` hook (Postgres change listener)
  - [x] Inject into POSPage (multi-device sync)
  - [x] Inject into WarehouseManagementPage (live stock alerts)
  - [x] Inject into InventoryCountPage (live inventory changes)

---

## 🟢 Medium Priority (Nice to have)

- [x] **MARTEHOME (Real Estate)** ✅ Completed
  - [x] Property management (CRUD)
  - [x] Mortgage calculator & management
  - [x] Real estate specific dashboard & analytics
  - [x] RLS policies and table schema
  - [x] Sidebar & Route integration

- [ ] **Production Module**
  - [~] **Construction Module Research** (In Progress)
  - [ ] Add Bill of Materials (BOM)
  - [ ] Add production cost calculation
  - [ ] Add work order management
  - [ ] Add quality control checkpoints
  - [ ] Add production scheduling
  
- [ ] **CRM Enhancements**
  - [ ] Add customer loyalty points
  - [ ] Add birthday/anniversary tracking
  - [ ] Add email campaign management
  - [ ] Add SMS notifications
  - [ ] Add customer segmentation
  - [ ] Add referral program
  
- [x] **HR Features** ✅ Completed (Phase 2)
  - [ ] Add biometric attendance integration
  - [x] Add leave management (`employee_leaves` table + UI)
  - [x] Add payroll automation (`salary_slips` table + payslip UI)
  - [x] Add performance reviews (`employee_reviews` table + star-rating UI)
  - [ ] Add training records
  
- [ ] **E-Commerce Integration**
  - [ ] Decide on platform (Shopify/Custom/API-only)
  - [ ] Sync products to webshop
  - [ ] Sync stock levels
  - [ ] Import online orders to POS
  - [ ] Add shipping integration
  
- [ ] **Multi-warehouse**
  - [ ] Add warehouse transfer workflow
  - [ ] Add transfer approval
  - [ ] Add stock movement tracking
  - [ ] Add warehouse-wise reports
  
- [ ] **Advanced Analytics**
  - [ ] Add Google Analytics integration
  - [ ] Add custom dashboards
  - [ ] Add predictive stock alerts (AI)
  - [ ] Add sales forecasting
  - [ ] Add ABC analysis
  
- [ ] **Notifications**
  - [ ] Add low stock alerts (email/SMS)
  - [ ] Add shift reminder notifications
  - [ ] Add payment due reminders
  - [ ] Add birthday greetings
  - [ ] Add system maintenance alerts

---

## 🔵 Low Priority (Future enhancements)

- [x] **Multi-language Support** ✅ Completed (4 Languages)
  - [x] Add i18n system (Zustand store + translation dictionary)
  - [x] Support Georgian (GE), English (EN), Russian (RU), Azerbaijani (AZ)
  - [x] Implement language switcher in Settings/Sidebar
  
- [ ] **Mobile App**
  - [ ] Convert to React Native
  - [ ] Keep PWA for web version
  - [ ] Share business logic
  - [ ] Publish to App Store / Play Store
  
- [ ] **API for Third-party**
  - [ ] Create REST API documentation
  - [ ] Add API authentication
  - [ ] Add webhook support
  - [ ] Add rate limiting
  
- [ ] **Advanced Accounting**
  - [ ] Add multi-currency support
  - [ ] Add foreign exchange gain/loss
  - [ ] Add consolidation (multi-company)
  - [ ] Add transfer pricing
  
- [ ] **AI Features**
  - [ ] Add chatbot support (Lovable AI)
  - [ ] Add demand forecasting
  - [ ] Add price optimization
  - [ ] Add fraud detection
  - [ ] Add invoice OCR

---

- [x] **Medical Consent Forms** ✅ Completed (Phase 3)
  - [x] Create `clinic_consent_templates` and `patient_consents` tables
  - [x] Build `SignatureCanvas` component with HTML5 Canvas
  - [x] Create `ConsentFormDialog` with template selection
  - [x] Implement PDF generation for signed forms
  - [x] Add i18n support and integrate into Patient Details
  
- [x] **Patient Queue & Waiting Room** ✅ Completed (Phase 3)
  - [x] Deploy `create_queue_system.sql` (Adjusted for `profiles` table)
  - [x] Move `useQueue.ts` and `queue.ts` to hooks/types
  - [x] Deploy `WaitingRoomDisplay.tsx` (Public TV display)
  - [x] Deploy `QueueManagementPanel.tsx` (Staff dashboard)
  - [x] Register routes in `App.tsx` and sidebar link
  - [x] Add i18n translations (Georgian/English/Russian/Azerbaijani)
  - [x] Verify Georgian TTS and sound notifications
  - [x] Enable public access to Waiting Room via tenant slug

- [x] **Patient Portal (High Security)** ✅ Completed (Phase 3)
  - [x] Implement OTP-based authentication (Session-less)
  - [x] Create EHR access (Records, Prescriptions, Consents)
  - [x] Add Appointment Request panel for clinic dashboard
  - [x] Mobile-optimized dashboard for patients
  
- [x] **Clinical Data Depth** ✅ Completed (Phase 3)
  - [x] Interactive Dental Chart (v2 WOW version)
  - [x] Lab Orders Module (Tracking & Management)
  - [x] Doctor Performance Dashboard (Analytics)
  - [x] Photo Comparison & EMR Timeline
  - [x] Medical Billing & Installments

---

## 🟡 High Priority (Phase 4: Scaling & Polish)

- [ ] **Construction & Industry Refinement**
  - [ ] Finish Project-based cost tracking for Construction
  - [ ] Add BoM (Bill of Materials) for manufacturing industry
  - [ ] Implement asset depreciation for Logistics
  
- [ ] **Operational Automation**
  - [ ] Add automated inventory reorder points (AI-driven)
  - [ ] Add automated shift handover reports
  - [ ] Implement multi-warehouse transfer approval workflow

- [ ] **Messaging & Notifications**
  - [ ] Integrated Email/SMS gateway for appointments
  - [ ] WhatsApp integration for patient reminders
  - [ ] Push notifications for PWA
  
---

## 🟢 Medium Priority (Advanced Features)

- [ ] **AI-Powered Diagnostics (Medical)**
  - [ ] Integrate X-ray analysis (placeholder/demo)
  - [ ] AI-assisted anamnesis synthesis
  
- [ ] **E-Commerce Integration (Phase 2)**
  - [ ] Sync MARTE products to external webshop
  - [ ] Inventory sync with Shopify/WooCommerce

---

**Status Legend:**
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

**Last Updated:** 2026-03-20 (Phase 3 "Clinical Core" complete — Portal, Queue, Consent, Billing, Lab, Dental v2 all live)
