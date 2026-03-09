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
# 🚀 ᲤᲐᲖᲐ 1 — FOUNDATION (კვ. 1-2)
## ახლა განახორციელე მხოლოდ ეს:
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

## 🔒 მოდული 43: Database Integrity — ERP-ის ფუნდამენტი

> **პრინციპი:** ფინანსური სისტემა, რომელიც ACID-ს არ იცავს, სასაქონლო მეურნეობა კი არა, სახლის ბიუჯეტსაც ვერ გაუძღვება. ეს წესები სავალდებულოა.

---

### 43.1 ACID Compliance — ატომური ფინანსური ტრანზაქციები

```sql
-- პრობლემა რასაც ვხედავთ სუსტ სისტემებში:
-- 1. გაყიდვა ჩაიწერა ✓
-- 2. მარაგი ჩამოიჭრა ✗ (error!)
-- 3. ბუღ. გატარება ✗ (never reached)
-- შედეგი: გაყიდვა არის, მარაგი არ ჩამოჭრილა, ბუღალტერია არ ემთხვევა.
-- ეს კატასტროფაა ERP-ისთვის.

-- გადაწყვეტა: ყველა operation ერთ BEGIN...COMMIT ბლოკში

-- Supabase RPC function (Edge-ზე კი არა, DB-ზე პირდაპირ):
create or replace function process_sale(
  p_cart        jsonb,   -- [{"product_id": "...", "qty": 2, "price": 5.50}, ...]
  p_payment     text,    -- 'cash' | 'card' | 'bank'
  p_client_id   uuid,
  p_cashier_id  uuid,
  p_branch_id   uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_transaction_id  uuid;
  v_entry_id        uuid;
  v_total           numeric(15,2) := 0;
  v_item            jsonb;
  v_product         record;
  v_debit_account   text;
  v_result          jsonb;
begin
  -- ══════════════════════════════════════════════
  -- ყველაფერი ერთ ატომურ ბლოკში — ან ყველა, ან არცერთი
  -- ══════════════════════════════════════════════

  -- STEP 1: ვთვლით ჯამს + ვამოწმებთ მარაგს
  for v_item in select * from jsonb_array_elements(p_cart) loop
    select * into v_product
    from products
    where id = (v_item->>'product_id')::uuid
    for update; -- ROW LOCK — სხვა ტრანზაქცია ვერ შეეხება ამ პროდუქტს

    -- მარაგის შემოწმება
    if v_product.stock_quantity < (v_item->>'qty')::integer then
      raise exception 'INSUFFICIENT_STOCK: product_id=%, available=%, requested=%',
        v_product.id, v_product.stock_quantity, v_item->>'qty';
    end if;

    v_total := v_total + ((v_item->>'qty')::numeric * (v_item->>'price')::numeric);
  end loop;

  -- STEP 2: ტრანზაქცია
  insert into transactions (
    total_amount, payment_method, cashier_id,
    client_id, branch_id, status
  )
  values (v_total, p_payment, p_cashier_id, p_client_id, p_branch_id, 'completed')
  returning id into v_transaction_id;

  -- STEP 3: transaction_items + მარაგის ჩამოჭრა
  for v_item in select * from jsonb_array_elements(p_cart) loop
    -- line item
    insert into transaction_items (transaction_id, product_id, quantity, unit_price)
    values (
      v_transaction_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'qty')::integer,
      (v_item->>'price')::numeric
    );

    -- მარაგი ჩამოიჭარ (atomic update)
    update products
    set stock_quantity = stock_quantity - (v_item->>'qty')::integer,
        updated_at     = now()
    where id = (v_item->>'product_id')::uuid;
  end loop;

  -- STEP 4: ბუღალტრული გატარება
  select code into v_debit_account
  from accounts
  where code = case p_payment
    when 'cash' then '1010'
    when 'card' then '1130'
    when 'bank' then '1120'
    else '1010'
  end;

  insert into journal_entries (entry_date, description, reference, auto_generated)
  values (now()::date, 'გაყიდვა #' || v_transaction_id, v_transaction_id::text, true)
  returning id into v_entry_id;

  insert into journal_lines (entry_id, account_id, debit, credit) values
    (v_entry_id, (select id from accounts where code = v_debit_account), v_total, 0),
    (v_entry_id, (select id from accounts where code = '6110'), 0, v_total);

  -- STEP 5: COGS entry (Cost of Goods Sold)
  insert into journal_lines (entry_id, account_id, debit, credit)
  select
    v_entry_id,
    (select id from accounts where code = '5010'),  -- DR COGS
    sum(ti.quantity * p.cost_price), 0
  from transaction_items ti
  join products p on p.id = ti.product_id
  where ti.transaction_id = v_transaction_id;

  insert into journal_lines (entry_id, account_id, debit, credit)
  select
    v_entry_id,
    (select id from accounts where code = '1310'),  -- CR Inventory
    0, sum(ti.quantity * p.cost_price)
  from transaction_items ti
  join products p on p.id = ti.product_id
  where ti.transaction_id = v_transaction_id;

  -- STEP 6: Loyalty points (თუ კლიენტია)
  if p_client_id is not null then
    insert into loyalty_points (client_id, transaction_id, points_earned, balance)
    values (
      p_client_id, v_transaction_id,
      floor(v_total),  -- 1 ქულა = 1 ₾
      (select coalesce(sum(points_earned - points_spent), 0)
       from loyalty_points where client_id = p_client_id) + floor(v_total)
    );
  end if;

  -- STEP 7: RS.GE fiscal queue
  insert into rsge_fiscal_queue (transaction_id, status)
  values (v_transaction_id, 'pending');

  -- ══════════════════════════════════════════════
  -- თუ ნებისმიერი step ჩავარდა → ROLLBACK ყველაფერი
  -- მომხმარებელი ხედავს error-ს, არაფერი ნახევრად არ ჩაიწერება
  -- ══════════════════════════════════════════════

  v_result := jsonb_build_object(
    'success',        true,
    'transaction_id', v_transaction_id,
    'total',          v_total,
    'journal_entry',  v_entry_id
  );

  return v_result;

exception
  when others then
    -- Postgres ავტომატურად აკეთებს ROLLBACK
    return jsonb_build_object(
      'success', false,
      'error',   sqlerrm,
      'detail',  sqlstate
    );
end;
$$;
```

```typescript
// Frontend-ზე გამოყენება:
const { data, error } = await supabase.rpc('process_sale', {
  p_cart:       cartItems,
  p_payment:    paymentMethod,
  p_client_id:  selectedClient?.id ?? null,
  p_cashier_id: currentUser.id,
  p_branch_id:  currentBranch.id,
});

if (!data.success) {
  if (data.error.includes('INSUFFICIENT_STOCK')) {
    toast.error('მარაგი არ არის საკმარისი!');
  } else {
    toast.error('გაყიდვა ვერ შესრულდა: ' + data.error);
  }
  return; // არაფერი ჩაწერილა DB-ში
}

toast.success(`გაყიდვა #${data.transaction_id} დასრულდა ✓`);
// ასევე ანალოგიური RPC functions:
// process_return()    → დაბრუნება (ატომური)
// process_receiving() → მომწოდებლიდან მიღება (ატომური)
// process_transfer()  → საწყობებს შორის გადაცემა (ატომური)
```

---

### 43.2 Trigger-Based Auditing — SQL დონეზე

```sql
-- სრული Audit Trail — ყველა ცვლილება ავტომატურად
-- (ადამიანური ფაქტორი გამოკლებულია — კოდი ვერ "დაავიწყდება" log-ის ჩაწერა)

create table audit_log (
  id           bigserial primary key,  -- bigserial: სწრაფი insert, არა uuid
  table_name   text        not null,
  record_id    uuid        not null,
  operation    text        not null,   -- 'INSERT' | 'UPDATE' | 'DELETE'
  old_data     jsonb,                  -- NULL INSERT-ზე
  new_data     jsonb,                  -- NULL DELETE-ზე
  changed_by   uuid        references auth.users(id),
  changed_at   timestamptz not null default now(),
  ip_address   inet,
  user_agent   text,
  branch_id    uuid
);

-- Index for fast queries: "ვინ შეცვალა პროდუქტი X?"
create index idx_audit_record  on audit_log(table_name, record_id, changed_at desc);
create index idx_audit_user    on audit_log(changed_by, changed_at desc);
create index idx_audit_table   on audit_log(table_name, changed_at desc);

-- Generic trigger function (ერთი ფუნქცია ყველა ცხრილისთვის):
create or replace function fn_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (
    table_name, record_id, operation,
    old_data,   new_data,
    changed_by, ip_address, user_agent, branch_id
  )
  values (
    TG_TABLE_NAME,
    coalesce((NEW).id, (OLD).id),
    TG_OP,
    case TG_OP when 'INSERT' then null else to_jsonb(OLD) end,
    case TG_OP when 'DELETE' then null else to_jsonb(NEW) end,
    auth.uid(),
    (current_setting('request.headers', true)::jsonb->>'x-real-ip')::inet,
    current_setting('request.headers', true)::jsonb->>'user-agent',
    coalesce((NEW).branch_id, (OLD).branch_id)
  );
  return coalesce(NEW, OLD);
end;
$$;

-- Apply to ALL sensitive tables (one-liner per table):
create trigger audit_products
  after insert or update or delete on products
  for each row execute function fn_audit_trigger();

create trigger audit_transactions
  after insert or update or delete on transactions
  for each row execute function fn_audit_trigger();

create trigger audit_journal_entries
  after insert or update or delete on journal_entries
  for each row execute function fn_audit_trigger();

create trigger audit_journal_lines
  after insert or update or delete on journal_lines
  for each row execute function fn_audit_trigger();

create trigger audit_clients
  after insert or update or delete on clients
  for each row execute function fn_audit_trigger();

create trigger audit_user_roles
  after insert or update or delete on user_roles
  for each row execute function fn_audit_trigger();

create trigger audit_price_rules
  after insert or update or delete on dynamic_price_rules
  for each row execute function fn_audit_trigger();

create trigger audit_employees
  after insert or update or delete on employees
  for each row execute function fn_audit_trigger();

-- Audit Viewer UI (/admin/audit-log):
-- Filter: table | user | date range | operation (INSERT/UPDATE/DELETE)
-- Diff view: old_data vs new_data — highlighted changes
-- "ვინ შეცვალა ეს პროდუქტის ფასი?" → 1 click
-- Export: CSV/PDF for tax authority
```

---

### 43.3 Strict Typing — ფინანსური სიზუსტე

```sql
-- ❌ WRONG — ასე არ შეიძლება ფინანსურ სისტემაში:
amount jsonb   -- "5.1000000000001" — floating point hell
price  float8  -- IEEE 754 binary float — კარგავს სიზუსტეს

-- ✅ CORRECT — ყველა ფინანსური column:
-- NUMERIC(precision, scale) = exact decimal arithmetic

-- ფასები და თანხები:
price           numeric(12, 2),   -- 9,999,999,999.99 — max price
cost_price      numeric(12, 4),   -- 4 decimal for cost (FIFO precision)
total_amount    numeric(15, 2),   -- transaction total
balance         numeric(15, 2),   -- account balance

-- საბუღალტრო:
debit           numeric(15, 4),   -- journal line (4 decimal for FX)
credit          numeric(15, 4),
exchange_rate   numeric(10, 6),   -- FX rate (e.g. 2.654321)

-- მარაგი:
stock_quantity  numeric(12, 3),   -- 3 decimal: kg, liters, etc.
waste_pct       numeric(5, 2),    -- 0.00 - 100.00

-- პროცენტები:
discount_pct    numeric(5, 2),    -- 0.00 - 100.00
vat_rate        numeric(5, 2),    -- 18.00, 0.00
margin_pct      numeric(7, 4),    -- more precise for analytics

-- JSONB მხოლოდ ამისთვის (არა ფინანსური მონაცემი):
amenities       jsonb,   -- ["wifi", "tv"]     ✓ feature flags
metadata        jsonb,   -- {"color": "red"}   ✓ flexible attributes
condition       jsonb,   -- rule engine config ✓ dynamic config
-- ❌ არასოდეს: amount jsonb, price jsonb, balance jsonb

-- CHECK constraints — DB დონეზე ვალიდაცია:
alter table products
  add constraint chk_price_positive    check (price >= 0),
  add constraint chk_cost_positive     check (cost_price >= 0),
  add constraint chk_stock_non_neg     check (stock_quantity >= 0);

alter table journal_lines
  add constraint chk_debit_non_neg     check (debit >= 0),
  add constraint chk_credit_non_neg    check (credit >= 0),
  add constraint chk_not_both_nonzero  check (not (debit > 0 and credit > 0));

alter table transactions
  add constraint chk_total_positive    check (total_amount > 0),
  add constraint chk_payment_method    check (payment_method in
    ('cash','card','bank','qr_bog','qr_tbc','keepz','bnpl','gift_card','crypto','mixed'));

alter table loyalty_points
  add constraint chk_balance_non_neg   check (balance >= 0);
```

---

### 43.4 Advisory Locks — Race Condition-ის თავიდან აცილება

```sql
-- პრობლემა (real scenario):
-- მაღაზიაში 2 POS ტერმინალი, ბოლო 1 ბოთლი ღვინო.
-- ორივე კასიერი ერთდროულად ასკენებს — ორივეს stock=1 ჩანს.
-- ორივე ასრულებს გაყიდვას → stock = -1. კატასტროფა.

-- PostgreSQL Advisory Locks — "მე ამ პროდუქტს ვამუშავებ, დაიცადე":

create or replace function acquire_product_lock(p_product_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_lock_id bigint;
begin
  -- UUID → bigint (advisory lock საჭიროებს bigint key)
  v_lock_id := ('x' || left(replace(p_product_id::text, '-', ''), 15))::bit(60)::bigint;

  -- pg_try_advisory_xact_lock: ტრანზაქციის ბოლოს ავტომატურად იხსნება
  -- true = lock მივიღე, false = სხვა ტრანზაქცია ფლობს lock-ს
  return pg_try_advisory_xact_lock(v_lock_id);
end;
$$;

-- გამოყენება process_sale-ში:
create or replace function process_sale(p_cart jsonb, ...)
returns jsonb
language plpgsql
as $$
declare
  v_item jsonb;
begin
  -- STEP 0: Advisory Lock ყველა პროდუქტზე კალათაში
  for v_item in select * from jsonb_array_elements(p_cart) loop
    if not acquire_product_lock((v_item->>'product_id')::uuid) then
      -- სხვა POS ტერმინალი ამ პროდუქტს ამუშავებს ახლა
      raise exception 'PRODUCT_LOCKED: product_id=% — სცადეთ ხელახლა',
        v_item->>'product_id';
    end if;
  end loop;

