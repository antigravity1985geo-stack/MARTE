# Shift Handover Report — საწყობი ERP

## ფაილები

```
shift-report/
├── sql/create_shift_report.sql        # Migration
├── src/
│   ├── types/shiftReport.ts           # Interfaces
│   ├── hooks/useShiftReport.ts        # 4 Supabase hooks
│   ├── lib/exportShiftPDF.ts          # jsPDF browser export
│   └── components/ShiftReportPage.tsx # Full UI
```

## 1. Migration

```sql
\i create_shift_report.sql
```

**ახალი ცხრილები:**
- `shift_sales` — snapshotted Z-report per session
- `void_logs` — voided transaction audit trail

**Functions / Triggers:**
- `build_shift_report(session_id, save?)` — RPC, works live or for history
- `auto_build_shift_report()` — trigger on session close → auto-saves Z-report

## 2. npm packages

```bash
npm install jspdf jspdf-autotable
```

## 3. Router

```tsx
import ShiftReportPage from '@/components/ShiftReportPage'
<Route path="/pos/shift-report" element={<ShiftReportPage />} />
```

## 4. POS header button

```tsx
import { BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

<button onClick={() => navigate('/pos/shift-report')}>
  <BarChart3 size={16} />
  <span>ანგარიში</span>
</button>
```

## Report Types

| Type | Georgian | When |
|---|---|---|
| **X-report** | X-ანგარიში | Mid-shift — does NOT close session, live data via RPC |
| **Z-report** | Z-ანგარიში | End-of-day — session closed, snapshot saved in `shift_sales` |

## What the report contains

### Summary
- Gross sales, discounts, refunds → Net sales
- Tax (18% VAT)
- Transaction counts: total / voided / refunded

### Payment breakdown
- Cash vs card split (visual bar + amounts)
- Other methods (store credit, gift card)

### Cash drawer reconciliation
- Opening float + cash_in + cash_out + sales − refunds = expected
- Declared (counted) amount vs expected → variance with highlight

### Per-cashier breakdown
- Each cashier's transactions, revenue, discounts

### Top 10 products
- By revenue, with quantities

### Hourly activity chart
- Bar chart + table per hour of shift

### PDF export
- 2-page A4, company header bar
- Visual payment split bar
- Cashier table (autoTable)
- Mini hourly bar chart drawn on canvas
- Signature block on Z-reports
- Page footer with page numbers

## Auto-trigger on close

When `cash_drawer_sessions.status` changes to `'closed'`, the
`trg_shift_report` trigger fires `build_shift_report(session_id, TRUE)`
automatically — Z-report is always saved without manual action.

## Cash Drawer integration

Uses same session from `useActiveSession(drawerId)` — no extra config needed.
The report reads directly from `cash_drawer_transactions` for cash in/out,
and from `transactions` + `transaction_payments` for sales data.
