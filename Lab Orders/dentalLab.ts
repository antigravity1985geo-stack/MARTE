// types/dentalLab.ts

export type LabOrderCategory =
  | 'crown' | 'bridge' | 'denture' | 'veneer'
  | 'implant' | 'orthodontic' | 'other'

export type LabOrderStatus =
  | 'draft' | 'sent' | 'in_progress' | 'ready'
  | 'received' | 'fitted' | 'remake' | 'cancelled'

export interface DentalLab {
  id:               string
  tenant_id:        string
  name:             string
  contact_name:     string | null
  phone:            string | null
  email:            string | null
  address:          string | null
  turnaround_days:  number
  notes:            string | null
  is_active:        boolean
  created_at:       string
}

export interface LabWorkType {
  id:         string
  tenant_id:  string
  lab_id:     string | null
  name:       string
  category:   LabOrderCategory
  material:   string | null
  base_cost:  number
  unit:       string
  is_active:  boolean
}

export interface LabOrderAttachment {
  name:  string
  url:   string
  type:  string
  size:  number
}

export interface LabOrder {
  id:             string
  tenant_id:      string
  order_number:   string
  lab_id:         string
  patient_id:     string | null
  doctor_id:      string
  appointment_id: string | null
  work_type_id:   string | null
  work_type_name: string
  category:       LabOrderCategory
  material:       string | null
  shade:          string | null
  teeth:          string[]
  units:          number
  instructions:   string | null
  special_notes:  string | null
  attachments:    LabOrderAttachment[]
  sent_date:      string | null
  due_date:       string
  received_date:  string | null
  fit_date:       string | null
  lab_cost:       number
  patient_cost:   number
  paid_to_lab:    boolean
  paid_date:      string | null
  status:         LabOrderStatus
  remake_reason:  string | null
  cancel_reason:  string | null
  created_by:     string
  created_at:     string
  updated_at:     string
  // joined
  lab?:           { name: string }
  patient_name?:  string
  doctor_name?:   string
}

export interface LabOrderEvent {
  id:           string
  order_id:     string
  status:       LabOrderStatus
  note:         string | null
  performed_by: string | null
  created_at:   string
  performer_name?: string
}

// ─── Labels & meta ────────────────────────────────────────────

export const STATUS_META: Record<LabOrderStatus, {
  label:  string
  color:  string   // Tailwind bg
  text:   string
  dot:    string
}> = {
  draft:       { label: 'დრაფტი',      color: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'    },
  sent:        { label: 'გაგზავნილი',  color: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'     },
  in_progress: { label: 'მუშავდება',   color: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'    },
  ready:       { label: 'მზადაა',      color: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500'  },
  received:    { label: 'მიღებულია',   color: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-500'     },
  fitted:      { label: 'ჩამაგრდა',   color: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500'   },
  remake:      { label: 'გადაკეთება',  color: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500'   },
  cancelled:   { label: 'გაუქმდა',    color: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-400'     },
}

export const CATEGORY_LABELS: Record<LabOrderCategory, string> = {
  crown:        'გვირგვინი',
  bridge:       'ხიდი',
  denture:      'პროთეზი',
  veneer:       'ვინირი',
  implant:      'იმპლანტი',
  orthodontic:  'ორთოდ.',
  other:        'სხვა',
}

// FDI tooth notation — upper right to lower right
export const FDI_TEETH = [
  '18','17','16','15','14','13','12','11',
  '21','22','23','24','25','26','27','28',
  '48','47','46','45','44','43','42','41',
  '31','32','33','34','35','36','37','38',
]

export const VITA_SHADES = [
  'A1','A2','A3','A3.5','A4',
  'B1','B2','B3','B4',
  'C1','C2','C3','C4',
  'D2','D3','D4',
  'BL','OM',
]

// Next valid status transitions
export const STATUS_TRANSITIONS: Record<LabOrderStatus, LabOrderStatus[]> = {
  draft:       ['sent', 'cancelled'],
  sent:        ['in_progress', 'received', 'cancelled'],
  in_progress: ['ready', 'cancelled'],
  ready:       ['received', 'remake', 'cancelled'],
  received:    ['fitted', 'remake'],
  fitted:      [],
  remake:      ['sent', 'cancelled'],
  cancelled:   [],
}
