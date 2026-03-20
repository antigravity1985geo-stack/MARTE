# Hold / Park Orders — საწყობი ERP

## ფაილები

```
hold-orders/
├── sql/create_held_orders.sql         # Migration
├── src/
│   ├── types/holdOrder.ts             # Interfaces
│   ├── hooks/useHoldOrders.ts         # Supabase hook
│   └── components/HoldOrderPanel.tsx  # Full component
```

## 1. Migration

```sql
\i create_held_orders.sql
```

## 2. POS-ში ჩამატება

```tsx
import HoldOrderPanel, { HoldOrderPanelProps } from '@/components/HoldOrderPanel'
import { HeldOrder, HeldOrderItem } from '@/types/holdOrder'

// ── Cart items გარდაქმნა ──────────────────────────────────────
const holdItems: HeldOrderItem[] = cart.map(item => ({
  product_id: item.product.id,
  name:       item.product.name,
  barcode:    item.product.barcode ?? null,
  price:      item.product.price,
  qty:        item.quantity,
  discount:   item.discount ?? 0,
  line_total: item.qty * item.price - (item.discount ?? 0),
  tax_rate:   item.product.tax_rate ?? 18,
}))

// ── Restore held order back to cart ──────────────────────────
const handleLoadOrder = (order: HeldOrder) => {
  clearCart()
  for (const item of order.items) {
    addToCart({
      product_id: item.product_id,
      name:       item.name,
      price:      item.price,
      qty:        item.qty,
      discount:   item.discount,
    })
  }
  // Restore client
  if (order.client_id) setClient({ id: order.client_id, name: order.client_name })
  // Restore discount
  if (order.discount_amount) setDiscount({
    audit_id:       order.discount_audit_id!,
    discount_amount: order.discount_amount,
  })
}

// ── JSX — put in POS toolbar ─────────────────────────────────
<HoldOrderPanel
  cartItems={holdItems}
  subtotal={subtotal}
  discountTotal={discountTotal}
  taxTotal={taxTotal}
  total={total}
  clientId={client?.id}
  clientName={client?.name}
  discountAuditId={discount?.audit_id}
  discountAmount={discount?.discount_amount}
  drawerId={drawers[0]?.id}
  onClearCart={clearCart}
  onLoadOrder={handleLoadOrder}
/>
```

## Business Logic

- Hold = cart snapshot saved to `held_orders` (JSONB items)
- hold_number auto-assigned (1, 2, 3… per day per tenant, Postgres trigger)
- Realtime sync — multiple terminals see same held list instantly
- Resume = status → 'resumed', cart restored to POS, drawer closes
- Void = status → 'voided' with confirmation step
- Discount preserved: `discount_audit_id` + `discount_amount` round-trip

## DB Schema

| Column | Purpose |
|---|---|
| `hold_number` | Sequential daily counter (#1, #2…) |
| `items` | Full JSONB cart snapshot |
| `label` | Optional name/table number |
| `status` | `held` / `resumed` / `voided` |
| `discount_audit_id` | Links back to discount_audit_logs |
