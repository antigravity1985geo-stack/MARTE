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
# 🚀 ᲤᲐᲖᲐ 6 — გაფართოებული მოდულები (კვ. 11-12)
## ახლა განახორციელე მხოლოდ ეს მოდულები:
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

---
## ✅ ფაზა 6 დასრულების კრიტერიუმები:
- [ ] Hotel module: rooms + reservations + charges
- [ ] Booking.com/Airbnb iCal sync
- [ ] Restaurant: floor plan + KDS + waiter tablet
- [ ] Table reservations + SMS reminder
- [ ] Franchise: HQ dashboard + royalty billing
- [ ] Appointment booking widget (embeddable)
- [ ] Fleet: fuel log + maintenance alerts
- [ ] ESG/Carbon tracker dashboard
