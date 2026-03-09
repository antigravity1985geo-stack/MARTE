# საწყობი ERP — სრული განვითარების პრომპტი
## Master Development Prompt — ყველა ფუნქცია, ყველა მოდული

---

## 🎯 პროექტის კონტექსტი

შენ ხარ **საწყობი ERP**-ის სენიორ დეველოპერი და არქიტექტორი.

პროექტი: `React 18 + TypeScript + Vite PWA + Supabase + Tailwind CSS + Framer Motion + Zustand + Recharts + shadcn/ui`

მიმდინარე სტატუსი: ~70% frontend დასრულებული, Supabase ჯერ არ არის ჩართული, LocalStorage გამოიყენება დროებით.

**მიზანი:** გახდეს ყველაზე სრულყოფილი, ყველაზე ტექნოლოგიურად მოწინავე ERP სისტემა ქართულ ბაზარზე, რომელიც სჯობს Apex, Fina, Optomo და Oris-ს.

---

## 🚨 ᲞᲠᲘᲝᲠᲘᲢᲔᲢᲘ #1 — CRITICAL (პირველი დასრულება)

### 1.1 Supabase ჩართვა + მიგრაცია

```
ᲐᲛᲝᲪᲐᲜᲐ: LocalStorage → Supabase სრული მიგრაცია

1. Enable Supabase in project settings
2. Run SQL migrations from sql/ folder
3. Enable Row Level Security (RLS) on ALL tables
4. Create user_roles table with has_role() security definer function
5. Migrate all stores: products, categories, clients, suppliers, 
   transactions, journal_entries, employees, attendance
6. Replace all localStorage.getItem/setItem with supabase.from() calls
7. Add React Query for server state management
8. Keep Zustand only for UI/ephemeral state
```

**ცხრილები სავალდებულო:**
```sql
-- ძირითადი
products, categories, transactions, transaction_items
clients, suppliers, employees
journal_entries, journal_lines, accounts

-- HR
attendance, salaries, shifts

-- საწყობი  
warehouses, warehouse_transfers, receiving_orders, inventory_counts

-- CRM
loyalty_points, campaigns, campaign_recipients

-- სისტემა
user_roles, activity_logs, branches, notifications

-- ახალი (დამატება)
loyalty_tiers, product_bundles, bundle_items
price_rules, budget_lines, budget_actuals
delivery_orders, delivery_items, delivery_drivers
hotel_rooms, hotel_reservations, hotel_guests
manufacturing_orders, bom_items, bom_headers
payment_integrations, fiscal_documents
```

### 1.2 Authentication სრული მიგრაცია

```typescript
// გამოიყენე Supabase Auth
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signUp({ email, password })
supabase.auth.signOut()
supabase.auth.onAuthStateChange(callback)

// 2FA - TOTP სავალდებულო admin & senior_cashier-ისთვის
supabase.auth.mfa.enroll({ factorType: 'totp' })

// User Roles
create type app_role as enum ('admin', 'manager', 'senior_cashier', 
  'warehouse_manager', 'cashier', 'hr', 'accountant', 'supplier', 'driver');
```

### 1.3 RLS Policies — ყველა ცხრილზე

```sql
-- ყველა sensitive ცხრილზე:
alter table [table] enable row level security;

-- Branch Isolation Pattern
create policy "branch_isolation" on transactions for select
  using (branch_id in (
    select branch_id from user_branches where user_id = auth.uid()
  ));
```

### 1.4 RS.GE ფისკალური — Production Deploy

```
- Deploy Edge Function: supabase/functions/rsge-proxy/
- Real RS.GE API credentials configuration
- Retry logic: 3x attempts, exponential backoff
- Offline Queue: ოფლაინ გაყიდვები → online დაბრუნებისას ავტო-გაგზავნა
- Fiscal document log ცხრილი: rsge_fiscal_documents
- Error handling + admin notification on failure
- Monthly report generation in RS.GE format
```

---



---
> ⚠️ **ეს არის საწყობი ERP-ის მასტერ კონტექსტი.**
> ამ ფაილს ყოველ ფაზის დასაწყისში უნდა ჩასვა, შემდეგ იმ ფაზის ფაილი.
> მაგ: [PHASE_0] + [PHASE_1] → გაგზავნე → დაასრულე → შემდეგ [PHASE_0] + [PHASE_2]

---
# 🚀 ᲤᲐᲖᲐ 7 — Security + PWA + Launch (კვ. 13-14)
## ახლა განახორციელე მხოლოდ ეს მოდულები:
## 📦 მოდული 20: Security & Compliance

**2FA სრული:**
```typescript
// Required for: admin, manager, accountant
// TOTP (Google Authenticator / Authy)
// Setup flow: QR code → verify code → backup codes (download)
// Enforcement: login → if role requires 2FA and not enrolled → /setup-2fa
// Recovery: backup codes → re-enroll
```

**IP Allowlist:**
```sql
create table ip_allowlist (
  branch_id uuid,
  ip_cidr inet, -- e.g. 192.168.1.0/24
  description text,
  active boolean
);
-- Edge Function middleware: check IP before sensitive operations
```

**Session Management:**
```typescript
// Auto-logout: 30min idle (configurable per role)
// Max sessions: 3 concurrent (configurable)
// Active sessions list: admin can revoke
// Suspicious login: new country/device → email alert
```

**Data Export & GDPR:**
```typescript
// Client data export (their own data — GDPR right)
// Data retention policies per table
// Anonymization for deleted clients
// Audit log retention: 7 years (financial requirement)
```

---

## 🎨 UI/UX გაუმჯობესება

```typescript
// Command Palette: Ctrl+K → fuzzy search all features
// Keyboard shortcuts: comprehensive, user-configurable
// Onboarding wizard: new user → guided tour
// Empty states: meaningful illustrations + CTAs
// Loading states: skeleton screens everywhere
// Error boundaries: per-module, with retry
// Contextual help: ? icon → tooltip with docs link
// Accessibility: ARIA labels, keyboard nav, high contrast mode
// Print styles: every report optimized for print
// Mobile gestures: swipe to delete, pull to refresh
// Dark/Light mode: system preference + manual toggle
// Font size: accessibility controls (+/- in settings)
```

---

## ⚙️ ტექნიკური გაუმჯობესება

**Performance:**
```typescript
// Code splitting: lazy load all pages
// Virtual scrolling: react-virtual for long lists (products, clients)
// Memoization: useMemo for expensive calculations
// React Query: cache + background refetch
// Database indexes on: product barcode, client phone, transaction date
// PostgreSQL materialized views for reports
// Edge caching: Supabase CDN for static assets
```

**Testing:**
```typescript
// Vitest unit tests:
//   - accounting calculations (double-entry balance)
//   - price rules engine
//   - loyalty points calculation
//   - tax calculations
// Playwright E2E:
//   - complete sale flow
//   - invoice generation
//   - employee check-in
// Coverage target: 80% for critical modules
```

**Monitoring:**
```typescript
// Sentry: error tracking + performance
// Supabase Dashboard: query performance, slow queries
// Custom analytics: user actions → analytics_events table
// Uptime monitoring: external ping check
// Alert channels: Viber/Email on error spike
```

**DevOps:**
```typescript
// CI/CD: GitHub Actions
//   - lint + typecheck + test on PR
//   - auto-deploy to staging on merge to main
//   - manual deploy to production
// Environment: dev | staging | production
// Secrets: Supabase + Sentry DSN + payment keys in env vars
// Database migrations: versioned, reversible
```

---

## 📐 RBAC — განახლებული როლები

```sql
## 📦 მოდული 18: PWA & Mobile გაფართოება

**Push Notifications:**
```typescript
// Service Worker Push API
// Supabase Edge Function: send-push
// Vapid keys configuration
// User consent flow
// Notification categories: sales, stock, hr, system
```

**Offline Improvements:**
```typescript
// IndexedDB (idb library) — replaces localStorage for offline data
// Background Sync API — queue failed requests
// Workbox strategies:
//   - Products: CacheFirst (1 hour)
//   - Transactions: NetworkFirst
//   - Reports: StaleWhileRevalidate
// Offline indicator: banner + last-sync timestamp
// Conflict resolution: server wins (last-write-wins with timestamp)
```

**Native Features:**
```typescript
// Camera API: receipt scanning, product photo, delivery proof
// Geolocation API: driver tracking, branch auto-detection
// Vibration API: scan success/error feedback
// Screen Wake Lock: prevent sleep during POS usage
// File System Access API: export to local folder
// Web Share API: share reports via Viber/WhatsApp
// Badging API: unread notifications count on app icon
```

**React Native (Phase 2):**
```typescript
// Shared business logic via monorepo
// React Native for dedicated driver app
// Biometric auth (fingerprint/face)
// NFC reading (employee cards)
// Bluetooth scale/printer integration
```

---

## 📦 მოდული 19: აღჭურვილობის მართვა

```sql
create table equipment (
  id uuid primary key,
  name text,
  type text, -- 'pos_terminal' | 'scale' | 'refrigerator' | 'scanner' | 'printer'
  serial_number text,
  purchase_date date,
  warranty_until date,
  branch_id uuid,
  status text, -- 'active' | 'maintenance' | 'broken' | 'retired'
  last_service_date date,
  next_service_date date,
  notes text
);
create table equipment_service_log (
  equipment_id uuid references equipment(id),
  service_date date,
  description text,
  cost numeric(10,2),
  technician text,
  next_service_date date
);
-- Alert: warranty expiry, service due
```

---

## 📦 მოდული 20: Security & Compliance

**2FA სრული:**
## 💎 მოდული 41: Enterprise Security & Reliability

### 41.1 Soft Delete + Full Record Versioning

```sql
-- PRINCIPLE: nothing is ever permanently deleted
-- Every DELETE → soft delete (deleted_at timestamp)
-- Every UPDATE → version captured in record_versions

alter table products add column deleted_at timestamptz;
alter table products add column deleted_by uuid references auth.users(id);
-- (applied to ALL tables)

-- RLS auto-hides deleted records:
create policy "hide_deleted" on products for select
  using (deleted_at is null);

-- Generic version capture table:
create table record_versions (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  version_number integer not null,
  data jsonb not null,          -- full snapshot
  changed_fields jsonb,         -- {"price": {"from": 5, "to": 6}}
  changed_by uuid references auth.users(id),
  changed_at timestamptz default now(),
  change_reason text
);

-- Trigger applied to: products, clients, accounts,
--   journal_entries, user_roles, price_rules, employees, suppliers
```

```typescript
// Version History UI (/[record]/history):
// Timeline: v1 → v2 → v3 (current)
// Diff: green (added) | red (removed) | yellow (changed)
// Restore: revert to any version (creates new version — never overwrites)

// Recycle Bin (/admin/recycle-bin):
// All soft-deleted records with filter by table/user/date
// One-click restore | permanent delete (admin only + audit log)
```

### 41.2 Advanced Offline + Conflict Resolution

```typescript
// IndexedDB (Dexie.js) — replaces localStorage entirely for offline data

// Conflict strategies per entity:
const STRATEGIES = {
  transactions:   'client_wins',   // გაყიდვა ყოველთვის ჩაითვლება
  stock_levels:   'server_wins',   // სერვერის მარაგი სანდოა
  product_prices: 'server_wins',   // ფასი სერვერიდან
  client_data:    'last_write_wins',
  journal_entries:'manual_merge',  // ბუღ. ჩანაწერი → ადამიანი ამოწმებს
};

// Background Sync API: auto-flush queue when online
// Offline indicator: "ოფლაინ • 3 გაყიდვა დასინქ. • ბოლო sync: 14:32"
// On reconnect: "სინქრონიზაცია... ✓ 3 გაყიდვა ჩაიწერა"
// Conflict badge: "⚠️ 1 კონფლიქტი შემოწმებას საჭიროებს"
```

### 41.3 IP-Based Access Control

```sql
create table ip_access_rules (
  id uuid primary key,
  branch_id uuid references branches(id),
  rule_name text,
  ip_cidr inet,             -- '192.168.1.0/24' or '85.114.50.10/32'
  rule_type text,           -- 'allow' | 'deny'
  applies_to_roles text[],  -- empty = all roles
  restricted_paths text[],  -- ['/admin', '/accounting', '/reports']
  active boolean default true
);

-- Supabase Edge Middleware: check IP on every request to sensitive paths
-- Log blocked attempts → notify admin
-- Admin UI: /admin/security/ip-rules
--   - Add/remove rules
--   - "ჩემი IP ნებადართულია?" → test button
--   - Live blocked-attempts log with Geo-IP
```

---

## 💎 მოდული 42: Deep RS.GE Smart Integration

```typescript
## 🎨 UI/UX გაუმჯობესება

```typescript
// Command Palette: Ctrl+K → fuzzy search all features
// Keyboard shortcuts: comprehensive, user-configurable
// Onboarding wizard: new user → guided tour
// Empty states: meaningful illustrations + CTAs
// Loading states: skeleton screens everywhere
// Error boundaries: per-module, with retry
// Contextual help: ? icon → tooltip with docs link
// Accessibility: ARIA labels, keyboard nav, high contrast mode
// Print styles: every report optimized for print
// Mobile gestures: swipe to delete, pull to refresh
// Dark/Light mode: system preference + manual toggle
// Font size: accessibility controls (+/- in settings)
```

---

## ⚙️ ტექნიკური გაუმჯობესება

**Performance:**
```typescript
// Code splitting: lazy load all pages
// Virtual scrolling: react-virtual for long lists (products, clients)
// Memoization: useMemo for expensive calculations
// React Query: cache + background refetch
// Database indexes on: product barcode, client phone, transaction date
// PostgreSQL materialized views for reports
// Edge caching: Supabase CDN for static assets
```

**Testing:**
```typescript
// Vitest unit tests:
//   - accounting calculations (double-entry balance)
//   - price rules engine
//   - loyalty points calculation
//   - tax calculations
// Playwright E2E:
//   - complete sale flow
//   - invoice generation
//   - employee check-in
// Coverage target: 80% for critical modules
```

**Monitoring:**
```typescript
// Sentry: error tracking + performance
// Supabase Dashboard: query performance, slow queries
// Custom analytics: user actions → analytics_events table
// Uptime monitoring: external ping check
// Alert channels: Viber/Email on error spike
```

**DevOps:**
```typescript
// CI/CD: GitHub Actions
//   - lint + typecheck + test on PR
//   - auto-deploy to staging on merge to main
//   - manual deploy to production
// Environment: dev | staging | production
// Secrets: Supabase + Sentry DSN + payment keys in env vars
// Database migrations: versioned, reversible
```

---

## 📐 RBAC — განახლებული როლები

```sql
## ⚙️ ტექნიკური გაუმჯობესება

**Performance:**
```typescript
// Code splitting: lazy load all pages
// Virtual scrolling: react-virtual for long lists (products, clients)
// Memoization: useMemo for expensive calculations
// React Query: cache + background refetch
// Database indexes on: product barcode, client phone, transaction date
// PostgreSQL materialized views for reports
// Edge caching: Supabase CDN for static assets
```

**Testing:**
```typescript
// Vitest unit tests:
//   - accounting calculations (double-entry balance)
//   - price rules engine
//   - loyalty points calculation
//   - tax calculations
// Playwright E2E:
//   - complete sale flow
//   - invoice generation
//   - employee check-in
// Coverage target: 80% for critical modules
```

**Monitoring:**
```typescript
// Sentry: error tracking + performance
// Supabase Dashboard: query performance, slow queries
// Custom analytics: user actions → analytics_events table
// Uptime monitoring: external ping check
// Alert channels: Viber/Email on error spike
```

**DevOps:**
```typescript
// CI/CD: GitHub Actions
//   - lint + typecheck + test on PR
//   - auto-deploy to staging on merge to main
//   - manual deploy to production
// Environment: dev | staging | production
// Secrets: Supabase + Sentry DSN + payment keys in env vars
// Database migrations: versioned, reversible
```

---

## 📐 RBAC — განახლებული როლები

```sql
## ⚡ Performance & Scale

```sql
-- Critical indexes for Georgian retail scale:
create index idx_transactions_date on transactions(transaction_date desc);
create index idx_transactions_branch on transactions(branch_id, transaction_date desc);
create index idx_products_barcode on products(barcode) where barcode is not null;
create index idx_clients_phone on clients(phone);
create index idx_loyalty_client on loyalty_points(client_id);
create index idx_activity_logs_user on activity_logs(user_id, created_at desc);
create index idx_activity_logs_table on activity_logs(table_name, created_at desc);

-- Materialized views (refresh every 15min):
create materialized view mv_daily_sales as...     -- dashboard
create materialized view mv_stock_status as...     -- inventory alerts
create materialized view mv_client_ltv as...       -- CRM
create materialized view mv_supplier_score as...   -- vendor rating
```

```typescript
// Pagination everywhere (no full table loads)
// React Query: staleTime, gcTime optimization
// Supabase connection pooling (PgBouncer)
// Image optimization: WebP, lazy loading, Supabase CDN
// Bundle analysis: vite-bundle-visualizer
// Target: <2s initial load, <100ms interactions
```

---


---

## 💎 მოდული 38: Smart Universal Command (UX Killer)

```typescript
// Command Palette: Ctrl+K / Cmd+K — ყველგან ხელმისაწვდომი

---
## ✅ ფაზა 7 დასრულების კრიტერიუმები:
- [ ] 2FA (TOTP) — admin + manager სავალდებულო
- [ ] IP Access Control rules + middleware
- [ ] Soft Delete + Record Versioning ყველა ცხრილზე
- [ ] Conflict Resolution: offline sync strategies
- [ ] Push Notifications (PWA)
- [ ] i18n: ქართული + ინგლისური + რუსული
- [ ] Error Boundaries ყველა მოდულზე
- [ ] Sentry: error monitoring
- [ ] DB Integrity Checklist — ყველა query green
- [ ] Load testing: 50+ concurrent POS users
- [ ] 🚀 Production Launch
