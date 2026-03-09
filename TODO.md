# TODO List - საწყობი ERP

## 🔥 Critical (Must do before production)

- [ ] **Enable Lovable Cloud / Supabase**
  - [ ] Enable in project settings
  - [ ] Configure connection
  - [ ] Test basic CRUD operations
  
- [ ] **Run Database Migrations**
  - [ ] `sql/create_tables.sql` - Core tables
  - [ ] `sql/create_user_roles.sql` - RBAC system
  - [ ] `sql/create_invoices_table.sql` - Invoices
  - [ ] `sql/create_activity_logs.sql` - Audit trail
  - [ ] `sql/admin_panel_policies.sql` - RLS policies
  
- [ ] **Implement Authentication**
  - [ ] Replace localStorage auth with Supabase Auth
  - [ ] Implement `supabase.auth.signInWithPassword()`
  - [ ] Implement `supabase.auth.signUp()`
  - [ ] Implement `supabase.auth.signOut()`
  - [ ] Add forgot password flow
  - [ ] Add email verification
  - [ ] Add OAuth (Google Sign-In)
  
- [ ] **User Roles & Permissions**
  - [ ] Create user_roles table
  - [ ] Implement `has_role()` security definer function
  - [ ] Apply RLS policies to all tables
  - [ ] Test role-based access control
  - [ ] Add admin UI for role assignment
  
- [ ] **Data Migration**
  - [ ] Migrate products from localStorage → Supabase
  - [ ] Migrate categories from localStorage → Supabase
  - [ ] Migrate clients from localStorage → Supabase
  - [ ] Migrate suppliers from localStorage → Supabase
  - [ ] Migrate transactions from localStorage → Supabase
  - [ ] Migrate accounting data from localStorage → Supabase
  
- [ ] **Security Hardening**
  - [ ] Enable RLS on all tables
  - [ ] Remove hardcoded credentials
  - [ ] Add input validation (Zod schemas)
  - [ ] Add CSRF protection
  - [ ] Add rate limiting
  - [ ] Security audit

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
  
- [ ] **RS.GE Integration**
  - [ ] Deploy edge function
  - [ ] Test fiscal document sending
  - [ ] Add retry logic for failed submissions
  - [ ] Add RS.GE response logging
  - [ ] Add certificate management UI
  
- [ ] **Reporting**
  - [ ] Daily sales report
  - [ ] Stock valuation report
  - [ ] Profit & loss by category
  - [ ] Top selling products
  - [ ] Customer purchase history
  - [ ] Cashier performance report
  
- [ ] **File Storage**
  - [ ] Configure Supabase Storage buckets
  - [ ] Add product image upload
  - [ ] Add receipt logo upload
  - [ ] Add expense receipt upload
  - [ ] Add employee document upload

---

## 🟢 Medium Priority (Nice to have)

- [ ] **Production Module**
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
  
- [ ] **HR Features**
  - [ ] Add biometric attendance integration
  - [ ] Add leave management
  - [ ] Add payroll automation
  - [ ] Add performance reviews
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

- [ ] **Multi-language Support**
  - [ ] Add i18n library (react-i18next)
  - [ ] Translate to English
  - [ ] Add language switcher
  
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

**Last Updated:** 2026-03-08
