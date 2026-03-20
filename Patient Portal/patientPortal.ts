// types/patientPortal.ts

export type RequestStatus  = 'pending' | 'confirmed' | 'rejected' | 'cancelled'
export type DocCategory    = 'lab_result' | 'xray' | 'prescription' | 'invoice' | 'consent' | 'referral' | 'report' | 'other'
export type NotifType      = 'info' | 'reminder' | 'result' | 'invoice' | 'system'

// ─── Portal session (stored in localStorage) ──────────────────
export interface PortalSession {
  session_token: string
  patient_id:    string
  patient_name:  string
  patient_phone: string | null
  tenant_id:     string
}

// ─── Patient data (from clinic DB) ───────────────────────────
export interface PortalPatient {
  id:           string
  full_name:    string
  phone:        string | null
  email:        string | null
  date_of_birth: string | null
  gender:       string | null
  address:      string | null
}

// ─── Appointment (past + upcoming) ───────────────────────────
export interface PortalAppointment {
  id:           string
  start_time:   string
  end_time:     string | null
  doctor_name:  string | null
  service_name: string | null
  status:       string
  notes:        string | null
  // from billing
  invoice_id:   string | null
  invoice_total: number | null
  invoice_status: string | null
}

// ─── Online booking request ───────────────────────────────────
export interface AppointmentRequest {
  id:               string
  patient_name:     string
  patient_phone:    string
  preferred_date:   string
  preferred_time:   string | null
  service_name:     string | null
  notes:            string | null
  status:           RequestStatus
  rejection_reason: string | null
  created_at:       string
  updated_at:       string
  // clinic-side joined
  doctor_name?:     string
}

// ─── Document ─────────────────────────────────────────────────
export interface PatientDocument {
  id:           string
  title:        string
  category:     DocCategory
  file_url:     string
  file_name:    string
  file_size:    number | null
  mime_type:    string | null
  appointment_id: string | null
  notes:        string | null
  created_at:   string
}

// ─── Notification ────────────────────────────────────────────
export interface PortalNotification {
  id:         string
  title:      string
  body:       string
  type:       NotifType
  is_read:    boolean
  link_type:  string | null
  link_id:    string | null
  created_at: string
}

// ─── Labels ──────────────────────────────────────────────────

export const DOC_CATEGORY_META: Record<DocCategory, { label: string; icon: string; color: string }> = {
  lab_result:   { label: 'ლაბ. შედეგი',  icon: '🧪', color: 'bg-teal-100 text-teal-700'   },
  xray:         { label: 'სურათი / X-ray', icon: '🦴', color: 'bg-blue-100 text-blue-700'   },
  prescription: { label: 'რეცეპტი',       icon: '💊', color: 'bg-violet-100 text-violet-700'},
  invoice:      { label: 'ინვოისი',       icon: '🧾', color: 'bg-amber-100 text-amber-700'  },
  consent:      { label: 'თანხმობა',      icon: '✍️', color: 'bg-slate-100 text-slate-700'  },
  referral:     { label: 'მიმართვა',      icon: '📋', color: 'bg-orange-100 text-orange-700'},
  report:       { label: 'ანგარიში',      icon: '📊', color: 'bg-indigo-100 text-indigo-700'},
  other:        { label: 'სხვა',          icon: '📄', color: 'bg-slate-100 text-slate-600'  },
}

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; color: string; text: string }> = {
  pending:   { label: 'განხილვაში',   color: 'bg-amber-100',   text: 'text-amber-700'   },
  confirmed: { label: 'დადასტ.',      color: 'bg-emerald-100', text: 'text-emerald-700' },
  rejected:  { label: 'უარყოფ.',     color: 'bg-rose-100',    text: 'text-rose-700'    },
  cancelled: { label: 'გაუქმებ.',    color: 'bg-slate-100',   text: 'text-slate-500'   },
}

export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00',
]
