# საწყობი ERP - სრული პროექტის დოკუმენტაცია

## 📋 პროექტის მიმოხილვა

**საწყობი ERP** არის სრულფუნქციური საწარმოო საწარმოს მართვის სისტემა (ERP), რომელიც შექმნილია React + TypeScript + Vite-ზე დაფუძნებული PWA აპლიკაციად. სისტემა გამიზნულია მაღაზიებისა და საწარმოების სრული ციკლის მართვისთვის - საწყობი → გაყიდვები → ბუღალტერია → HR → CRM.

### ტექნოლოგიური სტეკი

**Frontend:**
- ⚛️ React 18.3.1 + TypeScript
- ⚡ Vite (build tool)
- 🎨 Tailwind CSS (utility-first CSS)
- 🎭 Framer Motion (animations)
- 📱 PWA (Progressive Web App) - offline support
- 🧭 React Router v6 (navigation)
- 🎯 Zustand (state management)
- 📊 Recharts (data visualization)

**UI Components:**
- Radix UI (accessible primitives)
- shadcn/ui (component library)
- Lucide React (icons)
- Sonner (toast notifications)

**Backend & Database:**
- 🔥 Supabase integration (Auth, Database, Edge Functions)
- 💾 LocalStorage (partially phased out)
- 📡 Real-time notifications support

**Business Logic:**
- jsPDF + jsPDF-AutoTable (PDF generation)
- XLSX (Excel export/import)
- html5-qrcode (barcode scanning)
- react-barcode (barcode generation)
- QRCode.react (QR code generation)

---

## 🏗️ არქიტექტურა

### Folder Structure

```
src/
├── components/          # UI კომპონენტები
│   ├── ui/             # shadcn/ui base components
│   ├── pos/            # POS-specific components
│   └── *.tsx           # shared components
├── pages/              # Route pages (30+ გვერდი)
├── hooks/              # Custom React hooks
├── stores/             # Zustand state management
├── lib/                # Utility functions
└── integrations/       # Third-party integrations

sql/                    # Supabase migration files (not yet applied)
supabase/functions/     # Edge functions
public/                 # Static assets
```

### Design System

**Color Palette:**
- Primary: `hsl(162 72% 38%)` - teal/emerald
- Success: `hsl(152 69% 40%)` - green
- Warning: `hsl(38 92% 50%)` - orange
- Destructive: `hsl(4 76% 54%)` - red
- Info: `hsl(210 92% 45%)` - blue

**Typography:**
- Sans: Inter (modern, readable)
- Mono: JetBrains Mono (code, numbers)

**Components:**
- Semantic design tokens (CSS variables)
- Dark mode support
- Responsive breakpoints
- Accessibility-first

---

## 📦 დანერგილი მოდულები (30+)

### ✅ სრულად რეალიზებული

#### 1. **Dashboard (მთავარი)**
- 📊 Real-time KPI widgets
- 📈 Hourly sales chart (Recharts)
- 🏪 Multi-channel analytics (Glovo, Wolt, Extra.ge)
- 👥 CRM metrics (VIP customers, at-risk clients)
- 📅 Attendance gauge (SVG circular indicator)
- 📦 Stock status breakdown
- 🎨 Animated stat cards with framer-motion

#### 2. **POS სისტემა (Monitor)**
- 🛒 Product grid with search & categories
- 🛍️ Shopping cart with quantity controls
- 💳 Payment dialog (cash, card, coupon support)
- 🎫 Barcode scanning (html5-qrcode)
- 📱 Mobile-optimized cart drawer
- 🔄 Shift management (open/close shift)
- 📜 Sales history
- ⌨️ Keyboard shortcuts (F1-F4, Esc, Enter)
- 🖨️ Receipt generation

#### 3. **პროდუქტები (Products)**
- ✏️ CRUD operations
- 🏷️ Category assignment
- 💰 Price management
- 📊 Stock tracking
- 🔍 Search & filter
- 🔢 Barcode generation (react-barcode)
- 📸 Image upload support
- ⚠️ Low stock alerts

#### 4. **კატეგორიები (Categories)**
- 📂 Category management
- 🎨 Color coding
- 🔢 Product count
- 🗑️ Swipe to delete (mobile)

#### 5. **ბუღალტერია (Accounting)**
- 📚 Chart of Accounts (ანგარიშთა გეგმა)
- 📝 Journal entries (double-entry system)
- ⚖️ Trial balance (საცდელი ბალანსი)
- 📊 Profit & Loss statement
- 🧾 VAT registry
- 📄 PDF export (jsPDF)
- 📊 Excel export (XLSX)
- 🎨 Premium UI with gradient cards
- 💎 Animated sections

#### 6. **ფინანსური ანგარიშგება (Cash Flow)**
- 💰 Balance sheet (აქტივები, ვალდებულებები, კაპიტალი)
- 💵 Cash flow statement
- 🏦 Cash & bank balances
- ✅ Accounting equation validation (A = L + E)
- 📊 Operating activities tracking
- 📋 Recent journal entries
- 🎨 Premium financial UI

#### 7. **სახელმძღვანელო (Guide)**
- 🚀 Quick start tutorial
- 📖 Module catalog (30+ modules)
- 🔐 RBAC matrix (4 roles)
- ⌨️ Keyboard shortcuts
- ❓ FAQ accordion
- 🔍 Search functionality
- 🎨 Glassmorphism hero section

#### 8. **PWA Features**
- 📱 Install page with platform-specific instructions
- 🔄 Update prompt (service worker)
- 📡 Offline indicator with reconnect notification
- ⚡ Advanced caching strategies
- 🏠 Home screen shortcuts
- 📲 iOS/Android/Desktop install guides

#### 9. **ინვოისები (Invoices)**
- 🧾 Invoice generation
- 👤 Client assignment
- 📦 Product line items
- 💰 Total calculation
- 🖨️ Print functionality

#### 10. **გაყიდვები (Sales)**
- 📊 Sales transactions
- 📈 Analytics
- 🔍 Search & filter
- 📅 Date range selection

### 🟡 ნაწილობრივ რეალიზებული

#### 11. **მიღება (Receiving)**
- ✅ Basic UI
- ⚠️ Needs database integration
- 📦 Supplier order tracking

#### 12. **დაბრუნებები (Returns)**
- ✅ Basic structure
- ⚠️ Needs workflow automation

#### 13. **კლიენტები (Clients)**
- ✅ CRUD interface
- ⚠️ Missing loyalty points calculation
- ⚠️ Missing purchase history

#### 14. **CRM & ლოიალობა**
- ✅ VIP customer tracking
- ⚠️ Needs campaign management
- ⚠️ Missing email/SMS integration

#### 15. **მომწოდებლები (Suppliers)**
- ✅ Basic management
- ⚠️ Missing payment tracking

#### 16. **ხარჯები (Expenses)**
- ✅ Expense entry
- ⚠️ Needs category-wise analytics

#### 17. **თანამშრომლები (Employees)** ✅ HR Module სრული
- ✅ Employee CRUD management
- ✅ Attendance tracking (daily check-in/out + history)
- ✅ **Payroll** — payslip generation with Georgian tax calc (20% income tax, 2% pension)
- ✅ **Leaves** — vacation/sick leave requests with approve/reject flow
- ✅ **Performance Reviews** — ⭐ star-rated evaluations per employee

#### 18. **დასწრება (Attendance)**
- ✅ Basic check-in/out
- ✅ Attendance history log
- ⚠️ Needs biometric support

#### 19. **ხელფასები (Salary)** ✅ Completed (Phase 2)
- ✅ Payslip generation (base + bonus + deductions)
- ✅ Georgian tax automation (20% income + 2% pension)
- ✅ Pay salary → mark as paid workflow

#### 20. **საწყობები (Warehouse Management)**
- ✅ Multi-warehouse structure
- ⚠️ Needs transfer tracking

#### 21. **წარმოება (Production)**
- ✅ Production order UI
- ⚠️ Missing BOM (Bill of Materials)

#### 22. **დისტრიბუცია (Distribution)**
- ✅ Basic routing
- ⚠️ Missing delivery tracking

#### 23. **E-Commerce**
- ✅ Placeholder page
- ❌ Not integrated

#### 24. **მარაგის მეთოდები (Inventory Methods)**
- ✅ FIFO/LIFO/Average
- ⚠️ Needs implementation

#### 25. **ფილიალები (Branches)**
- ✅ Basic structure
- ⚠️ Needs multi-tenant support

#### 26. **რიგები (Queue)**
- ✅ Queue management UI
- ⚠️ Needs real-time updates

#### 27. **ქვითარი (Receipt Settings)** ✅ Updated
- ✅ Receipt customization
- ✅ Logo upload (via FileUpload component + Supabase Storage)

#### 28. **ადმინის პანელი (Admin Panel)**
- ✅ User management
- ⚠️ Needs role assignment UI

#### 29. **აქტივობის ლოგი (Activity Log)**
- ✅ Basic logging
- ⚠️ Needs real-time feed

#### 30. **RS.GE Integration**
- ✅ Full bidirectional integration (DB-backed credentials)
- ✅ Edge function with secure DB retrieval, retry, and audit logging
- ✅ Fixed critical SQL error (duplicate column) in audit logs
- ✅ POS auto-fiscalization & Shift management
- ✅ Buyer waybills & Invoices handling
- ✅ Deno IDE support & Import maps for Edge Functions

#### 31. **MARTEHOME (Real Estate)** ✅ NEW
- ✅ Comprehensive property listing management
- ✅ Mortgage deals tracking and management
- ✅ Real estate-specific analytics dashboard
- ✅ Integrated with main CRM and Auth system
- ✅ Full RLS security for property data

---

## 🎨 UI/UX Enhancements (ბოლო განახლება)

### ბუღალტერია & ფინანსები
- ✅ Hero header sections with glassmorphism
- ✅ 4 KPI summary cards per page
- ✅ Color-coded account types (info, warning, primary, success)
- ✅ Animated badges and sections (framer-motion)
- ✅ Gradient borders and backgrounds
- ✅ Hover effects and transitions
- ✅ Empty state illustrations
- ✅ Professional financial dashboard look

### გლობალური UI
- ✅ Sidebar with gradient background
- ✅ Role badge (Admin/Cashier/Manager)
- ✅ Animated stat cards
- ✅ Responsive grid layouts
- ✅ Skeleton loading states
- ✅ Toast notifications (Sonner)
- ✅ Modal dialogs (Radix)

---

## 🔐 Authentication & Roles (RBAC)

### როლები:
1. **ადმინი** - სრული წვდომა
2. **უფროსი მოლარე** - POS + Reports
3. **საწყობის მენეჯერი** - Warehouse + Receiving
4. **მოლარე** - POS only

### არსებული სისტემა:
- ✅ `useUserRole` hook
- ✅ `useAuthStore` (Supabase Auth)
- ✅ Route-level protection
- ✅ Real Supabase Auth integration with RLS policies
- ⚠️ Migration from localStorage complete for core modules

---

## 🚨 კრიტიკული გამოტოვებები

### 1. **Backend Integration**
- ✅ Supabase ჩართულია და კონფიგურირებულია
- ✅ მონაცემთა დიდი ნაწილი Supabase-ში ინახება
- ✅ SQL migrations გაშვებულია
- ⚠️ რიგი მოდულების მიგრაცია სრულდება

### 2. **Authentication**
- ✅ Supabase Auth ინტეგრირებულია
- ✅ RLS policies გააქტიურებულია
- ✅ user_roles table დამატებულია
- ✅ Auth check client და server side დაცულია

### 3. **Real-time Features**
- ✅ Supabase Realtime ჩართულია (Migration applied)
- ✅ `useRealtimeSync` hook — Postgres change listener მოქმედებს
- ✅ POS multi-device sync — products, transactions, shift_sales, queue_tickets
- ✅ WarehouseManagementPage — live stock alerts
- ✅ InventoryCountPage — live inventory changes

### 4. **File Storage**
- ✅ Supabase Storage კონფიგურირებულია (4 bucket: avatars, product-images, tenant-assets, documents)
- ✅ Product image upload (“FileUpload” component)
- ✅ Tenant logo upload (ReceiptSettingsPage)
- ✅ Avatar upload (ProfilePage)
- ✅ Tenant-isolation RLS policies დადასტურებულია

### 5. **Edge Functions**
- ✅ RS.GE proxy Deployed (Production Ready)
- ❌ invite-user function არ არის tested
- ❌ არ არის email sending capability

---

## 📋 რეკომენდაციები (პრიორიტიზებული)

### 🔥 High Priority (უნდა გაკეთდეს პირველ რიგში)

#### 1. **Lovable Cloud ჩართვა** ⭐⭐⭐⭐⭐
```bash
# Actions needed:
1. Enable Lovable Cloud in project settings
2. Run all SQL migrations in `sql/` folder
3. Set up RLS policies
4. Create user_roles table (security-critical)
5. Enable Row Level Security
```

**ბენეფიტები:**
- ✅ Real database persistence
- ✅ Multi-user support
- ✅ Secure authentication
- ✅ Real-time updates
- ✅ File storage
- ✅ Edge functions

#### 2. **Authentication Migration**
```typescript
// Replace localStorage auth with Supabase Auth
// File: src/stores/useAuthStore.ts

import { supabase } from '@/integrations/supabase/client';

// Use supabase.auth.signInWithPassword()
// Use supabase.auth.signUp()
// Use supabase.auth.signOut()
// Use supabase.auth.onAuthStateChange()
```

#### 3. **User Roles Table** (Security Critical)
```sql
-- Already in sql/create_user_roles.sql
-- Must be executed after enabling Supabase

create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Add RLS policies
-- Add has_role() security definer function
```

#### 4. **Data Migration from LocalStorage to Supabase**
```typescript
// Migrate existing data:
- products → supabase.from('products')
- categories → supabase.from('categories')
- clients → supabase.from('clients')
- suppliers → supabase.from('suppliers')
- transactions → supabase.from('transactions')
- journal_entries → supabase.from('journal_entries')
```

#### 5. **RLS Policies for all tables**
```sql
-- Enable RLS on all tables
alter table products enable row level security;
alter table categories enable row level security;
-- etc.

-- Create policies based on user_roles
create policy "Users can view all products"
  on products for select
  to authenticated
  using (true);

create policy "Only admins can insert products"
  on products for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
```

### 🟡 Medium Priority

#### 6. **RS.GE Integration**
- Deploy edge function
- Test fiscal document sending
- Add retry logic
- Error handling

#### 7. **Barcode Hardware Scanner Support**
```typescript
// Already has useHardwareScanner hook
// Needs testing with physical scanner
// Add USB HID support
```

#### 8. **Multi-warehouse Transfers**
```typescript
// Add warehouse_transfers table
// Add transfer approval workflow
// Track stock movement between warehouses
```

#### 9. **Production Module Enhancement**
```typescript
// Add Bill of Materials (BOM)
// Add production cost calculation
// Add work orders
// Add quality control
```

#### 10. **E-Commerce Integration**
```typescript
// Option 1: Shopify integration
// Option 2: Custom webshop
// Option 3: API-only (headless)
```

### 🟢 Low Priority (Nice to Have)

#### 11. **Analytics Dashboard**
```typescript
// Add Google Analytics
// Add custom business intelligence
// Add predictive analytics (AI)
```

#### 12. **Email/SMS Notifications**
```typescript
// Integrate with Lovable AI Gateway
// Send order confirmations
// Send low stock alerts
// Send salary slips
```

#### 13. **Biometric Attendance**
```typescript
// Integrate fingerprint scanner
// Face recognition (optional)
```

#### 14. **Mobile App (React Native)**
```typescript
// Convert to React Native
// Keep PWA for web
// Share business logic
```

#### 15. **Multi-language Support** ✅
- ✅ Supported languages: Georgian (GE), English (EN), Russian (RU), Azerbaijani (AZ)
- ✅ Integrated into Customers, Accounting, and Admin modules
- ✅ Context-based language switching

---

## 🧪 Testing

### არსებული:
- ✅ Vitest setup (`src/test/`)
- ✅ Example test file
- ⚠️ არ არის კომპონენტების tests

### რეკომენდაცია:
```bash
# Install testing libraries
npm install -D @testing-library/react @testing-library/user-event
npm install -D @testing-library/jest-dom

# Write tests for:
- Critical business logic (accounting calculations)
- Payment processing
- Stock calculations
- User permissions
```

---

## 🚀 Deployment Checklist

### Pre-deployment:
- [ ] Enable Lovable Cloud
- [ ] Run SQL migrations
- [ ] Set up environment variables
- [ ] Configure RLS policies
- [ ] Test authentication flow
- [ ] Test data persistence
- [ ] Backup localStorage data (if any)

### Production:
- [ ] Custom domain setup
- [ ] SSL certificate
- [ ] Error monitoring (Sentry)
- [ ] Performance monitoring
- [ ] Database backup strategy
- [ ] Edge function deployment
- [ ] PWA manifest validation

### Post-deployment:
- [ ] Load testing
- [ ] Security audit
- [ ] User acceptance testing
- [ ] Training materials
- [ ] Support documentation

---

## 📚 დამხმარე რესურსები

### კოდის სტილი:
- Semantic design tokens (არ გამოიყენო hardcoded colors)
- Framer Motion for animations
- Zustand for global state
- React Query for server state (when Supabase is added)

### Supabase Docs:
- [Authentication](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Storage](https://supabase.com/docs/guides/storage)

### Lovable Docs:
- [Cloud Features](https://docs.lovable.dev/features/cloud)
- [AI Features](https://docs.lovable.dev/features/ai)

---

## 🎯 შემდეგი ნაბიჯები (რეკომენდაციები AI-სთვის)

### Immediate (დაუყოვნებლივ):
1. ჩართე Lovable Cloud
2. გაშვი SQL migrations
3. დააკონფიგურე RLS policies
4. მიგრაცია localStorage-დან Supabase-ზე
5. ჩართე Supabase Auth

### Week 1:
1. ✅ RS.GE სრული ინტეგრაცია (Completed)
2. Multi-warehouse transfers
3. Production BOM
4. Receipt logo upload
5. Email notifications

### Week 2:
1. Advanced analytics
2. Predictive stock alerts (AI)
3. Biometric attendance
4. E-commerce integration
5. Multi-language support

### Week 3-4:
1. Mobile app (React Native)
2. Load testing
3. Security audit
4. User training
5. Launch 🚀

---

## 📊 Project Stats

- **Total Pages:** 30+
- **Total Components:** 80+
- **Total Lines of Code:** ~15,000
- **Database Tables (planned):** 20+
- **Features Implemented:** 80%
- **Production Ready:** 45%

---

## 🤝 Contribution Guidelines

### For AI Assistants:
1. ყოველთვის იყენე semantic design tokens
2. არ დაწერო inline colors/styles
3. დაიცავი RBAC permissions
4. დააგენერირე TypeScript types
5. დაამატე framer-motion animations
6. გამოიყენე Zustand state management
7. დაიცავი double-entry accounting principles

### For Developers:
1. Run `npm run dev` for development
2. Check `src/index.css` for design tokens
3. Use `shadcn/ui` components
4. Follow existing folder structure
5. Write meaningful commit messages
6. Test on mobile devices (PWA)

---

## 📄 License & Credits

- Built with Lovable.dev
- UI Components: shadcn/ui
- Icons: Lucide React
- Charts: Recharts
- Database: Supabase (integration pending)

---

**Last Updated:** 2026-03-19  
**Status:** Development (90% core complete)  
**Next Milestone:** Construction Module & Multi-industry Refinement

> **Progress Update (2026-03-19):**
> ✅ MARTEHOME — Real Estate module fully integrated
> ✅ i18n Expansion — Supported GE, EN, RU, AZ across main pages
> ✅ Industry Sync — Added Clinic, Auto, Logistics, Construction to registration
> ✅ UI Stability — Fixed dark/light mode toggle and Superadmin visibility

> **Phase 2 Complete (2026-03-18):**
> ✅ File Storage — 4 Supabase buckets + FileUpload component + tenant RLS
> ✅ Realtime Sync — `useRealtimeSync` hook live on POS / Warehouse / Inventory
> ✅ HR Module — Payroll (Georgian tax), Leave Management, Performance Reviews

---

## 🆘 Known Issues

1. **localStorage overflow** - არის 5-10MB limit
2. **No offline sync** - PWA offline ფუნქციონირებს, მაგრამ sync არ არის
3. **Hard-coded admin credentials** - არ არის secure
4. **No data validation** - ყველა input უნდა იყოს validated
5. **Missing error boundaries** - უნდა დაემატოს global error handling

---

## 💡 Tips for Next AI

- პირველ რიგში ჩართე Supabase, შემდეგ იწყე feature development
- არ დააკოპირო localStorage pattern ახალ features-ში
- ყოველთვის დაამატე RLS policy როცა ქმნი table-ს
- გამოიყენე `has_role()` function permissions-ისთვის
- დაიცავე double-entry accounting logic
- ტესტები აუცილებელია accounting modules-ისთვის

**Good luck! 🚀**
