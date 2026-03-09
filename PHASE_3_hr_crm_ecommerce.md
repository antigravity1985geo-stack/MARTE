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
# 🚀 ᲤᲐᲖᲐ 3 — HR + CRM + ლოიალობა + E-Commerce (კვ. 5-6)
## ახლა განახორციელე მხოლოდ ეს მოდულები:
## 📦 მოდული 4: HR — სრული

**ბიომეტრიული დასწრება:**
```typescript
// Option A: Web USB API — fingerprint scanner
// Option B: Face Recognition — face-api.js (privacy-respecting)
// Option C: QR/NFC card — თითოეული თანამშრომლის ბარათი
// Option D: PIN code — მარტივი, offline-ც მუშაობს
```

**Payroll სრული:**
```typescript
// გაანგარიშება:
// base_salary + overtime + bonuses - deductions
// საშემოსავლო გადასახადი: 20%
// სოციალური: 2% (optional)
// net_salary = gross - taxes

// PDF სახელფასო: თანამშრომლის პირად კაბინეტში
// Bank transfer file: TBC / BOG bulk payment format
// SSA (სოციალური სამსახური) ანგარიში — XML ექსპორტი
```

**თანამშრომლის პირადი კაბინეტი:**
```
URL: /employee-portal
Role: employee (new role)
Features:
- ხელფასის სლიპი — ისტორია
- დასწრების ისტორია
- შვებულების მოთხოვნა
- საკუთარი დოკუმენტები (PDF)
- სამუშაო განრიგი
```

**სამუშაო დავალებები (Tasks):**
```sql
create table tasks (
  id uuid primary key,
  title text,
  description text,
  assigned_to uuid references auth.users(id),
  assigned_by uuid references auth.users(id),
  due_date timestamptz,
  status text, -- 'pending' | 'in_progress' | 'done' | 'overdue'
  priority text, -- 'low' | 'medium' | 'high' | 'urgent'
  branch_id uuid
);
-- Push notification: task assigned, due tomorrow, overdue
```

---

## 📦 მოდული 5: CRM & ლოიალობა — სრული

**ლოიალობის სრული სისტემა:**
```sql
create table loyalty_tiers (
  id uuid primary key,
  name text, -- 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  min_points integer,
  discount_percentage numeric(5,2),
  free_delivery boolean,
  birthday_bonus_multiplier numeric(3,1)
);
create table loyalty_points (
  client_id uuid references clients(id),
  transaction_id uuid references transactions(id),
  points_earned integer,
  points_spent integer default 0,
  balance integer,
  created_at timestamptz
);
-- Trigger: tier auto-upgrade on points accumulation
-- Birthday auto-bonus: Edge Function cron job (daily)
```

**Campaign Management:**
```sql
create table campaigns (
  id uuid primary key,
  name text,
  type text, -- 'sms' | 'viber' | 'email' | 'whatsapp' | 'push'
  segment jsonb, -- {"tier": "gold"} | {"inactive_days": 30} | {"birthday_month": 3}
  message_template text,
  scheduled_at timestamptz,
  status text -- 'draft' | 'scheduled' | 'sent' | 'failed'
);
```

**ქართული კომუნიკაციის არხები:**
```typescript
// PRIORITY ORDER for Georgian market:
// 1. Viber Business API (ყველაზე გავრცელებული)
// 2. WhatsApp Business API
// 3. SMS — Magticom/Silknet gateway
// 4. Email — Resend/SendGrid

// ქვითრის გაგზავნა: Viber/WhatsApp-ში PDF
// დაბადების დღის შეტყობინება: ავტომატური
// Low stock alert: admin-ს
// Delivery update: კლიენტს
```

**კლიენტის სეგმენტაცია AI-ით:**
```typescript
// Edge Function: segment-clients
// Segments:
// - VIP: top 10% by revenue
// - At-risk: 30+ days inactive, previously frequent
// - New: joined < 30 days
// - Birthday this month
// - High-LTV potential: frequency up, basket size growing
// - Churned: 90+ days, no response to campaigns
```

---

## 📦 მოდული 6: E-Commerce & Online

**Extra.ge სრული ინტეგრაცია:**
```typescript
// Extra.ge API:
// - პროდუქტების სინქრონიზაცია (ავტო)
// - შეკვეთის ავტომატური მიღება
// - სტოქი Real-time sync
// - ფასების sync
// - ფოტოების upload
// Webhook: new order → POS notification → picking list
```

**MyMarket.ge ინტეგრაცია:**
```typescript
// MyMarket.ge Seller API:
// - Product listing sync
// - Order import (webhook)
// - Inventory sync
// - Price management
// - Review notifications
```

**Facebook / Instagram Shop:**
```typescript
// Meta Commerce API:
// - Catalog upload
// - Inventory updates
// - Order sync (Instagram checkout)
// - DM auto-response: "In stock, price: X ₾"
```

**Custom Online Store:**
```typescript
// Headless option:
// - Public API: GET /api/products, POST /api/orders
// - Supabase Edge Functions as API
// - Next.js storefront (separate project, uses same Supabase)
// - Customer auth: email/phone OTP
// - Order tracking page
```

---

## 📦 მოდული 7: დისტრიბუცია & მიწოდება
## 📦 მოდული 5: CRM & ლოიალობა — სრული

**ლოიალობის სრული სისტემა:**
```sql
create table loyalty_tiers (
  id uuid primary key,
  name text, -- 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  min_points integer,
  discount_percentage numeric(5,2),
  free_delivery boolean,
  birthday_bonus_multiplier numeric(3,1)
);
create table loyalty_points (
  client_id uuid references clients(id),
  transaction_id uuid references transactions(id),
  points_earned integer,
  points_spent integer default 0,
  balance integer,
  created_at timestamptz
);
-- Trigger: tier auto-upgrade on points accumulation
-- Birthday auto-bonus: Edge Function cron job (daily)
```

**Campaign Management:**
```sql
create table campaigns (
  id uuid primary key,
  name text,
  type text, -- 'sms' | 'viber' | 'email' | 'whatsapp' | 'push'
  segment jsonb, -- {"tier": "gold"} | {"inactive_days": 30} | {"birthday_month": 3}
  message_template text,
  scheduled_at timestamptz,
  status text -- 'draft' | 'scheduled' | 'sent' | 'failed'
);
```

**ქართული კომუნიკაციის არხები:**
```typescript
// PRIORITY ORDER for Georgian market:
// 1. Viber Business API (ყველაზე გავრცელებული)
// 2. WhatsApp Business API
// 3. SMS — Magticom/Silknet gateway
// 4. Email — Resend/SendGrid

// ქვითრის გაგზავნა: Viber/WhatsApp-ში PDF
// დაბადების დღის შეტყობინება: ავტომატური
// Low stock alert: admin-ს
// Delivery update: კლიენტს
```

**კლიენტის სეგმენტაცია AI-ით:**
```typescript
// Edge Function: segment-clients
// Segments:
// - VIP: top 10% by revenue
// - At-risk: 30+ days inactive, previously frequent
// - New: joined < 30 days
// - Birthday this month
// - High-LTV potential: frequency up, basket size growing
// - Churned: 90+ days, no response to campaigns
```

---

## 📦 მოდული 6: E-Commerce & Online

**Extra.ge სრული ინტეგრაცია:**
```typescript
// Extra.ge API:
// - პროდუქტების სინქრონიზაცია (ავტო)
// - შეკვეთის ავტომატური მიღება
// - სტოქი Real-time sync
// - ფასების sync
// - ფოტოების upload
// Webhook: new order → POS notification → picking list
```

**MyMarket.ge ინტეგრაცია:**
```typescript
// MyMarket.ge Seller API:
// - Product listing sync
// - Order import (webhook)
// - Inventory sync
// - Price management
// - Review notifications
```

**Facebook / Instagram Shop:**
```typescript
// Meta Commerce API:
// - Catalog upload
// - Inventory updates
// - Order sync (Instagram checkout)
// - DM auto-response: "In stock, price: X ₾"
```

**Custom Online Store:**
```typescript
// Headless option:
// - Public API: GET /api/products, POST /api/orders
// - Supabase Edge Functions as API
// - Next.js storefront (separate project, uses same Supabase)
// - Customer auth: email/phone OTP
// - Order tracking page
```

---

## 📦 მოდული 7: დისტრიბუცია & მიწოდება
## 📦 მოდული 6: E-Commerce & Online

**Extra.ge სრული ინტეგრაცია:**
```typescript
// Extra.ge API:
// - პროდუქტების სინქრონიზაცია (ავტო)
// - შეკვეთის ავტომატური მიღება
// - სტოქი Real-time sync
// - ფასების sync
// - ფოტოების upload
// Webhook: new order → POS notification → picking list
```

**MyMarket.ge ინტეგრაცია:**
```typescript
// MyMarket.ge Seller API:
// - Product listing sync
// - Order import (webhook)
// - Inventory sync
// - Price management
// - Review notifications
```

**Facebook / Instagram Shop:**
```typescript
// Meta Commerce API:
// - Catalog upload
// - Inventory updates
// - Order sync (Instagram checkout)
// - DM auto-response: "In stock, price: X ₾"
```

**Custom Online Store:**
```typescript
// Headless option:
// - Public API: GET /api/products, POST /api/orders
// - Supabase Edge Functions as API
// - Next.js storefront (separate project, uses same Supabase)
// - Customer auth: email/phone OTP
// - Order tracking page
```

---

## 📦 მოდული 7: დისტრიბუცია & მიწოდება

**მძღოლის PWA:**
```typescript
// URL: /driver-app (mobile-optimized)
// Features:
// - დღის მარშრუტი — სიაში
// - GPS navigation: Google Maps / Waze deep link
// - მიწოდების დადასტურება:
//   * ფოტო (camera API)
//   * ხელმოწერა (canvas touch)
//   * OTP კოდი (SMS კლიენტს → კლიენტი ამბობს მძღოლს)
// - ნაღდი ფულის ინკასაცია
// - Offline-first: IndexedDB, sync on reconnect
```

**Live Tracking Map:**
```typescript
// Admin view: /distribution/live-map
// Leaflet.js + OpenStreetMap (free)
// Supabase Realtime: driver location updates (30s interval)
// Geolocation API: driver PWA → sends coords
// ETA calculation
// Delivery zone polygons
```

**Courier ინტეგრაციები:**
```typescript
// Gorgia.ge API:
//   - შეკვეთის გაგზავნა
//   - ლეიბლის პრინტი (PDF)
//   - ტრეკინგ კოდი
//   - სტატუსის Webhook

// Sweeft Delivery API:
//   - ანალოგიური

// Yandex Go Business:
//   - კორპორატიული კურიერი (სწრაფი)

// Status sync → კლიენტს Viber/WhatsApp notification
```

---

## 📦 მოდული 8: სასტუმრო & Hospitality Module

## 📦 მოდული 22: Subscription Billing

```sql
create table subscription_plans (
  id uuid primary key,
  name text,                    -- "ყავის subscription - S", "წყლის პაკეტი"
  description text,
  billing_cycle text,           -- 'weekly' | 'monthly' | 'quarterly' | 'annual'
  price numeric(10,2),
  currency text default 'GEL',
  trial_days integer default 0,
  items jsonb,                  -- [{"product_id": "...", "qty": 2}]
  delivery_included boolean,
  active boolean default true
);

create table client_subscriptions (
  id uuid primary key,
  client_id uuid references clients(id),
  plan_id uuid references subscription_plans(id),
  status text,    -- 'active' | 'paused' | 'cancelled' | 'overdue'
  start_date date,
  next_billing_date date,
  next_delivery_date date,
  payment_method text,          -- 'card' | 'bog_qr' | 'bank_transfer'
  card_token text,              -- tokenized card (PCI-safe)
  delivery_address text,
  notes text,
  cancelled_at timestamptz,
  cancel_reason text
);

create table subscription_invoices (
  id uuid primary key,
  subscription_id uuid references client_subscriptions(id),
  period_start date,
  period_end date,
  amount numeric(10,2),
  status text,    -- 'pending' | 'paid' | 'failed' | 'refunded'
  paid_at timestamptz,
  invoice_pdf_url text,
  retry_count integer default 0,
  next_retry_at timestamptz
);
```

```typescript
// Edge Function: process-subscriptions (cron: daily 09:00)
// 1. Find all subscriptions where next_billing_date = today
// 2. Attempt payment (BOG QR / TBC tokenized card)
// 3. Success → generate invoice PDF → send Viber/email → create delivery order
// 4. Failure → retry logic (day 1, 3, 7) → notify client
// 5. After 3 failures → status = 'overdue' → notify admin

// Client Subscription Portal (/my-subscription):
// - Active subscriptions
// - Next delivery date + tracking
// - Pause / resume / cancel
// - Change delivery address
// - Payment history + invoice PDFs
// - Upgrade/downgrade plan

// Use cases in Georgian market:
// - წყლის მიწოდება (5L, 19L bottles — monthly)
// - ყავის მარცვლები (coffee roasters)
// - სასმელები / snacks (office subscriptions)
// - ბოსტნეული კალათი (farm-to-table)
// - ვიტამინები / supplements
// - ბეჭდური გამოცემები (magazines)
```

---

## 📦 მოდული 23: Vendor Rating & Smart Reorder

```sql
create table vendor_ratings (
  id uuid primary key,
  supplier_id uuid references suppliers(id),
  receiving_order_id uuid references receiving_orders(id),
  rated_by uuid references auth.users(id),
  delivery_on_time boolean,
  days_late integer default 0,
  quality_score integer check (quality_score between 1 and 5),
  quantity_accuracy boolean, -- მოიტანა ზუსტი რაოდენობა?
  price_accuracy boolean,    -- ფასი ინვოისთან ემთხვევა?
  notes text,
  created_at timestamptz default now()
);

-- Aggregated view
create view supplier_performance as
select 
  s.id, s.name,
  count(vr.id) as total_ratings,
  round(avg(vr.quality_score), 2) as avg_quality,
  round(100.0 * sum(case when vr.delivery_on_time then 1 else 0 end) / count(*), 1) as on_time_pct,
  round(100.0 * sum(case when vr.quantity_accuracy then 1 else 0 end) / count(*), 1) as accuracy_pct,
  round(avg(vr.days_late), 1) as avg_days_late,
  -- Composite score (weighted)
  round(
    avg(vr.quality_score) * 0.4 +
    (sum(case when vr.delivery_on_time then 5.0 else 1.0 end) / count(*)) * 0.35 +
    (sum(case when vr.quantity_accuracy then 5.0 else 1.0 end) / count(*)) * 0.25
  , 2) as composite_score
from suppliers s left join vendor_ratings vr on vr.supplier_id = s.id
group by s.id, s.name;

create table product_suppliers (
  product_id uuid references products(id),
  supplier_id uuid references suppliers(id),
  supplier_sku text,
  unit_cost numeric(10,2),
  lead_time_days integer,
  min_order_qty integer,
  is_preferred boolean default false,
  primary key (product_id, supplier_id)
);
```

```typescript
// Smart Reorder Engine:
// When stock hits reorder_point →
// 1. Find all suppliers for this product (product_suppliers)
// 2. Sort by composite_score DESC, then unit_cost ASC
// 3. Auto-suggest preferred supplier
// 4. If preferred supplier score < 3.0 → flag & suggest alternative
// 5. Generate draft Purchase Order
// 6. Send to admin for 1-click approval

// Vendor Portal → Rating prompt:
// After receiving order confirmed → popup:
// "შეაფასეთ მომწოდებელი [Name]"
// Stars for quality, checkbox for on-time, quantity accuracy

// Auto-blacklist: if score < 2.0 for 3 consecutive ratings
// → notify admin: "მომწოდებელი X-ს შეფასება კრიტიკულად დაბალია"
```

---

## 📦 მოდული 24: WhatsApp / Viber Chatbot

```typescript
## 📦 მოდული 29: Gift Cards & Vouchers

```sql
create table gift_cards (
  id uuid primary key,
  code text unique not null,   -- "GIFT-XXXX-XXXX"
  qr_code_url text,            -- Supabase Storage
  initial_balance numeric(10,2),
  current_balance numeric(10,2),
  currency text default 'GEL',
  purchased_by uuid references clients(id),
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  status text,   -- 'active' | 'exhausted' | 'expired' | 'cancelled'
  expires_at date,
  created_at timestamptz
);

create table gift_card_transactions (
  id uuid primary key,
  card_id uuid references gift_cards(id),
  transaction_id uuid references transactions(id),
  amount_used numeric(10,2),
  balance_after numeric(10,2),
  used_at timestamptz
);
```

```typescript
// POS Integration:
// Payment method: "Gift Card" → scan QR or enter code
// → validate balance → deduct → show remaining
// → partial: gift card + cash/card combo

// Digital Delivery:
// Purchase → generate PDF card (branded) → email + Viber
// Physical: print barcode label for physical card

// Corporate Gift Cards:
// Bulk purchase (company buys 50 cards for employees)
// → invoice to company → individual delivery to employees

// Promo Vouchers:
// Campaign vouchers (e.g. "20% off next visit")
// Single-use codes for campaigns
// Referral vouchers: "მოიყვანე მეგობარი → ორივე +50 ქ."
```

---

## 📦 მოდული 30: Fleet & Fuel Management

## 📦 მოდული 33: Gamification & Employee Engagement

```sql
create table employee_badges (
  id uuid primary key,
  name text,          -- "Top Seller", "Perfect Attendance", "Speed Demon"
  description text,
  icon text,          -- emoji or icon name
  category text,      -- 'sales' | 'attendance' | 'quality' | 'training'
  criteria jsonb      -- {"metric": "daily_sales", "threshold": 1000}
);

create table employee_achievements (
  employee_id uuid references employees(id),
  badge_id uuid references employee_badges(id),
  earned_at timestamptz,
  branch_id uuid,
  value numeric  -- actual value that triggered it
);

create table sales_leaderboard (
  -- Materialized view, refreshed hourly
  employee_id uuid,
  branch_id uuid,
  period text,          -- 'today' | 'this_week' | 'this_month'
  total_sales numeric,
  transaction_count integer,
  avg_basket numeric,
  rank integer
);
```

```typescript
// Gamification features:
// Leaderboard (/leaderboard):
// - Real-time sales ranking (today / week / month)
// - Branch vs branch competition
// - Top performer badge on their POS screen
// - Weekly winner announcement (push notification)

// Achievement System:
// Auto-award badges via Supabase triggers:
// - "პირველი ათასი" → first 1000 GEL day
// - "უხარვეზო" → 30 consecutive days, no returns
// - "სწრაფი" → avg transaction under 2 minutes
// - "ერთგული" → 1 year with company
// - "გამყიდველი" → top seller this month

// Employee Wall of Fame (/wall-of-fame):
// Public screen (TV in break room)
// Supabase Realtime: live leaderboard on TV
// Notification to winner: "🏆 ამ კვირის საუკეთესო!"

// Manager tools:
// Spot bonus: "+50 GEL ბონუსი, კარგი სამუშაო!"
// → notification to employee
// → auto-adds to next payroll
```

---

## 📦 მოდული 34: API Marketplace & White-Label


---
## ✅ ფაზა 3 დასრულების კრიტერიუმები:
- [ ] HR: attendance + payroll სრულად
- [ ] HR: Employee portal (/employee-portal)
- [ ] CRM: loyalty tiers Bronze/Silver/Gold/Platinum
- [ ] CRM: loyalty POS-ში (scan + redeem)
- [ ] CRM: Viber/WhatsApp campaign გაგზავნა
- [ ] E-Commerce: Extra.ge + MyMarket.ge sync
- [ ] Subscription billing + auto-invoice
- [ ] Gift cards: generate + redeem at POS
- [ ] Gamification: leaderboard + badges
