# Cash Drawer Tracking — საწყობი ERP

## ფაილების სტრუქტურა

```
cash-drawer/
├── sql/
│   └── create_cash_drawer_tables.sql      # Migration — Supabase SQL Editor-ში გაუშვი
├── src/
│   ├── types/
│   │   └── cashDrawer.ts                  # TypeScript interfaces
│   ├── hooks/
│   │   └── useCashDrawer.ts               # ყველა Supabase hook
│   └── components/
│       ├── CashDrawerPage.tsx             # მთავარი გვერდი
│       └── POSCashDrawerIntegration.tsx   # POS-ში ჩასართავი კომპონენტები
```

## 1. Migration გაშვება

Supabase Dashboard → SQL Editor → ახალი Query → ჩასვი `create_cash_drawer_tables.sql` → Run

## 2. Router-ში დამატება

```tsx
// App.tsx ან routes.tsx
import CashDrawerPage from '@/components/CashDrawerPage'

<Route path="/pos/cash-drawer" element={<CashDrawerPage />} />
```

## 3. Sidebar ლინკი

```tsx
{ path: '/pos/cash-drawer', icon: Landmark, label: 'სალარო' }
```

## 4. POS-ში ინტეგრაცია (ნაღდი გადახდა)

```tsx
// POSPage.tsx
import { useActiveSession, useCashDrawerActions } from '@/hooks/useCashDrawer'
import { NoCashDrawerBanner, CashDrawerStatusWidget } from './POSCashDrawerIntegration'

// --- component body ---
const { session } = useActiveSession(defaultDrawerId)
const { recordSale, recordRefund } = useCashDrawerActions(tenantId)

// header-ში:
<CashDrawerStatusWidget drawerId={defaultDrawerId} onClick={() => navigate('/pos/cash-drawer')} />

// ნაღდი გადახდის ლოგიკაში:
if (paymentMethod === 'cash') {
  if (!session) {
    toast.error('გახსენით სალარო ნაღდი გადახდამდე')
    return
  }
  await recordSale(session.id, session.drawer_id, total, savedTransaction.id)
}
```

## 5. Seed — სალაროს დამატება

```sql
INSERT INTO cash_drawers (tenant_id, name, location)
VALUES ('your-tenant-uuid', 'სალარო №1', 'მთავარი მაღაზია');
```

## Database Schema

| ცხრილი | მიზანი |
|---|---|
| `cash_drawers` | ფიზიკური სალაროები (registers) |
| `cash_drawer_sessions` | სმენები — open/close cycles |
| `cash_drawer_transactions` | ყოველი გადაადგილება |

## Business Logic

- **Expected Cash** = opening_float + sales - refunds + cash_in - cash_out
- **Variance** = declared_cash - expected_cash
- Session დახურვისას — atomic RPC function `close_cash_drawer_session()`
- Realtime sync — Supabase channels
- RLS — tenant isolation ყველა ცხრილზე

## Permissions (role-based)

| Role | გახსნა | cash_in/out | დახურვა | ისტორიის ნახვა |
|---|---|---|---|---|
| cashier | ✅ | ✅ | ✅ | ✅ (საკუთარი) |
| manager | ✅ | ✅ | ✅ | ✅ (ყველა) |
| admin | ✅ | ✅ | ✅ | ✅ (ყველა) |
