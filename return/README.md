# Return & Refund Flow — საწყობი ERP

## ფაილების სტრუქტურა

```
refund-flow/
├── sql/
│   └── create_returns_tables.sql          # Migration
├── src/
│   ├── types/returns.ts                   # TypeScript interfaces
│   ├── hooks/useReturns.ts                # Supabase hooks
│   ├── lib/rsge-credit-note.ts            # Edge Function → supabase/functions/rsge-credit-note/
│   └── components/
│       ├── RefundPage.tsx                 # Main 4-step UI
│       └── POSRefundIntegration.tsx       # POS integration helpers
```

## 1. Migration გაშვება

```sql
-- Supabase SQL Editor-ში:
\i create_returns_tables.sql
```

**Dependencies:** `transactions`, `transaction_items`, `products`,
`cash_drawer_transactions`, `rsge_audit_logs`, `activity_logs`

## 2. Edge Function deploy

```bash
# rsge-credit-note.ts → supabase/functions/rsge-credit-note/index.ts
supabase functions deploy rsge-credit-note
```

## 3. Router-ში დამატება

```tsx
// App.tsx
import RefundPage from '@/components/RefundPage'
<Route path="/pos/refund" element={<RefundPage />} />
```

## 4. POS toolbar-ში ღილაკი

```tsx
import { RefundButton } from '@/components/POSRefundIntegration'
// POS header-ში:
<RefundButton />
// ან compact (icon only):
<RefundButton compact />
```

## 5. Transaction row-ში badge

```tsx
import { RefundBadge } from '@/components/POSRefundIntegration'
<RefundBadge txId={transaction.id} />
```

## Business Flow

```
Search receipt → Select items → Choose method → Confirm
      ↓                                              ↓
  by receipt#                              DB: create_return() RPC
  or phone                                        ↓
                                        Stock auto-restored (trigger)
                                                  ↓
                                      Cash drawer "refund" entry
                                                  ↓
                                       RS.GE credit note (async)
```

## Database Tables

| ცხრილი | მიზანი |
|---|---|
| `returns` | დაბრუნების header — amount, method, RS.GE status |
| `return_items` | რომელი პროდუქტები, რამდენი |

## Key Functions

| Function | მიზანი |
|---|---|
| `create_return()` | Atomic RPC — creates return + items + cash entry |
| `restore_stock_on_return()` | Trigger — auto-restores stock per item |
| `get_returned_qty(item_id)` | Computes already-returned qty |
| `generate_return_number()` | Auto: RET-2026-00042 |

## Partial Return Logic

```
item.returnable_qty = item.qty - already_returned_qty
line_total = returned_qty × unit_price - proportional_discount
```

## RS.GE Credit Note

- Type `2` = return invoice
- Links to original `rsge_document_id` via `dealReference`
- Logged to `rsge_audit_logs`
- Auto-retry button if failed
- `store_credit` refunds skip RS.GE (not_required)

## Cash Drawer Integration

```
refund_method = 'cash'
  → inserts cash_drawer_transactions(type='refund')
  → links via cash_drawer_tx_id
  → expected_cash decreases automatically
```
