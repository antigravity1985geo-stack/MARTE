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
# 🚀 ᲤᲐᲖᲐ 4 — AI + BI + Analytics (კვ. 7-8)
## ახლა განახორციელე მხოლოდ ეს მოდულები:
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

---
## ✅ ფაზა 4 დასრულების კრიტერიუმები:
- [ ] AI Stock Forecasting Edge Function (cron: daily)
- [ ] AI Sales Assistant (ქართულ ენაზე, Claude API)
- [ ] Anomaly Detection (cron: hourly)
- [ ] Executive BI Dashboard (admin only)
- [ ] ABC + Basket analysis views
- [ ] Customer LTV view
- [ ] Command Palette (Ctrl+K) — ქართული ბრძანებები
- [ ] AI Document OCR (ინვოისი → receiving order)
- [ ] Fraud Detection alerts
