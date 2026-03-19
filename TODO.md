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

## 🐛 Bug Fixes

- [ ] Fix localStorage overflow issue (5MB limit)
- [ ] Fix mobile cart drawer scroll issue
- [ ] Fix date picker timezone issues
- [ ] Fix PDF export Georgian font rendering
- [ ] Fix Excel export UTF-8 encoding

---

## 🧪 Testing

- [ ] Write unit tests for accounting calculations
- [ ] Write integration tests for Supabase operations
- [ ] Write E2E tests for critical flows (POS, accounting)
- [ ] Add visual regression testing
- [ ] Add performance testing
- [ ] Add load testing

---

## 📚 Documentation

- [ ] Write user manual (Georgian)
- [ ] Write admin guide
- [ ] Write API documentation
- [ ] Create video tutorials
- [ ] Add inline help tooltips
- [ ] Create FAQ section

---

## 🚀 DevOps

- [ ] Set up CI/CD pipeline
- [ ] Add automated testing in CI
- [ ] Add code quality checks (ESLint, Prettier)
- [ ] Add dependency vulnerability scanning
- [ ] Set up staging environment
- [ ] Add database backup automation
- [ ] Add monitoring and alerts

---

## 📊 Performance

- [ ] Add code splitting for all pages
- [ ] Add virtual scrolling for large lists
- [ ] Optimize bundle size
- [ ] Add image optimization
- [ ] Add lazy loading for images
- [ ] Add caching strategy
- [ ] Add service worker updates

---

## 🔒 Compliance

- [ ] GDPR compliance (if EU customers)
- [ ] Add data export feature
- [ ] Add data deletion feature
- [ ] Add privacy policy
- [ ] Add terms of service
- [ ] Add cookie consent

---

**Status Legend:**
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

**Last Updated:** 2026-03-19 (Phase 4 scope expanding — i18n + MarteHome + Construction Research)
