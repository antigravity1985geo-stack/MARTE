# Split Payment — საწყობი ERP / POS

## ფაილების სტრუქტურა

```
split-payment/
├── sql/
│   └── create_split_payment.sql           # Migration
├── src/
│   ├── types/splitPayment.ts              # Interfaces + constants
│   ├── hooks/useSplitPayment.ts           # State + finalize hooks
│   ├── lib/rsge-split-invoice.ts          # Edge Function
│   └── components/
│       ├── SplitPaymentModal.tsx          # Main modal UI
│       └── POSSplitPaymentIntegration.tsx # Drop-in helpers
```

## 1. Migration

```sql
-- Supabase SQL Editor:
\i create_split_payment.sql
```

**ახალი ცხრილი:** `transaction_payments` — one row per payment leg  
**Alter:** `transactions` — adds `is_split_payment`, `cash_amount`, `card_amount`, `cash_change`

## 2. Edge Function

```bash
cp src/lib/rsge-split-invoice.ts supabase/functions/rsge-split-invoice/index.ts
supabase functions deploy rsge-split-invoice
```

## 3. POS-ში ინტეგრაცია

```tsx
import SplitPaymentModal from '@/components/SplitPaymentModal'
import { CartItemInput } from '@/types/splitPayment'

// Cart items format
const cartItems: CartItemInput[] = cart.map(item => ({
  product_id: item.product.id,
  name:       item.product.name,
  qty:        item.quantity,
  unit_price: item.product.price,
  discount:   item.discount ?? 0,
  line_total: item.qty * item.price - item.discount,
  tax_rate:   18,
}))

// Modal
{showPayment && (
  <SplitPaymentModal
    total={cartTotal}
    cartItems={cartItems}
    totals={{ subtotal, discountTotal, taxTotal, total }}
    onClose={() => setShowPayment(false)}
    onSuccess={result => { clearCart(); printReceipt(result) }}
  />
)}
```

## Business Logic

### RPC `finalize_split_payment()` — atomic
1. Validates `SUM(payments) >= total`
2. Creates `transactions` row with split summary columns
3. Inserts `transaction_items` + deducts stock per item
4. Inserts `transaction_payments` per leg
5. Creates `cash_drawer_transactions` entry for cash leg
6. Returns `{ transaction_id, receipt_number, cash_change, ... }`

### UI Flow
```
Quick Split preset  →  or manual "Add method"
       ↓
  LegCard per method  →  amount input  +  fill-remaining button
       ↓
  Progress bar shows % split visually
       ↓
  Cash leg: tendered input + quick preset buttons + change display
  Card leg: last4, brand, approval code (expandable)
       ↓
  Confirm button unlocks when SUM = total (±0.005)
       ↓
  RPC call → Done screen with breakdown + change + RS.GE status
```

### RS.GE — split payment
- `transaction_payments.rsge_payment_type`: `'1'`=cash `'2'`=card `'9'`=other
- Payload includes `payments[]` array — RS.GE supports mixed payment types
- Fired async after modal closes (non-blocking)
- Status shown on done screen with retry option

### Quick Split presets
| Label | Cash | Card |
|---|---|---|
| 50 / 50 | 50% | 50% |
| 70 / 30 | 70% | 30% |
| 30 / 70 | 30% | 70% |

### Cash drawer integration
- Cash leg automatically recorded to `cash_drawer_transactions(type='sale')`
- If no open session → cash method disabled in UI
- Uses `useActiveSession()` + `useDrawers()` from Cash Drawer module
