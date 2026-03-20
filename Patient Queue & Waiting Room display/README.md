# Patient Queue & Waiting Room — საწყობი ERP / Clinic

## ფაილები

```
queue-system/
├── sql/create_queue_system.sql              # Migration + RPC functions
├── src/
│   ├── types/queueSystem.ts                 # Interfaces + helpers
│   ├── hooks/useQueueSystem.ts              # 7 hooks + useQueueSound
│   ├── pages/WaitingRoomDisplay.tsx         # Full-screen TV display
│   └── components/QueueManagementPanel.tsx  # Receptionist UI
```

## 1. Migration

```sql
-- Seed your counters first:
sed -i 's/<tid>/YOUR_TENANT_ID/g' create_queue_system.sql
\i create_queue_system.sql
```

## 2. Environment variables

```env
VITE_TENANT_ID=your-tenant-uuid
VITE_CLINIC_NAME=სტომატოლოგია X
```

## 3. Routes

```tsx
import WaitingRoomDisplay  from '@/pages/WaitingRoomDisplay'
import QueueManagementPanel from '@/components/QueueManagementPanel'

// Full-screen TV — public, no auth
<Route path="/queue/display" element={<WaitingRoomDisplay />} />

// Receptionist — staff auth required
<Route path="/clinic/queue" element={<QueueManagementPanel />} />
```

## 4. Seed counters

```sql
INSERT INTO queue_counters (tenant_id, name, code, room_number) VALUES
  ('YOUR_TENANT_ID', 'ექიმი ბერიძე',  'A', '101'),
  ('YOUR_TENANT_ID', 'ექიმი ჯავახია', 'B', '102'),
  ('YOUR_TENANT_ID', 'გადახდა',        'C', 'სალარო');
```

## TV Display Features

- Deep navy theme, readable from 6+ metres
- Per-counter panel: current ticket in large font (64px), status flash, next 3 in queue
- New call animation: border glow + number pulse + ring indicator
- Auto-announce: `Web Speech API` in Georgian `ka-GE` — reads ticket number aloud
- Beep sound via `AudioContext` on each new call
- Scrolling ticker tape (bilingual Georgian/English)
- Live clock in header
- Realtime: Supabase Postgres changes — updates within 1 second

## Receptionist Panel Features

- Counter sidebar (dark) — toggle open/close per counter
- Stats strip: total / completed / avg wait
- "შემდეგი" button → `call_next_ticket()` RPC
  - Marks previous 'called' as no_show automatically
  - Priority tickets (emergency/priority) jump the queue
- Issue ticket modal: patient name, service type, priority
- Active ticket highlight: amber for 'called', teal for 'serving'
- Per-row actions: recall / start serving / complete / cancel
- Completed tickets collapsible section (last 10)
- Estimated wait time computed from rolling avg of last 10 services

## Ticket Lifecycle

```
issued → waiting → [called] → serving → completed
                      ↓
                   no_show (auto if skipped)
                      ↓
                   cancelled (manual)
```

## Priority Queue

`priority: 2` (emergency) → jumps to front of queue
`priority: 1` (priority)   → after emergencies, before normal
`priority: 0` (normal)     → standard FIFO

`call_next_ticket()` RPC: `ORDER BY priority DESC, issued_at ASC`

## Generated columns (Postgres 12+)

`wait_minutes` = `(called_at - issued_at) / 60` — auto-computed
`service_minutes` = `(completed_at - started_at) / 60` — auto-computed

Both used in analytics view `queue_daily_stats`.

## Sound (no external lib)

- `useQueueSound.playBeep()` — `AudioContext` oscillator, 2-tone beep
- `useQueueSound.playCall(ticketNumber)` — `SpeechSynthesisUtterance`, `lang: 'ka-GE'`

Works in Chrome/Edge. Firefox: Georgian TTS may fall back to system voice.
