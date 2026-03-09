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

## 📦 მოდული 1: POS სისტემა — გაუმჯობესება

### ახალი ფუნქციები (დამატება):

**Customer Display Screen:**
```typescript
// BroadcastChannel API — მეორე ეკრანი კლიენტისთვის
const channel = new BroadcastChannel('pos-display');
channel.postMessage({ cart, total, loyaltyPoints, promos });

// CustomerDisplayWindow component:
// - Real-time cart preview
// - Loyalty points balance
// - Promo banners (configurable images)
// - Thank you screen after payment
// - Works OFFLINE
```

**Product Bundles & Combos:**
```sql
create table product_bundles (
  id uuid primary key,
  name text not null,
  discount_type text, -- 'percentage' | 'fixed'
  discount_value numeric,
  active boolean default true
);
create table bundle_items (
  bundle_id uuid references product_bundles(id),
  product_id uuid references products(id),
  quantity integer default 1
);
```
```typescript
// POS-ში: bundle auto-detection
// სკანირებისას თუ bundle პირობა სრულდება → ავტომატური ფასდაკლება
```

**Dynamic Pricing Engine:**
```sql
create table price_rules (
  id uuid primary key,
  name text,
  type text, -- 'bulk' | 'loyalty_tier' | 'time_based' | 'category' | 'bundle'
  condition jsonb, -- {"min_qty": 5} | {"tier": "gold"} | {"after": "18:00"}
  discount_type text, -- 'percentage' | 'fixed'
  discount_value numeric,
  priority integer, -- higher = applies first
  active boolean,
  valid_from timestamptz,
  valid_until timestamptz
);
```

**გაუმჯობესებული Payment Dialog:**
```
- BOG QR / TBC Pay — ქართული QR გადახდა (პრიორიტეტი!)
- KEEPZ integration
- Space / Credo / Lilo — BNPL განვადება
- გაყოფილი გადახდა: ნაღდი + ბარათი კომბო
- Loyalty points გამოყენება POS-ში
- Gift card / voucher კოდი
- კომპანიის ანგარიშსწორება (B2B)
```

**Offline Queue სრული:**
```typescript
class POSOfflineQueue {
  // IndexedDB (არა localStorage — მეტი სიმძლავრე)
  async enqueue(sale: Sale): Promise<void>
  async flush(): Promise<void> // internet restored
  async getQueuedCount(): Promise<number>
  async retryFailed(): Promise<void>
}
// Service Worker-ში Background Sync API გამოყენება
```

---

## 📦 მოდული 2: საწყობი — სრული

### ახალი ფუნქციები:

**FIFO/LIFO/Average — სრული იმპლემენტაცია:**
```sql
create table stock_batches (
  id uuid primary key,
  product_id uuid references products(id),
  warehouse_id uuid references warehouses(id),
  quantity integer not null,
  cost_price numeric(10,2) not null,
  received_at timestamptz default now(),
  expiry_date date, -- ვადა
  batch_number text,
  supplier_id uuid references suppliers(id)
);

-- FIFO trigger: ყიდვისას ყველაზე ძველი batch-ი პირველი გამოდის
create function deduct_fifo_stock() returns trigger...
```

**Barcode & QR სრული:**
```typescript
// USB Hardware Scanner (HID)
useHardwareScanner({ 
  onScan: (barcode) => handleProductScan(barcode),
  timeout: 100 
})

// კამერა სკანი — გაუმჯობესება
// Batch scanning mode — საწყობის სწრაფი მიღება
// QR label printing — A4 & label printer support
// GS1-128, EAN-13, Code-128, QR, DataMatrix
```

**ინვენტარიზაცია:**
```typescript
// InventoryCount module:
// 1. შექმენი count session
// 2. ბარკოდ-სკანით ან ხელით შეიყვანე რაოდენობა
// 3. system vs counted — სხვაობის ანგარიში
// 4. Adjustment journal entry ავტომატურად
// 5. PDF ინვენტარიზაციის აქტი (ხელმოწერისთვის)
```

**AI მარაგის პროგნოზი:**
```typescript
// Edge Function: forecast-stock
const forecast = await supabase.functions.invoke('forecast-stock', {
  body: { 
    productId, 
    daysAhead: 30,
    includeSeasonality: true,
    georgianHolidays: true // ახალი წელი, 8 მარტი, დამოუკიდებლობა...
  }
});
// Claude API: analyze sales history → predict stockout date
// Push notification: admin-ს → "X პროდუქტი 5 დღეში დასრულდება"
```

---

## 📦 მოდული 3: ბუღალტერია — გაფართოება

### ახალი ფუნქციები:

**ბიუჯეტი vs ფაქტი:**
```sql
create table budgets (
  id uuid primary key,
  name text,
  year integer,
  branch_id uuid references branches(id),
  created_by uuid references auth.users(id)
);
create table budget_lines (
  budget_id uuid references budgets(id),
  account_id uuid references accounts(id),
  month integer, -- 1-12
  budgeted_amount numeric(15,2)
);
-- View: budget_vs_actual (join with journal_lines)
```

**DGF/VAT ავტომატური ანგარიში:**
```typescript
// Edge Function: generate-vat-report
// Input: month, year, branch_id
// Output: 
//   - VAT Declaration XML (RS.GE ფორმატი)
//   - PDF summary
//   - Excel detail
// Auto-schedule: ყოველი თვის 15-ში reminder
```

**Multi-currency:**
```sql
create table exchange_rates (
  currency_code text, -- USD, EUR, GBP, RUB, TRY, AZN, AMD
  rate numeric(10,4),
  date date,
  source text -- 'NBG' (National Bank of Georgia)
);
-- NBG API integration: ყოველდღიური კურსის ავტო-განახლება
-- P&L და Balance Sheet GEL-ში
```

**Fixed Assets — ძირითადი საშუალებები:**
```sql
create table fixed_assets (
  id uuid primary key,
  name text,
  category text, -- equipment, building, vehicle, furniture
  purchase_price numeric(15,2),
  purchase_date date,
  useful_life_months integer,
  depreciation_method text, -- 'straight_line' | 'declining_balance'
  current_book_value numeric(15,2),
  location text,
  branch_id uuid
);
-- ყოველთვიური ავტო-ამორტიზაცია → journal entry
```

---

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

```sql
-- სასტუმრო, სახლები, აგარაკები, Airbnb-type
create table properties (
  id uuid primary key,
  name text,
  type text, -- 'hotel' | 'guesthouse' | 'apartment' | 'resort'
  address text,
  branch_id uuid,
  star_rating integer
);
create table rooms (
  id uuid primary key,
  property_id uuid references properties(id),
  room_number text,
  type text, -- 'single' | 'double' | 'suite' | 'apartment'
  floor integer,
  capacity integer,
  base_price numeric(10,2),
  amenities jsonb -- ["wifi", "tv", "minibar", "balcony"]
);
create table reservations (
  id uuid primary key,
  room_id uuid references rooms(id),
  guest_id uuid references clients(id),
  check_in date,
  check_out date,
  actual_check_in timestamptz,
  actual_check_out timestamptz,
  status text, -- 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
  total_price numeric(10,2),
  payment_status text,
  source text, -- 'direct' | 'booking.com' | 'airbnb' | 'phone'
  notes text,
  created_by uuid
);
create table room_charges (
  reservation_id uuid references reservations(id),
  description text,
  amount numeric(10,2),
  charge_date date,
  charged_by uuid -- staff member
);
```

**Booking.com / Airbnb ინტეგრაცია:**
```typescript
// Channel Manager API:
// - iCal sync (basic)
// - ARI (Availability, Rates, Inventory) sync
// - Reservation import
// - Rate management

// PMS Features:
// - Front desk dashboard: today's arrivals/departures
// - Housekeeping module: room status (clean/dirty/maintenance)
// - Guest history + preferences
// - Invoice per stay → PDF
// - Restaurant/POS charges to room
// - Digital check-in (email link)
```

---

## 📦 მოდული 9: წარმოება — Manufacturing

**Bill of Materials (BOM):**
```sql
create table bom_headers (
  id uuid primary key,
  finished_product_id uuid references products(id),
  version text default '1.0',
  quantity_produced numeric(10,3), -- batch size
  production_time_minutes integer,
  notes text,
  active boolean default true
);
create table bom_items (
  bom_id uuid references bom_headers(id),
  ingredient_id uuid references products(id),
  quantity numeric(10,4),
  unit text, -- 'kg' | 'g' | 'ml' | 'l' | 'pcs'
  waste_percentage numeric(5,2) default 0
);
create table manufacturing_orders (
  id uuid primary key,
  bom_id uuid references bom_headers(id),
  quantity_to_produce numeric(10,2),
  status text, -- 'planned' | 'in_progress' | 'completed' | 'cancelled'
  started_at timestamptz,
  completed_at timestamptz,
  actual_cost numeric(10,2),
  quality_result text -- 'passed' | 'failed' | 'partial'
);
```

**კვების ობიექტის სპეციფიკა:**
```typescript
// კერძის ბარათი: ინგრედიენტი → წონა → ალერგენი → ღირებულება
// HACCP: ტემპერატურის ლოგი, ვადების კონტროლი
// მარაგის ავტო-ჩამოჭრა: წარმოება → BOM → stock deduction
// სამზარეულოს ეკრანი (KDS): შეკვეთა → მზადაა სიგნალი
// Recipe costing: ინგრედიენტის ფასი → dish cost → მარჟა
```

---

## 📦 მოდული 10: AI სრული Suite

**AI Sales Assistant:**
```typescript
// Edge Function: ai-assistant
// POST /ai-chat
// System prompt: "შენ ხარ საწყობი ERP-ის ანალიტიკოსი. 
//   მომხმარებელს ქართულ ენაზე პასუხობ. 
//   გაქვს წვდომა: sales, products, clients, employees მონაცემებზე."

// Query examples:
// "გასული კვირის ტოპ 5 პროდუქტი?"
// "ყველაზე მეტი დავალიანება მქონე კლიენტი?"
// "ამ თვის ხარჯი გასულ წელთან შედარებით?"
// "რომელი კასიერი ყველაზე მეტი გაყიდა?"
// Claude API → SQL generation → result formatting → chart
```

**AI Stock Forecasting:**
```typescript
// Edge Function: forecast-stock (cron: daily 06:00)
// Algorithm:
// 1. Last 90 days sales velocity per product
// 2. Apply seasonality (Georgian holidays/seasons)
// 3. Calculate days_until_stockout
// 4. If < threshold → create alert
// 5. Suggest optimal reorder quantity (EOQ formula)
// Push to admin: Supabase notifications + Viber/Email
```

**Smart Anomaly Detection:**
```typescript
// Edge Function: detect-anomalies (cron: hourly)
// Checks:
// - Unusual sales spike/drop (>2 std dev)
// - Employee login at unusual hours
// - Large discount applied (>X%)
// - Refund rate spike
// - Cash mismatch at shift close
// Alert → admin Viber message
```

**AI-Powered BI Dashboard:**
```typescript
// /executive-dashboard (admin + manager only)
// Components:
// - Revenue trend + AI forecast line (next 30 days)
// - Gross margin by category (heatmap)
// - Branch performance comparison
// - Customer acquisition vs churn
// - Top/Bottom performers (products, employees, branches)
// - AI narrative: "ამ კვირას შემოსავალი X%-ით გაიზარდა, 
//                  ძირითადი მიზეზი: ..."
```

**Voice Commands:**
```typescript
// Web Speech API — ქართული ენა
const recognition = new SpeechRecognition();
recognition.lang = 'ka-GE';
// Commands:
// "მოძებნე [პროდუქტი]" → search
// "დაამატე [N] ერთეული" → stock update
// "გაიხსნა ახალი ცვლა" → shift open
// "ანგარიში გაყიდვებზე" → open sales report
```

---

## 📦 მოდული 11: ფინანსური ინტეგრაციები (ქართული)

**BOG QR Payment:**
```typescript
// Bank of Georgia QR API
// POS-ზე: "QR გადახდა" ღილაკი
// Generate QR → customer scans with BOG app
// Webhook: payment confirmed → POS auto-closes sale
// Receipt: "BOG QR" payment method
```

**TBC Pay:**
```typescript
// TBC Bank Payment Gateway
// Card payments (online + POS terminal)
// TBC Pay QR
// Installment (TBC credit)
// Webhook: payment status → order status update
```

**KEEPZ:**
```typescript
// KEEPZ payment terminal integration
// Multiple cards, QR, loyalty in one device
```

**BNPL — განვადება:**
```typescript
// Space.ge / Credo Bank / Lilo Credit
// POS-ზე: "განვადება" option
// API: send application → get approval → confirm sale
// Sale marked as 'bnpl' payment method
```

**საბანკო ამონაწერი:**
```typescript
// BOG & TBC API → automatic bank reconciliation
// Transactions import daily
// Auto-match with journal entries
// Unmatched → flag for accountant review
// NBG daily exchange rates → auto-import
```

---

## 📦 მოდული 12: სახელმწიფო ინტეგრაციები

**RS.GE სრული Suite:**
```typescript
// 1. Fiscal receipts (already planned)
// 2. VAT Declaration (monthly auto-submit)
// 3. Withholding tax report
// 4. Employee income declaration (annual)
// Edge Functions for all + error handling + retry
```

**NAPR (მეწარმეთა რეესტრი):**
```typescript
// TIN validation: verify client/supplier company
// GET https://api.napr.gov.ge/company/{tin}
// Returns: company name, address, status, director
// Auto-populate client form on TIN entry
```

**SSA (სოციალური სამსახური):**
```typescript
// Monthly salary report upload
// Format: XML per SSA specification
// Employee count, total payroll, taxes
// Auto-generate + manual review + submit
```

**საბაჟო (Customs / ASYCUDA):**
```typescript
// Import/Export declaration support
// HS code management
// SAD (Single Administrative Document) generation
// For businesses that import goods
```

---

## 📦 მოდული 13: Logistics & Courier

**Gorgia.ge:**
```typescript
// POST /orders — შეკვეთის გაგზავნა
// GET /orders/{id}/label — PDF label
// GET /orders/{id}/track — სტატუსი
// Webhook: status_change → client notification
```

**Sweeft Delivery:**
```typescript
// ანალოგიური Gorgia-სთვის
```

**DHL Georgia / Air Express:**
```typescript
// საერთაშორისო გადაზიდვა
// Shipment creation, tracking, customs docs
```

---

## 📦 მოდული 14: მრავალენოვნება (i18n)

```typescript
// react-i18next
// Languages:
// - ka (ქართული) — primary, default
// - en (English) — tourist/international business
// - ru (Russian) — some segments still use
// - hy (Armenian) — South Caucasus expansion
// - az (Azerbaijani) — South Caucasus expansion

// Language detection: browser → localStorage → user profile setting
// Admin can set default language per branch
// POS receipt: printed in client's language
// Customer Display: in client's language
```

---

## 📦 მოდული 15: გაუმჯობესებული Analytics

**ABC ანალიზი:**
```sql
-- Products: A (top 20% = 80% revenue), B (30%), C (50%)
create view product_abc_analysis as
select p.*, 
  sum(ti.total) as total_revenue,
  ntile(3) over (order by sum(ti.total) desc) as abc_tier
from products p join transaction_items ti...
```

**Basket Analysis (Market Basket):**
```sql
-- რომელი პროდუქტები ერთად იყიდება
-- Cross-sell recommendations
create view basket_pairs as
select a.product_id as product_a, b.product_id as product_b,
  count(*) as co_occurrence
from transaction_items a join transaction_items b 
  on a.transaction_id = b.transaction_id and a.product_id < b.product_id
group by 1,2 having count(*) > 5
order by co_occurrence desc;
```

**Customer LTV:**
```sql
create view customer_ltv as
select c.id, c.name,
  count(t.id) as total_transactions,
  sum(t.total_amount) as total_revenue,
  avg(t.total_amount) as avg_basket,
  max(t.transaction_date) as last_purchase,
  now() - max(t.transaction_date) as recency,
  sum(t.total_amount) / nullif(
    extract(days from now() - min(t.transaction_date)) / 30, 0
  ) as monthly_ltv
from clients c left join transactions t on t.client_id = c.id
group by c.id, c.name;
```

**სეზონური ანალიზი (ქართული):**
```typescript
// Georgian holiday calendar:
const GEORGIAN_HOLIDAYS = {
  'new_year': ['01-01', '01-02'],
  'christmas': ['01-07'],
  'epiphany': ['01-19'],
  'mothers_day': ['03-03'],
  'womens_day': ['03-08'],
  'easter': 'variable', // Orthodox
  'independence': ['05-26'],
  'day_of_love': ['04-09'],
  'assumption': ['08-28'],
  'svetitskhovloba': ['10-14'],
  'giorgoba': ['11-23'],
}
// Annotate charts with holiday markers
// Pre-holiday demand spike forecasting
```

---

## 📦 მოდული 16: Administration & Audit

**სრული Audit Trail:**
```sql
-- Generic trigger on ALL sensitive tables
create function log_activity() returns trigger as $$
begin
  insert into activity_logs (
    user_id, action, table_name, record_id, 
    old_data, new_data, ip_address, user_agent, branch_id
  ) values (
    auth.uid(), TG_OP, TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    to_jsonb(OLD), to_jsonb(NEW),
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('request.headers', true)::json->>'user-agent',
    coalesce(NEW.branch_id, OLD.branch_id)
  );
  return NEW;
end;
$$ language plpgsql security definer;

-- Apply to: products, transactions, clients, employees, 
--           accounts, journal_entries, user_roles, price_rules
```

**Admin Panel გაფართოება:**
```
- User management: invite, role assign, deactivate
- Branch management: create, config, RLS policy
- System settings: receipt template, tax rates, currencies
- Activity log viewer: filter by user/table/date/action
- Performance dashboard: query times, error rates
- Backup management: export data to Excel/JSON
- Feature flags: enable/disable modules per branch
```

**Notification Center:**
```typescript
// Real-time notifications (Supabase Realtime)
// Types:
// - Low stock alert
// - New order (online)
// - Payment received
// - Task assigned/overdue
// - Anomaly detected
// - Report ready
// - System error
// 
// Delivery:
// - In-app (bell icon + dropdown)
// - Viber Business
// - Email
// - Push (PWA)
// 
// Preferences: user sets which alerts, which channels
```

---

## 📦 მოდული 17: Document Management

**დოკუმენტების არქივი:**
```sql
create table documents (
  id uuid primary key,
  name text,
  type text, -- 'contract' | 'license' | 'invoice' | 'receipt' | 'report' | 'other'
  file_url text, -- Supabase Storage
  related_to text, -- 'supplier' | 'client' | 'employee' | 'branch'
  related_id uuid,
  expiry_date date,
  tags text[],
  uploaded_by uuid,
  created_at timestamptz
);
-- Alert: expiry_date - 30 days → notification
-- Full-text search on document names/tags
```

**PDF Generation გაუმჯობესება:**
```typescript
// jsPDF + custom templates:
// - Professional invoice (ბრენდირებული)
// - Salary slip
// - Delivery note
// - Stock transfer document
// - Audit report
// - Financial statements (balance sheet, P&L)
// - VAT declaration summary
// - HR contract template
// All PDFs: Georgian font support, company logo, watermark option
```

---

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
create type app_role as enum (
  'admin',           -- სრული წვდომა
  'manager',         -- ანგარიში, AI, CRM, HR (no user mgmt)
  'accountant',      -- ბუღალტერია + ანგარიში
  'hr_manager',      -- HR + Payroll
  'senior_cashier',  -- POS + basic reports
  'cashier',         -- POS only
  'warehouse_manager', -- საწყობი + მიწოდება
  'driver',          -- Driver PWA only
  'supplier',        -- Supplier portal only
  'employee'         -- Employee portal only
);
```

---

## 🗓️ განვითარების გეგმა

### ფაზა 1 (კვ. 1-2): Foundation
- Supabase enable + SQL migrations
- Auth migration + RLS
- RS.GE production deploy
- Core data migration localStorage → Supabase

### ფაზა 2 (კვ. 3-4): Core Features
- BOG QR / TBC Pay
- Loyalty program სრული
- Dynamic pricing engine
- Viber/WhatsApp integration

### ფაზა 3 (კვ. 5-6): Advanced Operations
- AI stock forecasting
- Customer display screen
- Delivery tracking + map
- Multi-warehouse transfers + BOM

### ფაზა 4 (კვ. 7-8): Analytics & AI
- Executive BI dashboard
- AI sales assistant
- Budget vs actual
- ABC + Basket analysis

### ფაზა 5 (კვ. 9-10): Integrations
- Extra.ge + MyMarket.ge
- Gorgia/Sweeft courier
- Hotel module
- SSA + NAPR integrations

### ფაზა 6 (კვ. 11-12): Polish & Launch
- i18n (EN + RU)
- React Native driver app
- Load testing
- Security audit
- Production launch 🚀

---

## 📋 კოდის სტილი & კონვენციები

```typescript
// 1. ყოველთვის გამოიყენე semantic design tokens (არა hardcoded colors)
// 2. Framer Motion ყველა transition-ზე
// 3. Zustand — UI state. React Query — server state
// 4. Zod — ყველა form validation
// 5. TypeScript strict mode — no 'any'
// 6. Error boundaries — ყოველ module-ზე
// 7. Loading + Error + Empty states — ყველა component-ში
// 8. ARIA labels — ყველა interactive element-ზე
// 9. Double-entry accounting — never break A = L + E
// 10. RLS policy — ყოველ ახალ table-ზე სავალდებულო
// 11. Audit trigger — ყოველ sensitive table-ზე
// 12. Georgian font — FreeSans/DejaVu for PDF generation
```

---

## 📦 მოდული 21: Franchise Management

```sql
-- Franchise = HQ მართავს N ფილიალს/ფრანჩაიზს
create table franchise_networks (
  id uuid primary key,
  name text not null,           -- "Dunkin Georgia", "My Coffee Chain"
  hq_branch_id uuid references branches(id),
  royalty_percentage numeric(5,2), -- ყოველი გაყიდვის X% HQ-ს
  contract_template_url text,
  created_at timestamptz default now()
);

create table franchise_members (
  id uuid primary key,
  network_id uuid references franchise_networks(id),
  branch_id uuid references branches(id),
  franchisee_user_id uuid references auth.users(id),
  status text, -- 'active' | 'suspended' | 'terminated'
  joined_at date,
  contract_url text,
  monthly_fee numeric(10,2)
);

create table franchise_policies (
  network_id uuid references franchise_networks(id),
  policy_type text, -- 'price' | 'menu' | 'promotion' | 'supplier'
  applies_to text,  -- 'all' | specific branch ids (jsonb array)
  override_allowed boolean default false,
  data jsonb,       -- {"product_id": "...", "fixed_price": 5.99}
  effective_from date,
  effective_until date
);
```

**HQ Dashboard — /franchise/hq:**
```typescript
// ცენტრალიზებული მართვა:
// - ყველა ფილიალის გაყიდვები ერთ ეკრანზე (Recharts grouped bar)
// - Royalty calculator: ყოველი ფილიალი → HQ-ს სავალდებულო %
// - Menu/Catalog push: HQ ამტკიცებს, ყველა ფილიალი ავტომატურად იღებს
// - Centralized pricing: HQ ადგენს ფასს → ფილიალი ვერ ცვლის
//   (policy.override_allowed = false)
// - Promotional campaigns: HQ ქმნის → broadcast ყველა ფილიალზე
// - Franchisee performance ranking: TOP/BOTTOM performers
// - Contract expiry alerts: 90/60/30 days before

// Franchisee Dashboard — /franchise/member:
// - საკუთარი გაყიდვები + royalty due
// - HQ-ს მითითებები და განახლებები
// - Support ticket system → HQ-სთან კომუნიკაცია
// - Training materials / SOPs (PDF library)

// Automatic Royalty Invoicing:
// Supabase cron (monthly): 
//   calculate branch revenue × royalty_percentage
//   → generate invoice to franchisee
//   → send via email/Viber
//   → journal entry in HQ accounting
```

---

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
// Supabase Edge Function: chatbot-webhook
// Handles both WhatsApp Business API & Viber Bot API

// ── Client-facing commands ──────────────────────────────
// "ბალანსი" / "balance"     → loyalty points + tier
// "ბოლო შეკვეთა"             → last 3 purchases summary
// "ტრეკინგი" / "tracking"    → delivery status + ETA
// "ქვითარი [N]"              → PDF receipt via file message
// "სპეც-შეთავაზება"           → active promo codes for this client
// "სააბონენტო"               → subscription status + next delivery
// "ადამიანი" / "operator"    → forward to human (notify staff)

// ── Staff-facing commands (authenticated) ──────────────
// "მარაგი [პროდუქტი]"       → current stock level
// "გაყიდვები დღეს"           → today's revenue
// "ალერტები"                 → pending low-stock + anomalies
// "ანგარიში"                 → mini daily report PDF

// ── Flow ──────────────────────────────────────────────
// Incoming message → Edge Function webhook
// → identify client by phone number (match clients.phone)
// → parse intent (keyword matching + Claude API fallback)
// → query Supabase
// → format response (text + optional PDF/image attachment)
// → reply via WhatsApp/Viber API

// Onboarding flow:
// First message from unknown number:
// "გამარჯობა! 👋 გთხოვთ გამოაგზავნოთ თქვენი სახელი"
// → create/link client profile
// → send welcome message + loyalty card QR

// Admin handoff:
// If bot can't understand → "ოპერატორს გადავაგზავნი..."
// → Supabase realtime notification to staff
// → staff responds in /live-chat dashboard
```

---

## 📦 მოდული 25: Carbon Footprint & ESG Tracker

```sql
create table emission_factors (
  id uuid primary key,
  category text,     -- 'transport' | 'electricity' | 'waste' | 'packaging' | 'product'
  subcategory text,  -- 'diesel_truck' | 'electric_van' | 'cardboard_box'
  unit text,         -- 'km' | 'kwh' | 'kg'
  co2_kg_per_unit numeric(10,6),
  source text,       -- 'IPCC 2023' | 'GHG Protocol'
  updated_at date
);

create table carbon_entries (
  id uuid primary key,
  branch_id uuid references branches(id),
  category text,
  subcategory text,
  quantity numeric(12,4),
  co2_kg numeric(12,4),  -- quantity × emission_factor
  period_month integer,
  period_year integer,
  notes text,
  created_by uuid
);
```

```typescript
// Auto-calculation from existing data:
// 1. Delivery orders → km driven × vehicle type → transport emissions
// 2. Electricity bills (manual entry or API) → kWh → scope 2
// 3. Packaging (from receiving orders) → cardboard/plastic kg → scope 3
// 4. Waste (manual) → kg × disposal method → scope 3
// 5. Business travel → km × transport mode

// ESG Dashboard (/sustainability):
// - Monthly CO2e by scope (1, 2, 3)
// - Trend chart (reducing = green, increasing = red)
// - Comparison: branch A vs B
// - Carbon intensity: CO2 per 1000 GEL revenue
// - Offset suggestions (local Georgian tree-planting orgs)
// - ESG Report PDF (investor/bank ready)
// - GHG Protocol compliant export

// Why now for Georgian market:
// - EU CBAM (Carbon Border Adjustment) affects Georgian exporters
// - International investors require ESG reporting
// - EU Association Agreement alignment
// - Green certification for hospitality (eco-hotels)
```

---

## 📦 მოდული 26: Restaurant & Table Management

```sql
-- სრული რესტორნის მართვა (POS-ის გაფართოება)
create table restaurant_areas (
  id uuid primary key,
  branch_id uuid,
  name text,   -- "დარბაზი" | "ტერასა" | "VIP ოთახი" | "ბარი"
  floor integer
);

create table restaurant_tables (
  id uuid primary key,
  area_id uuid references restaurant_areas(id),
  number text,         -- "T1", "T12", "VIP-3"
  capacity integer,
  shape text,          -- 'round' | 'square' | 'rectangle'
  pos_x integer,       -- visual floor plan position
  pos_y integer,
  status text          -- 'available' | 'occupied' | 'reserved' | 'cleaning'
);

create table table_orders (
  id uuid primary key,
  table_id uuid references restaurant_tables(id),
  waiter_id uuid references auth.users(id),
  guests integer,
  opened_at timestamptz,
  closed_at timestamptz,
  status text          -- 'open' | 'bill_requested' | 'closed'
);

create table table_order_items (
  order_id uuid references table_orders(id),
  product_id uuid references products(id),
  quantity integer,
  notes text,          -- "ყველის გარეშე", "ნელ-ნელა"
  course integer,      -- 1=სტარტერი, 2=მთ. კერძი, 3=დესერტი
  status text,         -- 'pending' | 'sent_to_kitchen' | 'ready' | 'served'
  sent_at timestamptz
);
```

```typescript
// Floor Plan Editor (drag & drop):
// - Visual table layout / სართულის გეგმა
// - Real-time table status (color coded)
// - Waiter assignment per section

// KDS — Kitchen Display System (/kitchen):
// - ყველა შეკვეთა სამზარეულოს ეკრანზე
// - Course-ის მიხედვით დალაგება
// - Timer: order age → yellow (10min) → red (20min)
// - "მზადაა" button → waiter notification (buzz on phone)
// - Supabase Realtime: instant update

// Waiter Tablet App (/waiter):
// - My tables dashboard
// - Add items to existing order
// - Split bill (2+ კლიენტი ერთ მაგიდაზე)
// - Move table (table transfer)
// - Print/send bill

// Table Reservation:
// - Calendar view
// - Online booking widget (embed on website)
// - SMS/Viber confirmation + reminder (2h before)
// - No-show tracking → client flagged
```

---

## 📦 მოდული 27: Self-Checkout Kiosk

```typescript
// /kiosk — fullscreen, touch-optimized
// Hardware: tablet + card reader + receipt printer + barcode scanner

// Flow:
// 1. "დაიწყეთ შოპინგი" — touch to start
// 2. Scan items (camera or USB scanner)
// 3. Age verification prompt (alcohol/tobacco — camera face detection)
// 4. Payment: BOG QR / TBC Pay / Card tap
// 5. Receipt: print OR send to phone (QR → Viber/email)
// 6. Loyalty: scan card QR before payment → points auto-applied
// 7. Staff alert button: "დახმარება სჭირდება"

// Security:
// - Weight scale integration (unexpected item check)
// - Staff override PIN for age-restricted items
// - Transaction paired with camera snapshot
// - Anomaly: scanned 1 item, bagged 3 → alert

// Georgian use case:
// - სუპერმარკეტი (self-checkout lane)
// - სასტუმრო lobby shop
// - კვების ობიექტი (grab & go)
// - AZS / fuel station shop
```

---

## 📦 მოდული 28: Appointment & Booking System

```sql
-- სალონი, კლინიკა, სერვის-ცენტრი, ნოტარიუსი...
create table services (
  id uuid primary key,
  branch_id uuid,
  name text,             -- "თმის შეჭრა", "მასაჟი", "ტექ. დათვალიერება"
  duration_minutes integer,
  price numeric(10,2),
  category text,
  staff_required boolean default true,
  max_parallel integer default 1  -- simultaneously
);

create table staff_schedules (
  id uuid primary key,
  employee_id uuid references employees(id),
  day_of_week integer,   -- 0=კვირა, 1=ორშ...6=შაბ
  start_time time,
  end_time time,
  break_start time,
  break_end time
);

create table appointments (
  id uuid primary key,
  client_id uuid references clients(id),
  service_id uuid references services(id),
  employee_id uuid references employees(id),
  branch_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  status text,           -- 'booked' | 'confirmed' | 'completed' | 'no_show' | 'cancelled'
  source text,           -- 'walk_in' | 'phone' | 'online' | 'whatsapp' | 'instagram'
  deposit_paid numeric(10,2),
  notes text
);
```

```typescript
// Online Booking Widget (embeddable):
// <script src="https://app.sawyobi-erp.ge/widget/booking?branch=xxx"></script>
// Step 1: Select service
// Step 2: Select staff (or "ნებისმიერი")
// Step 3: Pick date/time (available slots only)
// Step 4: Enter name + phone
// Step 5: Confirm + optional deposit payment
// → SMS/Viber confirmation + calendar invite (.ics)

// Staff Calendar View (/appointments/calendar):
// - Day/Week/Month view
// - Drag & drop reschedule
// - Color per service type
// - Gap detection (available slots)
// - No-show rate per client → flagging

// Reminder automation:
// - 24h before: Viber/SMS reminder
// - 2h before: final reminder
// - After appointment: rating request
// - No-show: auto-reschedule offer
```

---

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

```sql
-- მიწოდების მანქანები, კომპანიის ავტოპარკი
create table vehicles (
  id uuid primary key,
  branch_id uuid,
  plate_number text unique,
  make text, model text, year integer,
  type text,  -- 'van' | 'truck' | 'car' | 'motorcycle' | 'electric'
  fuel_type text, -- 'diesel' | 'petrol' | 'electric' | 'hybrid'
  tank_capacity_liters numeric(6,1),
  current_mileage integer,
  insurance_expiry date,
  technical_inspection_expiry date,
  assigned_driver_id uuid references employees(id),
  status text -- 'active' | 'maintenance' | 'retired'
);

create table fuel_logs (
  id uuid primary key,
  vehicle_id uuid references vehicles(id),
  driver_id uuid references employees(id),
  fuel_amount_liters numeric(6,2),
  fuel_cost numeric(10,2),
  mileage_at_fill integer,
  station_name text,
  receipt_photo_url text,
  created_at timestamptz
);

create table vehicle_maintenance (
  vehicle_id uuid,
  service_date date,
  service_type text,  -- 'oil_change' | 'tire' | 'annual' | 'repair'
  cost numeric(10,2),
  mileage integer,
  next_service_mileage integer,
  notes text
);
```

```typescript
// Fleet Dashboard (/fleet):
// - ყველა მანქანა: სტატუსი, მძღოლი, ბოლო ლოკაცია
// - Fuel cost per vehicle per month (Recharts)
// - Fuel efficiency: km/liter trend
// - Insurance/inspection expiry calendar
// - Maintenance due alerts

// Driver app integration:
// - Fuel receipt scan (camera → OCR → auto-fill)
// - Mileage input at start/end of shift
// - Damage report + photos

// Cost accounting:
// Fuel + maintenance → auto journal entry → expense category
// Cost per delivery calculation
// Fleet cost vs revenue ratio
```

---

## 📦 მოდული 31: SLA & Warranty Tracking

```sql
-- ტექნიკის, ელექტრონიკის, ავეჯის გამყიდველებისთვის
create table warranties (
  id uuid primary key,
  product_id uuid references products(id),
  transaction_item_id uuid,
  client_id uuid references clients(id),
  serial_number text,
  imei text,               -- ტელეფონებისთვის
  warranty_type text,      -- 'manufacturer' | 'store' | 'extended'
  start_date date,
  end_date date,
  status text,             -- 'active' | 'claimed' | 'expired' | 'void'
  notes text
);

create table warranty_claims (
  id uuid primary key,
  warranty_id uuid references warranties(id),
  claim_date date,
  issue_description text,
  resolution text,         -- 'repaired' | 'replaced' | 'refunded' | 'rejected'
  resolved_at date,
  technician_id uuid references employees(id),
  cost numeric(10,2),
  parts_used jsonb
);
```

```typescript
// POS Integration:
// After sale of warranted product →
// → prompt: enter serial number / IMEI
// → generate warranty card PDF (send via Viber)
// → client can check warranty status: /warranty-check (public)

// Service Center flow:
// Client arrives with broken device
// → lookup by phone/serial → warranty status check
// → create claim → assign technician
// → status updates → client SMS notifications
// → "მზადაა" → client notification

// Alerts:
// Warranties expiring in 30 days → client reminder: "გააგრძელე გარანტია"
// High claim rate on product X → alert procurement: "ხარვეზი ამ მოდელში"
```

---

## 📦 მოდული 32: Real Estate & Property Management

```sql
-- უძრავი ქონება: ოფისი, სავაჭრო ფართი, სტოქსი
create table properties_re (
  id uuid primary key,
  name text,
  type text,    -- 'office' | 'retail' | 'warehouse' | 'apartment' | 'land'
  address text,
  area_sqm numeric(10,2),
  floors integer,
  status text   -- 'owned' | 'leased' | 'for_rent' | 'for_sale'
);

create table leases (
  id uuid primary key,
  property_id uuid references properties_re(id),
  tenant_client_id uuid references clients(id),
  start_date date,
  end_date date,
  monthly_rent numeric(10,2),
  deposit numeric(10,2),
  payment_due_day integer,  -- e.g. 5 (ყოველი თვის 5-ში)
  status text,              -- 'active' | 'expired' | 'terminated'
  contract_url text
);

create table rent_payments (
  lease_id uuid references leases(id),
  period_month integer,
  period_year integer,
  amount numeric(10,2),
  paid_at timestamptz,
  payment_method text,
  late_fee numeric(10,2) default 0
);
```

```typescript
// Property Dashboard (/real-estate):
// - Portfolio view: owned vs leased
// - Occupancy rate: % rented
// - Monthly rental income chart
// - Lease expiry calendar (alert 90/60/30 days)
// - Maintenance requests per property

// Auto-billing:
// Cron job: generate rent invoice → send to tenant (email + Viber)
// If not paid by due date + 3 days → late fee + reminder
// Journal entry: rent income → accounting auto-post

// Expense tracking per property:
// Utilities, repairs, insurance, property tax
// → P&L per property
```

---

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

```typescript
// Public API (for 3rd party developers):
// Base URL: https://api.sawyobi-erp.ge/v1/
// Auth: API key per integration

// Endpoints:
// GET  /products          → product catalog
// POST /transactions      → create sale
// GET  /clients/{phone}   → client lookup
// POST /clients           → create client
// GET  /inventory         → stock levels
// POST /webhooks          → register webhook URL

// Webhook events:
// sale.completed, stock.low, client.created,
// payment.received, delivery.status_changed

// White-Label Option:
// Operators can rebrand: logo, colors, domain
// white_label_config table:
create table white_label_configs (
  tenant_id uuid,
  brand_name text,
  logo_url text,
  primary_color text,
  domain text,          -- 'erp.mycoffee.ge'
  favicon_url text,
  email_from_name text,
  sms_sender_name text, -- branded SMS sender
  features_enabled jsonb -- turn on/off modules
);

// SaaS Pricing (suggested tiers):
// Starter: 1 branch, 2 users, basic modules — 49 GEL/month
// Business: 3 branches, 10 users, all modules — 149 GEL/month
// Enterprise: unlimited, white-label, API access — custom
// Franchise: per-network pricing
```

---

## 📦 მოდული 35: TikTok Shop & Social Commerce

```typescript
// TikTok Shop API (fastest growing in Georgia):
// - Product catalog sync
// - Order import via webhook
// - Live shopping: inventory check during TikTok Live
// - Affiliate tracking: influencer → sale attribution

// Instagram Shopping:
// - Meta Catalog API → product sync
// - Story link → product page
// - DM auto-response: price + stock

// Facebook Marketplace:
// - Listing sync for B2C products

// Social Proof Widget:
// POS receipt footer: "შეგვაფასეთ Google-ზე" + QR
// → Google Business Profile review link
// Auto-request after purchase: Viber message (24h later)

// Influencer / Affiliate Module:
create table affiliates (
  id uuid primary key,
  client_id uuid references clients(id),
  code text unique,       -- "NINO20" → 20% off
  commission_pct numeric(5,2),
  total_referrals integer,
  total_commission_earned numeric(10,2)
);
-- Track: which sale came from which affiliate code
-- Monthly commission payout → journal entry
```

---

## 📦 მოდული 36: Smart Price Tag & Label Printing

```typescript
// Price Tag Designer (/labels/designer):
// - Drag & drop label template editor
// - Fields: product name, price, barcode, QR, image, promo tag
// - Sizes: 40×25mm, 58×40mm, A4 shelf strip, A5 poster
// - Bulk print: select multiple products → print all labels

// Triggers for reprinting:
// - Price change → flag products for label reprint
// - New products received → auto-generate label queue
// - Promotion start → "SALE" label batch

// Printer support:
// - Zebra / Brother label printer (USB)
// - Regular A4 (multiple per page)
// - Digital display (ESL — Electronic Shelf Label) future option

// Template library:
// - Standard price tag
// - Promotion tag (red, with old price strikethrough)
// - "New arrival" tag
// - "Best seller" tag
// - Expiry date tag (for perishables)
```

---

## 📦 მოდული 37: Crypto & Alternative Payments

```typescript
// Growing in Georgian market (especially Tbilisi tech scene):

// USDT / Bitcoin (via NOWPayments or Binance Pay):
create table crypto_payment_requests (
  id uuid primary key,
  transaction_id uuid references transactions(id),
  currency text,          -- 'USDT' | 'BTC' | 'ETH'
  amount_crypto numeric(20,8),
  amount_gel numeric(10,2),
  exchange_rate numeric(15,6),
  wallet_address text,
  payment_url text,
  status text,            -- 'pending' | 'confirmed' | 'expired'
  confirmed_at timestamptz
);

// Crypto Exchange Rate:
// Edge Function: fetch-crypto-rates (cron: every 5min)
// CoinGecko API → store in exchange_rates table

// Cash + Crypto combo:
// POS: partial crypto, partial GEL

// Why relevant for Georgia:
// - Crypto hub reputation (Bitfury, many miners)
// - Many freelancers paid in crypto
// - Tourist market (international visitors)
// - No crypto-specific regulation (flexible environment)
```

---

## 🧠 AI — გაფართოებული Suite

```typescript
// Document OCR & Processing:
// Upload: supplier invoice photo → Claude Vision API
// Extract: supplier name, date, items, amounts
// Auto-create: receiving order draft
// Human review: confirm → post to accounting

// Smart Search (everywhere):
// Ctrl+K → global search
// Natural language: "გასულ კვირას რა გაიყიდა ყველაზე მეტი?"
// Returns: products, clients, transactions, reports

// Predictive Reorder with ML:
// Not just stockout prediction, but:
// - Optimal order quantity (EOQ + safety stock)
// - Best day/time to order (supplier lead time + demand)
// - Multi-location rebalancing suggestion

// AI Pricing Suggestions:
// Analyze: competitor prices (web scraping), demand elasticity, margins
// Suggest: "ამ პროდუქტზე 5% ზრდა შემოსავალს +8% გაზრდის"

// Automated Financial Narrative:
// Monthly report → Claude API generates:
// "ოქტომბრის შედეგები: შემოსავალი 45,000 ₾ (+12% YoY).
//  ზრდის ძირითადი მამოძრავებელი: ახალი სერია..."
// → PDF-ში ჩართვა

// Fraud Detection:
// Unusual patterns:
// - Same card multiple times, different amounts
// - Employee discount abuse (too many manager overrides)
// - Return fraud (buy, return, repeat)
// → Flag + notify admin via Viber
```

---

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
// Library: cmdk (shadcn/ui-ში ჩაშენებული)

const COMMAND_EXAMPLES = [
  { input: "გაყიდე 2კგ შაქარი",     action: "openPOS + addProduct('შაქარი', 2)" },
  { input: "გუშინდელი მოგება",       action: "navigate('/reports/profit?date=yesterday')" },
  { input: "დაამატე ახალი კლიენტი",  action: "openModal('new-client')" },
  { input: "ახალი პროდუქტი",         action: "navigate('/products/new')" },
  { input: "მარაგის შემოწმება",      action: "navigate('/inventory/status')" },
  { input: "ინვენტარიზაცია",         action: "navigate('/inventory/count/new')" },
];

// Intent Parser (Edge Function: parse-command):
// 1. keyword matching — სწრაფი, offline
// 2. Claude API fallback — ბუნებრივი ენა, რთული ბრძანებები
// Return: { action, params, confidence }

// Global Context Awareness:
// POS-ზე → Ctrl+K → shortcuts: "გაყიდე X", "ფასდაკლება", "ახალი ცვლა"
// Reports-ზე → "ექსპორტი", "გაგზავნე email-ზე", "შედარება"
// Accounting-ზე → "ახალი გატარება", "ბალანსი", "VAT ანგარიში"

// Recent + Favorites: ბოლო 5 ბრძანება + pin-able per user
// Shift+? → full keyboard shortcut map
```

---

## 💎 მოდული 39: Advanced Financial Engine (Oris + Fina Killer)

### 39.1 Automated Double-Entry — სრული ავტომატიზაცია

```sql
-- ყოველი business event → ავტომატური journal entry
create table accounting_rules (
  id uuid primary key,
  event_type text,       -- 'sale' | 'purchase' | 'return' | 'expense' | 'salary' |
                         --  'asset_purchase' | 'depreciation' | 'bank_fee' | 'fx_revaluation'
  payment_method text,   -- 'cash' | 'card' | 'bank' | null (all)
  debit_account_code text references accounts(code),
  credit_account_code text references accounts(code),
  description_template text,
  active boolean default true
);

-- Default rules (Georgian accounting standard):
-- sale+cash:     DR 1010 (Cash)          CR 6110 (Revenue)
-- sale+card:     DR 1130 (Card receivable) CR 6110
-- sale+bank:     DR 1120 (Bank)           CR 6110
-- purchase:      DR 1310 (Inventory)      CR 5110 (AP)
-- expense+cash:  DR 7xxx (Expense)        CR 1010 (Cash)
-- salary:        DR 7210 (Salary exp)     CR 1120 (Bank)
-- depreciation:  DR 7410 (Depr exp)       CR 1610 (Acc depr)
-- return+cash:   DR 6110 (Revenue)        CR 1010 (Cash)

-- Auto-trigger on transaction insert:
create function auto_journal_entry() returns trigger as $$
declare
  rule accounting_rules%rowtype;
  entry_id uuid;
begin
  select * into rule from accounting_rules
    where event_type = NEW.event_type
      and (payment_method = NEW.payment_method or payment_method is null)
    limit 1;

  if rule.id is not null then
    insert into journal_entries (entry_date, description, reference, auto_generated)
    values (NEW.created_at::date,
            format(rule.description_template, NEW.*),
            NEW.id::text, true)
    returning id into entry_id;

    insert into journal_lines (entry_id, account_id, debit)
    values (entry_id,
            (select id from accounts where code = rule.debit_account_code),
            NEW.total_amount);

    insert into journal_lines (entry_id, account_id, credit)
    values (entry_id,
            (select id from accounts where code = rule.credit_account_code),
            NEW.total_amount);
  end if;
  return NEW;
end;
$$ language plpgsql;
```

### 39.2 Auto-Reconciliation Engine (AI-Powered)

```sql
create table bank_statement_lines (
  id uuid primary key,
  import_id uuid,
  transaction_date date,
  description text,           -- raw bank text
  amount numeric(15,2),
  direction text,             -- 'debit' | 'credit'
  reference text,
  match_status text,          -- 'auto_matched' | 'manual_matched' | 'unmatched' | 'ignored'
  matched_journal_entry_id uuid references journal_entries(id),
  match_confidence numeric(5,2),   -- 0-100%
  match_reason text
);
```

```typescript
// Edge Function: reconcile-bank-statement
// Scoring algorithm per bank line:
// +40 pts: exact amount match
// +25 pts: date within 2 days
// +20 pts: reference/description fuzzy match
// +15 pts: client/supplier name in description
// Score >= 75 → auto_matched
// Score 40-74 → suggest (human confirms)
// Score < 40  → unmatched (manual)
// Claude API for complex cases: "BOG ჩანაწერი: 'GORGIA DELIVERY' → find match"
// Target: 90%+ auto-match rate

// UI: /accounting/reconciliation
// - Drag & drop Excel import (BOG/TBC format)
// - Pie chart: matched/suggested/unmatched
// - Review table: bulk confirm or one-by-one
// - Export reconciliation report PDF
```

### 39.3 Multi-Currency Revaluation (NBG API)

```typescript
// Edge Function: month-end-revaluation (cron: last day 23:50)
// 1. Fetch NBG closing rates for all currencies
// 2. Find all non-GEL balances (receivables, payables, bank accounts)
// 3. Calculate: (current_rate - booking_rate) × amount
// 4. Auto journal entry:
//    Gain → DR Foreign Asset, CR FX Gain (8110)
//    Loss → DR FX Loss (7810), CR Foreign Asset
// 5. Notify accountant: "გადაფასება დასრულდა. FX სხვაობა: +1,240 GEL"
// Currencies: USD, EUR, GBP, RUB, TRY, AZN, AMD
```

### 39.4 Landed Cost Tracking

```sql
create table landed_cost_headers (
  id uuid primary key,
  receiving_order_id uuid references receiving_orders(id),
  base_product_cost numeric(15,2),
  freight_cost       numeric(15,2) default 0,
  customs_duty       numeric(15,2) default 0,
  customs_vat        numeric(15,2) default 0,
  insurance          numeric(15,2) default 0,
  handling_fee       numeric(15,2) default 0,
  other_costs        numeric(15,2) default 0,
  allocation_method  text,  -- 'weight' | 'value' | 'quantity' | 'equal'
  total_landed_cost  numeric(15,2) generated always as (
    base_product_cost + freight_cost + customs_duty +
    customs_vat + insurance + handling_fee + other_costs
  ) stored
);
-- Per product: allocated overhead → unit_landed_cost
-- Impact: accurate COGS, reliable margin reports
-- ASYCUDA integration: import customs declaration → auto-fill duties
```

---

## 💎 მოდული 40: Smart Inventory & Production (Apex Killer)

### 40.1 Production Flow Designer — Visual Drag & Drop

```typescript
// /manufacturing/flow-designer
// Library: React Flow (reactflow.dev)

// Node types:
// [raw_material] → [process_step] → [quality_check] → [finished_good]
//                                          ↓ fail
//                                      [waste / byproduct]

// Example flow:
// [მარცვალი 10კგ] → [დაფქვა 20წთ] → [QC] → [ფქვილი 8.5კგ]
//                                      ↓ fail → [ნარჩენი 0.5კგ]

// Each node has: duration, labor cost, machine, quality criteria
// Save flow → auto-generates bom_headers + bom_items
// Cost calculator: raw materials + labor + overhead = total cost/unit
// Version control: v1.0, v1.1, v2.0 — compare costs side by side
```

### 40.2 Recursive BOM + Waste Tracking

```sql
create table bom_headers (
  id uuid primary key,
  finished_product_id uuid references products(id),
  version text default '1.0',
  quantity_produced numeric(10,3),
  overhead_cost_per_batch numeric(10,2),
  parent_bom_id uuid references bom_headers(id)  -- sub-assemblies
);

create table bom_items (
  bom_id uuid references bom_headers(id),
  ingredient_id uuid references products(id),
  quantity numeric(10,4),
  unit text,
  waste_percentage numeric(5,2) default 0,
  effective_quantity numeric(10,4) generated always as (
    quantity * (1 + waste_percentage / 100.0)
  ) stored,
  is_sub_assembly boolean default false,
  sub_bom_id uuid references bom_headers(id)
);

-- Recursive cost function:
create function calculate_bom_cost(p_bom_id uuid) returns numeric as $$
-- Recursively sums: ingredient costs (or sub-BOM costs) + overhead
$$ language plpgsql;
-- Example: პური → ფქვილი → მარცვალი (3+ დონე) ✓
```

### 40.3 Dynamic Price Rules Engine

```sql
create table dynamic_price_rules (
  id uuid primary key,
  name text,
  trigger_event text,  -- 'cost_change' | 'stock_level' | 'competitor_price' | 'manual'
  condition jsonb,
  -- {"type": "cost_increase_pct", "threshold": 5}
  -- {"type": "stock_below", "qty": 10}  ← scarcity pricing
  action jsonb,
  -- {"type": "adjust_margin", "target_margin_pct": 30}
  -- {"type": "adjust_pct", "change_pct": 5}
  applies_to jsonb,    -- all | category_ids | product_ids
  requires_approval boolean default true,
  active boolean default true
);

create table price_change_log (
  product_id uuid, rule_id uuid,
  old_price numeric, new_price numeric, old_cost numeric,
  trigger_reason text,
  status text  -- 'pending_approval' | 'approved' | 'rejected' | 'auto_applied'
);
-- Admin sees: "12 პროდუქტის ფასი უნდა გაიზარდოს (თვითღ. +5%+)" → bulk approve
```

---

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
// Smart Mapping Engine — AI-powered supplier product recognition

create table supplier_product_mappings (
  supplier_id uuid references suppliers(id),
  supplier_product_name text,   -- as in RS.GE document
  supplier_product_code text,
  our_product_id uuid references products(id),
  confidence numeric(5,2),
  confirmed_by uuid,
  use_count integer default 1
);

// Algorithm: fuzzy match supplier name → our product
// 100% exact → auto-map
// 85%+ → suggest (1-click confirm)
// 60-85% → show 3 options
// < 60% → manual
// Learns from every confirmation → improves over time

// Full RS.GE Suite:
// 1. Fiscal receipts (ქვითარი)           ← already planned
// 2. Waybill import (ზედნადები შემოსვლა) ← NEW: auto receiving order
// 3. Waybill export (ზედნადები გასვლა)   ← NEW: branch transfers
// 4. VAT declaration auto-submit          ← NEW: monthly cron
// 5. Electronic invoice (ელ.ინვოისი)     ← NEW: send to B2B clients
// 6. Reverse charge VAT detection        ← NEW: imported services

// RS.GE Status Monitor (/integrations/rsge):
// All submitted docs with status + retry button
// Monthly stats: X ზედნადები, Y ქვითარი, Z DGF
// API downtime → fallback queue (retry when restored)
```

---

## 📊 Competition Killer — ანალიზი vs ქართული ბაზარი

```
ფუნქცია                      საწყობი ERP  Apex   Fina   Oris  Optimo
─────────────────────────────────────────────────────────────────────
Command Palette (Ctrl+K)          ✓        ✗      ✗      ✗      ✗
Auto Double-Entry                 ✓        ~      ✓      ~      ✗
AI Bank Reconciliation            ✓        ✗      ~      ✗      ✗
Landed Cost Tracking              ✓        ✗      ~      ✗      ✗
Multi-currency NBG Revaluation    ✓        ✗      ~      ✓      ✗
Visual Production Flow Designer   ✓        ✗      ✗      ✗      ✗
Recursive BOM (multi-level)       ✓        ~      ✗      ✗      ✗
Dynamic Price Rules (auto)        ✓        ✗      ✗      ✗      ✗
Soft Delete + Versioning          ✓        ✗      ✗      ✗      ✗
Offline Conflict Resolution       ✓        ✗      ✗      ✗      ✗
IP-Based Access Control           ✓        ✗      ✗      ✗      ✗
RS.GE Smart Mapping (AI)          ✓        ✗      ✗      ✗      ✗
RS.GE Full Suite (6 doc types)    ✓        ~      ~      ~      ~

✓ სრულად  ~ ნაწილობრივ  ✗ არ აქვს

Business impact:
→ Command Palette: UX 10x სწრაფი — კასიერი ფუნქციას პოულობს სეკუნდებში
→ Auto Reconciliation: ბუღალტრის დრო -80% ყოველთვიური bank match-ზე
→ Landed Cost: ზუსტი margin-ი იმპორტზე — გამოჭრის მოულოდნელ ზარალს
→ Production Flow: ვიზუალური BOM — ქარხნის დირექტორი პირველად ნახავს cost-ს
→ Soft Delete+Versioning: "ვინ შეცვალა ეს ფასი?" → tax audit-ზე ზუსტი პასუხი
→ RS.GE Smart Mapping: მიწოდებას 45წთ→5წთ ამოკითხვა
```

## 🏆 კონკურენტული უპირატესობა

```
საწყობი ERP vs ქართული ბაზარი (Apex, Fina, Optomo, Oris):

── ტექნოლოგია ──────────────────────────────────────────
✓ ერთადერთი PWA offline POS — ინტერნეტის გარეშეც მუშაობს
✓ ერთადერთი Real-time multi-device sync (Supabase Realtime)
✓ ერთადერთი Branch isolation (PostgreSQL RLS)
✓ ერთადერთი 2FA სავალდებულო admin-ებისთვის
✓ ერთადერთი სრული Audit Trail ყველა ცვლილებაზე

── AI & ავტომატიზაცია ──────────────────────────────────
✓ ერთადერთი AI-powered (Claude API integration)
✓ ერთადერთი ქართულ ენაზე AI Sales Assistant
✓ ერთადერთი AI Stock Forecasting + Anomaly Detection
✓ ერთადერთი AI Document OCR (ინვოისის ავტო-ამოკითხვა)
✓ ერთადერთი Fraud Detection სისტემა

── გაყიდვები & კლიენტი ─────────────────────────────────
✓ ერთადერთი Customer Display Screen (BroadcastChannel)
✓ ერთადერთი WhatsApp/Viber Chatbot (კლიენტის self-service)
✓ ერთადერთი Subscription Billing (subscription products)
✓ ერთადერთი Gift Cards + Vouchers სრული სისტემა
✓ ერთადერთი Gamification (leaderboard, badges)
✓ ერთადერთი Self-Checkout Kiosk support

── ინტეგრაციები (ქართული) ──────────────────────────────
✓ ყველაზე სრული RS.GE ავტომატიზაცია (ფისკ. + VAT + SSA)
✓ BOG QR + TBC Pay + KEEPZ + BNPL — ყველა ქართული გადახდა
✓ Extra.ge + MyMarket.ge + Facebook/Instagram Shop
✓ Gorgia + Sweeft courier integration
✓ NAPR TIN validation + NBG exchange rates

── სეგმენტები ──────────────────────────────────────────
✓ სასტუმრო / Hospitality (Booking.com, Airbnb integration)
✓ რესტორანი / KDS / Table Management
✓ წარმოება / BOM / Manufacturing
✓ ფრანჩაიზი / Franchise Network Management
✓ Appointment Booking (სალონი, კლინიკა)
✓ Real Estate / Lease Management
✓ Fleet & Fuel Management

── ბიზნეს-მოდელი ───────────────────────────────────────
✓ White-Label option (სხვები შენი სისტემით)
✓ Public API + Webhook marketplace
✓ SaaS Pricing: Starter / Business / Enterprise / Franchise
✓ Carbon/ESG Tracker (ევროპული სტანდარტი)

სულ: 37 მოდული · 200+ ფუნქცია · ყველაფერი ერთ პლატფორმაში
```

---

**კონტაქტი:** +995 500 05 75 27
**სტატუსი:** აქტიური განვითარება
**ტექ. სტეკი:** React 18 + TypeScript + Vite + Supabase + Tailwind + Framer Motion
