# Discount Authorization System — საწყობი ERP

## ფაილები

```
discount-auth/
├── sql/create_discount_auth.sql           # Migration
├── src/
│   ├── types/discountAuth.ts              # Interfaces + helpers
│   ├── hooks/useDiscountAuth.ts           # 5 Supabase hooks
│   └── components/
│       ├── DiscountModal.tsx              # PIN pad + discount input modal
│       ├── DiscountSettingsPage.tsx       # Admin: policies + PIN setup + audit log
│       └── POSDiscountIntegration.tsx     # Drop-in POS buttons + hook
```

## 1. Migration

```sql
\i create_discount_auth.sql
```

**ახალი ცხრილები:**
- `discount_policies` — per-role limits (self + hard ceiling)
- `manager_pins` — bcrypt-hashed override PINs
- `discount_audit_logs` — every discount event

**Functions:**
- `verify_manager_pin(tenant_id, pin)` — bcrypt compare, returns `{user_id, role, name}`
- `set_manager_pin(pin, role)` — hashes and upserts
- `log_discount(...)` — writes audit row

## 2. Routes

```tsx
import DiscountSettingsPage from '@/components/DiscountSettingsPage'
<Route path="/settings/discounts" element={<DiscountSettingsPage />} />
```

## 3. POS integration

```tsx
import { CartDiscountButton, ItemDiscountButton, useCartDiscount }
  from '@/components/POSDiscountIntegration'

const disc = useCartDiscount()

// Cart footer
<CartDiscountButton
  cartTotal={subtotal}
  appliedDiscount={disc.cartDiscount?.discountAmount ?? 0}
  onApply={disc.applyCartDiscount}
/>

// Per-item row
<ItemDiscountButton
  productId={item.product_id}
  productName={item.name}
  itemPrice={item.line_total}
  appliedDiscount={disc.itemDiscounts[item.id]?.discountAmount ?? 0}
  onApply={r => disc.applyItemDiscount(item.id, r)}
/>

// For SplitPaymentModal:
discountTotal={disc.totalDiscountAmount(subtotal)}
```

## 4. Seed default policies

```sql
INSERT INTO discount_policies
  (tenant_id, role_name, self_max_pct, self_max_fixed, hard_max_pct, hard_max_fixed)
VALUES
  ('<id>', 'cashier',    0,   0,    10,  50),
  ('<id>', 'supervisor', 5,   20,   25,  200),
  ('<id>', 'manager',    25,  200,  50,  500),
  ('<id>', 'admin',      50,  500,  100, 9999);
```

## 5. Set a manager PIN (from Settings UI or direct)

```sql
SELECT set_manager_pin('1234', 'manager');
-- or via hook: useSetMyPin().setPin('1234', 'manager')
```

## Authorization flow

```
Cashier enters discount value
        ↓
Policy check: value ≤ self_max?
  YES  → approved instantly, logged
  NO   → value ≤ hard_max?
    NO  → BLOCKED (no PIN helps)
    YES → Show PIN modal
            ↓
          Manager enters PIN
            ↓
          verify_manager_pin() RPC (bcrypt compare)
            ↓
          Matched? → approved + logged with authorizer
          No match → error, retry
```

## Per-role defaults (recommended)

| Role       | Self % | Self ₾ | Hard % | Hard ₾ |
|------------|--------|--------|--------|--------|
| cashier    | 0%     | ₾0     | 10%    | ₾50    |
| supervisor | 5%     | ₾20    | 25%    | ₾200   |
| manager    | 25%    | ₾200   | 50%    | ₾500   |
| admin      | 50%    | ₾500   | 100%   | ₾9999  |

## Security notes

- PINs stored as **bcrypt** (cost 10) — never plaintext
- `verify_manager_pin` is `SECURITY DEFINER` — hash never leaves DB
- RLS on all tables — tenant isolation guaranteed
- Every discount (approved or rejected) written to `discount_audit_logs`
- Hard limits enforced server-side in the hook — client cannot bypass
- PIN auto-submits after 4+ digits entered (configurable)
- Physical keyboard support in PIN step
