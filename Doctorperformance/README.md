# Doctor Performance Dashboard — საწყობი ERP / Dental Clinic

## ფაილები

```
doctor-dashboard/
├── sql/create_doctor_performance.sql          # Views + Functions + Indexes
├── src/
│   ├── types/doctorPerformance.ts             # All interfaces
│   ├── hooks/useDoctorPerformance.ts          # 7 data hooks
│   └── components/DoctorPerformanceDashboard.tsx  # Full dashboard
```

## 1. Migration

```sql
\i create_doctor_performance.sql
```

**Views (materialized via Supabase PostgREST):**
- `doctor_daily_stats` — per-day: appointments, completion, no-shows, duration
- `doctor_revenue_stats` — per-month: gross/net revenue, avg invoice
- `chair_utilization` — per-day per-chair: booked minutes → %

**Functions (RPC):**
- `get_doctor_retention(tenant_id, doctor_id?, from, to)` → new vs returning patients
- `get_doctor_procedures(tenant_id, doctor_id?, from, to, limit)` → top procedures by revenue

## 2. Router

```tsx
import DoctorPerformanceDashboard from '@/components/DoctorPerformanceDashboard'
<Route path="/clinic/performance" element={<DoctorPerformanceDashboard />} />
```

## Dashboard Metrics

### Per-doctor card
| Metric | Source |
|---|---|
| Total revenue | `doctor_revenue_stats.net_revenue` |
| Avg invoice | `doctor_revenue_stats.avg_invoice` |
| Total appointments | `doctor_daily_stats.total_appointments` |
| Completion rate | `completed / total * 100` |
| No-show rate | `no_shows / total * 100` |
| Unique patients | `get_doctor_retention.total_patients` |
| Retention rate | `returning / total * 100` |
| Procedures/day | `total / working_days` |
| Revenue/hour | `net_revenue / (appointments * avg_duration / 60)` |

### Detail pane (click to expand)
- 14-day appointment activity bar chart
- Retention breakdown: total / new / returning + progress bar (target 65%)
- Top 10 procedures by revenue with proportional bars

### Chair utilization
- SVG gauge per chair, color-coded: ≥80% teal, ≥50% amber, <50% rose
- Shows average % across selected date range

## Date ranges
7d / 30d / 90d / 6m / 1y — controls all sections simultaneously

## Appointments table requirements

These columns must exist on `appointments`:
```sql
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS chair_id      UUID REFERENCES dental_chairs(id),
  ADD COLUMN IF NOT EXISTS doctor_id     UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS duration_min  INT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS no_show       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelled     BOOLEAN NOT NULL DEFAULT FALSE;
```

Also needs `appointment_id` FK on `transactions` for revenue attribution.
