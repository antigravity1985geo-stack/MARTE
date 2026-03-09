# Architecture Deep Dive - საწყობი ERP

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React PWA)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   POS    │  │  Stock   │  │Accounting│  │   CRM    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           State Management (Zustand)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                        │
        ┌───────▼────────┐      ┌───────▼────────┐
        │  LocalStorage  │      │   Supabase     │
        │  (Temporary)   │      │  (Not enabled) │
        └────────────────┘      └────────────────┘
                                         │
                        ┌────────────────┼────────────────┐
                        │                │                │
                ┌───────▼──────┐ ┌──────▼─────┐ ┌───────▼──────┐
                │  PostgreSQL  │ │   Auth     │ │   Storage    │
                └──────────────┘ └────────────┘ └──────────────┘
                                         │
                                ┌────────┴────────┐
                                │  Edge Functions │
                                │  - RS.GE Proxy  │
                                │  - Email Send   │
                                └─────────────────┘
```

---

## 🗄️ Data Flow Architecture

### Current Flow (LocalStorage-based)

```
User Action → Component → Zustand Store → LocalStorage → Re-render
```

**Problems:**
- 5-10MB storage limit
- No multi-user sync
- No server-side validation
- Data loss on browser clear
- No audit trail

### Recommended Flow (Supabase-based)

```
User Action → Component → Zustand Store ──┐
                                           │
                                           ▼
┌─────────────────────────────────────────────────────┐
│                  Supabase Client                     │
│  - Authentication                                    │
│  - Real-time subscriptions                          │
│  - Row Level Security                               │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL Database                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ products │  │  sales   │  │ accounts │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│         RLS Policies + Triggers                     │
└─────────────────────────────────────────────────────┘
                │
                ▼
         Updates → Re-render
```

---

## 📊 Database Schema (Planned)

### Core Tables

#### 1. Products
```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  barcode text unique,
  category_id uuid references categories(id),
  price numeric(10,2) not null,
  cost numeric(10,2),
  stock_quantity integer default 0,
  min_stock_level integer default 0,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- RLS
alter table products enable row level security;
create policy "Users can view products" on products for select using (true);
create policy "Only admins can modify" on products for all 
  using (public.has_role(auth.uid(), 'admin'));
```

#### 2. Categories
```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  created_at timestamptz default now()
);
```

#### 3. Transactions (Sales)
```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date timestamptz default now(),
  total_amount numeric(10,2) not null,
  payment_method text check (payment_method in ('cash', 'card', 'bank')),
  cashier_id uuid references auth.users(id),
  client_id uuid references clients(id),
  status text default 'completed',
  receipt_number text unique,
  created_at timestamptz default now()
);

create table transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null,
  unit_price numeric(10,2) not null,
  total numeric(10,2) generated always as (quantity * unit_price) stored
);
```

#### 4. Accounting (Double-Entry)
```sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  type text check (type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  balance numeric(15,2) default 0,
  parent_account_id uuid references accounts(id)
);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  description text,
  reference text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references journal_entries(id) on delete cascade,
  account_id uuid references accounts(id),
  debit numeric(15,2) default 0,
  credit numeric(15,2) default 0,
  check (debit >= 0 and credit >= 0),
  check (not (debit > 0 and credit > 0)) -- can't be both
);

-- Trigger to validate balanced entries
create function validate_journal_entry()
returns trigger as $$
begin
  if (select sum(debit) - sum(credit) from journal_lines where entry_id = NEW.entry_id) != 0 then
    raise exception 'Journal entry must balance';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger check_balance
  after insert or update on journal_lines
  for each row execute function validate_journal_entry();
```

#### 5. User Roles (CRITICAL)
```sql
create type app_role as enum ('admin', 'senior_cashier', 'warehouse_manager', 'cashier');

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role app_role not null,
  assigned_at timestamptz default now(),
  assigned_by uuid references auth.users(id),
  unique(user_id, role)
);

-- Security definer function (bypasses RLS)
create or replace function has_role(user_id uuid, required_role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_roles.user_id = $1
    and user_roles.role = $2
  );
$$;
```

#### 6. Activity Logs (Audit Trail)
```sql
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

-- Generic audit trigger
create function log_activity()
returns trigger as $$
begin
  insert into activity_logs (user_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  return NEW;
end;
$$ language plpgsql;

-- Apply to sensitive tables
create trigger products_audit after insert or update or delete on products
  for each row execute function log_activity();
```

---

## 🔐 Security Architecture

### Row Level Security (RLS) Strategy

```sql
-- Pattern 1: Public read, role-based write
create policy "public_read" on products for select using (true);
create policy "admin_write" on products for all 
  using (has_role(auth.uid(), 'admin'));

-- Pattern 2: User owns data
create policy "own_data" on employee_attendance for select
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'));

-- Pattern 3: Multi-tenant (branches)
create policy "branch_isolation" on transactions for select
  using (
    branch_id in (
      select branch_id from user_branches where user_id = auth.uid()
    )
  );
```

### Authentication Flow

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Get user role
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id);

// Store in Zustand
useAuthStore.setState({ user, roles });

// Protect routes
if (!hasRole('admin')) {
  navigate('/access-denied');
}
```

---

## 🎯 State Management Architecture

### Zustand Stores

#### 1. useStore (Products, Categories, Sales)
```typescript
interface StoreState {
  products: Product[];
  categories: Category[];
  transactions: Transaction[];
  
  // Actions
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Async actions (with Supabase)
  fetchProducts: () => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
}

// With Supabase
const useStore = create<StoreState>((set, get) => ({
  products: [],
  
  fetchProducts: async () => {
    const { data } = await supabase.from('products').select('*');
    set({ products: data });
  },
  
  saveProduct: async (product) => {
    const { data } = await supabase.from('products').insert(product);
    set(state => ({ products: [...state.products, data] }));
  }
}));
```

#### 2. useAccountingStore (Double-Entry)
```typescript
interface AccountingState {
  accounts: Account[];
  journalEntries: JournalEntry[];
  
  addEntry: (entry: JournalEntry) => void;
  getTrialBalance: () => TrialBalance[];
  getProfitLoss: () => { revenue: number; expenses: number; netIncome: number };
}

// Critical: Must maintain accounting equation A = L + E
```

#### 3. useAuthStore (Authentication)
```typescript
interface AuthState {
  user: User | null;
  roles: string[];
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}
```

---

## 🔄 Real-time Updates

### Supabase Subscriptions

```typescript
// Subscribe to products table
useEffect(() => {
  const subscription = supabase
    .channel('products-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'products' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          useStore.getState().addProduct(payload.new);
        } else if (payload.eventType === 'UPDATE') {
          useStore.getState().updateProduct(payload.new.id, payload.new);
        } else if (payload.eventType === 'DELETE') {
          useStore.getState().deleteProduct(payload.old.id);
        }
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

---

## 📱 PWA Architecture

### Service Worker Strategy

```javascript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxAgeSeconds: 300 } // 5 min
        }
      },
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'image-cache',
          expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } // 30 days
        }
      }
    ]
  }
})
```

### Offline Queue

```typescript
// Queue failed requests when offline
class OfflineQueue {
  private queue: Request[] = [];
  
  add(request: Request) {
    this.queue.push(request);
    localStorage.setItem('offline-queue', JSON.stringify(this.queue));
  }
  
  async flush() {
    for (const request of this.queue) {
      await fetch(request);
    }
    this.queue = [];
    localStorage.removeItem('offline-queue');
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)
```typescript
// src/test/accounting.test.ts
describe('Accounting Store', () => {
  it('should maintain accounting equation', () => {
    const store = useAccountingStore.getState();
    
    store.addEntry({
      date: '2024-01-01',
      description: 'Initial capital',
      debitAccount: '1000', // Cash
      creditAccount: '3000', // Equity
      amount: 10000
    });
    
    const tb = store.getTrialBalance();
    const totalDebit = tb.reduce((s, a) => s + a.debit, 0);
    const totalCredit = tb.reduce((s, a) => s + a.credit, 0);
    
    expect(totalDebit).toBe(totalCredit);
  });
});
```

### Integration Tests
```typescript
// Test Supabase integration
describe('Products API', () => {
  it('should create product with RLS', async () => {
    const { data, error } = await supabase
      .from('products')
      .insert({ name: 'Test Product', price: 10 })
      .select();
    
    expect(error).toBeNull();
    expect(data[0].name).toBe('Test Product');
  });
});
```

---

## 🚀 Performance Optimization

### Code Splitting
```typescript
// Lazy load pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AccountingPage = lazy(() => import('./pages/AccountingPage'));
```

### Memoization
```typescript
// Expensive calculations
const trialBalance = useMemo(() => {
  return calculateTrialBalance(accounts, journalEntries);
}, [accounts, journalEntries]);
```

### Virtual Scrolling
```typescript
// For large product lists
import { useVirtualizer } from '@tanstack/react-virtual';
```

---

## 📊 Monitoring & Logging

### Error Tracking
```typescript
// Integrate Sentry
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

### Analytics
```typescript
// Track critical events
analytics.track('sale_completed', {
  amount: 1500,
  payment_method: 'card',
  cashier_id: user.id
});
```

---

## 🔧 Development Workflow

### Environment Variables
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Build Pipeline
```bash
npm run dev        # Development with HMR
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run tests
```

---

**End of Architecture Document**
