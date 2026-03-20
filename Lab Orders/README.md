# Dental Lab Orders — საწყობი ERP / Clinic Module

## ფაილები

```
dental-lab/
├── sql/create_dental_lab.sql          # Migration
├── src/
│   ├── types/dentalLab.ts             # All interfaces + constants
│   ├── hooks/useDentalLab.ts          # 5 Supabase hooks
│   └── components/LabOrdersPage.tsx   # Full page UI
```

## 1. Migration

```sql
\i create_dental_lab.sql
```

**ახალი ცხრილები:**
- `dental_labs` — გარე ლაბ. კონტაქტები
- `lab_work_types` — სამუშ. ტიპები (PFM Crown, Zirconia…) + ფასი
- `lab_orders` — შეკვეთის header + teeth[], shade, dates, cost
- `lab_order_events` — auto-logged status history

**Auto-triggers:**
- `trg_lab_order_number` — LAB-2026-00042
- `trg_lab_order_log` — status ცვლილება → event ჩანაწ.

## 2. Router

```tsx
import LabOrdersPage from '@/components/LabOrdersPage'
<Route path="/clinic/lab-orders" element={<LabOrdersPage />} />
```

## 3. Seed

```sql
-- ლაბი:
INSERT INTO dental_labs(tenant_id, name, phone, turnaround_days)
VALUES('<tid>', 'ლაბ. თბილისი', '+995 32 222 2222', 5);

-- სამუშ. ტიპები:
INSERT INTO lab_work_types(tenant_id, name, category, material, base_cost) VALUES
  ('<tid>', 'PFM Crown',       'crown',   'PFM',      120),
  ('<tid>', 'Zirconia Crown',  'crown',   'Zirconia', 180),
  ('<tid>', 'Zirconia Bridge', 'bridge',  'Zirconia', 160),
  ('<tid>', 'Full Denture',    'denture', 'Acrylic',  250),
  ('<tid>', 'Veneer',          'veneer',  'Ceramic',  140);
```

## Status Workflow

```
draft → sent → in_progress → ready → received → fitted
                    ↓                     ↓
                cancelled              remake → sent
```

Auto date-stamping:
- `sent` → sets `sent_date`
- `received` → sets `received_date`
- `fitted` → sets `fit_date`

## UI Features

- Kanban board (6 columns) + list view toggle
- Tooth selector — FDI notation, upper/lower jaw grid, multi-select
- VITA shade picker (A1–D4 + BL/OM)
- Due date chip — color-coded: overdue (rose), today (orange), ≤2d (amber), normal (slate)
- Profit calculation per order (patient_cost − lab_cost)
- Event timeline in detail panel
- Realtime sync (supabase channel)
- File attachments (X-rays, STL scans) → Supabase Storage
- Remake flow with reason required
- Lab payment tracking (paid_to_lab flag + date)
