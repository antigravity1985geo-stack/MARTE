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
# 🚀 ᲤᲐᲖᲐ 5 — ქართული ინტეგრაციები (კვ. 9-10)
## ახლა განახორციელე მხოლოდ ეს მოდულები:
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


---

## 🔒 მოდული 43: Database Integrity — ERP-ის ფუნდამენტი

---
## ✅ ფაზა 5 დასრულების კრიტერიუმები:
- [ ] BOG QR + TBC Pay სრულად (webhook confirm)
- [ ] KEEPZ + BNPL (Space/Credo)
- [ ] RS.GE: ფისკ. + ზედნადები + VAT declaration
- [ ] RS.GE Smart Mapping (AI fuzzy match)
- [ ] NAPR TIN validation
- [ ] SSA salary report export
- [ ] Gorgia + Sweeft courier integration
- [ ] WhatsApp/Viber Chatbot (client self-service)
- [ ] NBG exchange rates auto-import
