// types/queueSystem.ts

export type TicketStatus =
  | 'waiting' | 'called' | 'serving'
  | 'completed' | 'no_show' | 'cancelled'

export type ServiceType =
  | 'consultation' | 'treatment' | 'xray' | 'payment' | 'other'

export type TicketPriority = 0 | 1 | 2  // normal | priority | emergency

export interface QueueCounter {
  id:          string
  tenant_id:   string
  name:        string
  code:        string       // 'A', 'B', 'C'
  doctor_id:   string | null
  room_number: string | null
  is_active:   boolean
  is_open:     boolean
  opened_at:   string | null
  created_at:  string
}

export interface QueueTicket {
  id:             string
  tenant_id:      string
  counter_id:     string
  ticket_number:  string    // 'A-001'
  display_number: number    // 1, 2, 3…
  patient_id:     string | null
  patient_name:   string | null
  patient_phone:  string | null
  appointment_id: string | null
  service_type:   ServiceType | null
  priority:       TicketPriority
  issued_at:      string
  called_at:      string | null
  started_at:     string | null
  completed_at:   string | null
  no_show_at:     string | null
  status:         TicketStatus
  wait_minutes:   number | null
  service_minutes:number | null
  notes:          string | null
  created_at:     string
  updated_at:     string
  // joined
  counter?:       QueueCounter
}

// What the TV display shows per counter
export interface CounterDisplayState {
  counter:        QueueCounter
  current_ticket: QueueTicket | null  // currently called / serving
  waiting_count:  number
  next_tickets:   QueueTicket[]       // next 3 in line
}

export interface DailyStats {
  total_tickets:   number
  completed:       number
  no_shows:        number
  avg_wait_min:    number | null
  avg_service_min: number | null
}

// ─── Labels ───────────────────────────────────────────────────

export const SERVICE_META: Record<ServiceType, { label: string; color: string }> = {
  consultation: { label: 'კონსულტ.',   color: 'bg-blue-100 text-blue-700'   },
  treatment:    { label: 'მკურნ.',     color: 'bg-teal-100 text-teal-700'   },
  xray:         { label: 'X-Ray',      color: 'bg-violet-100 text-violet-700'},
  payment:      { label: 'გადახდა',    color: 'bg-amber-100 text-amber-700'  },
  other:        { label: 'სხვა',       color: 'bg-slate-100 text-slate-600'  },
}

export const PRIORITY_META: Record<TicketPriority, { label: string; color: string }> = {
  0: { label: 'ჩვეულებრ.',  color: 'bg-slate-100 text-slate-600'   },
  1: { label: 'პრიორ.',     color: 'bg-amber-100 text-amber-700'   },
  2: { label: 'სასწ.',      color: 'bg-rose-100 text-rose-700'     },
}

export const STATUS_META: Record<TicketStatus, {
  label: string; color: string; text: string
}> = {
  waiting:   { label: 'ელოდება',  color: 'bg-slate-100',   text: 'text-slate-600'   },
  called:    { label: 'გამოძახ.', color: 'bg-amber-100',   text: 'text-amber-800'   },
  serving:   { label: 'მომსახ.',  color: 'bg-emerald-100', text: 'text-emerald-800' },
  completed: { label: 'დასრულ.', color: 'bg-teal-100',    text: 'text-teal-700'    },
  no_show:   { label: 'არ მოვ.', color: 'bg-rose-100',    text: 'text-rose-700'    },
  cancelled: { label: 'გაუქმ.',   color: 'bg-slate-100',   text: 'text-slate-400'   },
}

// Estimated wait: avg service time × tickets ahead
export function estimateWait(position: number, avgServiceMin: number): string {
  const mins = Math.round(position * avgServiceMin)
  if (mins < 1)  return 'ახლა'
  if (mins < 60) return `~${mins} წთ`
  return `~${Math.floor(mins / 60)} სთ ${mins % 60} წთ`
}
