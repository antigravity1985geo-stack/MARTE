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
# 🚀 ᲤᲐᲖᲐ 2 — POS + საწყობი + ბუღალტერია (კვ. 3-4)
## ახლა განახორციელე მხოლოდ ეს მოდულები:
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

---
## ✅ ფაზა 2 დასრულების კრიტერიუმები:
- [ ] POS: BOG QR + TBC Pay ინტეგრაცია
- [ ] POS: Customer Display Screen (BroadcastChannel)
- [ ] POS: Offline Queue (IndexedDB + Background Sync)
- [ ] Barcode scan: USB + camera
- [ ] საწყობი: FIFO/LIFO სრულად
- [ ] საწყობი: Multi-warehouse transfers
- [ ] ბუღ: Auto double-entry rules (accounting_rules table)
- [ ] ბუღ: Auto-reconciliation UI + import
- [ ] ბუღ: Landed Cost module
- [ ] ბუღ: NBG multi-currency revaluation (cron)
