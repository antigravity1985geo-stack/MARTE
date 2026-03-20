# Customer Display Screen — საწყობი ERP

## ფაილები

```
customer-display/
├── src/
│   ├── types/customerDisplay.ts           # Message types + state
│   ├── hooks/useCustomerDisplay.ts        # Broadcaster + Receiver
│   ├── pages/CustomerDisplay.tsx          # Full-screen display page
│   └── components/CustomerDisplayButton.tsx  # POS toolbar button
```

## ინტეგრაცია — 3 ნაბიჯი

### 1. Route დამატება

```tsx
// App.tsx / routes.tsx
import CustomerDisplay from '@/pages/CustomerDisplay'

<Route path="/display" element={
  <CustomerDisplay
    companyName="მაღაზიის სახელი"
    drawerId={drawers[0]?.id}
  />
}/>
```

### 2. POS toolbar — display ღილაკი

```tsx
import { CustomerDisplayButton } from '@/components/CustomerDisplayButton'
import { DisplayCartItem } from '@/types/customerDisplay'

// Cart items format conversion
const displayItems: DisplayCartItem[] = cart.map(i => ({
  product_id: i.product.id,
  name:       i.product.name,
  qty:        i.quantity,
  unit_price: i.product.price,
  discount:   i.discount ?? 0,
  line_total: i.qty * i.price - (i.discount ?? 0),
  tax_rate:   18,
}))

// Toolbar:
<CustomerDisplayButton
  tenantId={tenantId}
  drawerId={drawerId}
  cartItems={displayItems}
  subtotal={subtotal}
  discountTotal={discountTotal}
  taxTotal={taxTotal}
  total={total}
  clientName={client?.name}
/>
```

### 3. Payment flow sync

```tsx
import { usePOSDisplaySync } from '@/components/CustomerDisplayButton'

const pos = usePOSDisplaySync(tenantId, drawerId)

// When checkout button pressed:
pos.startPayment('card')   // shows processing screen

// After transaction saved:
pos.confirmPayment({
  total:          finalTotal,
  cash_paid:      cashTendered,   // optional
  change:         cashChange,     // optional — shown large on screen
  method:         'cash',
  receipt_number: savedTx.receipt_number,
})
// Display auto-clears to idle after 6 seconds

// On cart clear:
pos.reset()
```

## Communication Architecture

```
Same device / same browser:
  POS tab  ──BroadcastChannel──▶  /display tab
  (zero latency, no server)

Different device (tablet display):
  POS  ──Supabase Realtime broadcast──▶  Display tablet
  (enable by passing crossDevice={true} + drawerId)
```

## Display States

| State | Shown when |
|---|---|
| `idle` | No activity — animated logo, time, welcome |
| `shopping` | Cart has items — live list + running total |
| `payment` | Checkout initiated — animated processing |
| `done` | Sale complete — checkmark, total, **change** (large) |

Auto-returns to `idle`:
- 3 min after last cart update (inactivity timer)
- 6 sec after `payment_done`

## No SQL migration needed
Purely client-side (BroadcastChannel) for same-device setup.
Only Supabase Realtime channels used for cross-device — no new tables.
