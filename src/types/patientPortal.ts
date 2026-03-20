// types/patientPortal.ts

export type RequestStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';

export interface PortalSession {
  session_token: string;
  patient_id:    string;
  patient_name:  string;
  patient_phone: string | null;
  tenant_id:     string;
}

export interface PortalAppointment {
  id:             string;
  start_time:     string;
  end_time:       string;
  doctor_name:    string | null;
  service_name:   string | null;
  status:         string;
  notes:          string | null;
  invoice_id:     string | null;
  invoice_total:  number | null;
  invoice_status: string | null;
}

export interface PatientDocument {
  id:                string;
  tenant_id:         string;
  patient_id:        string;
  title:             string;
  category:          'lab_result' | 'xray' | 'prescription' | 'invoice' | 'consent' | 'referral' | 'report' | 'other';
  file_url:          string;
  file_name:         string;
  file_size:         number | null;
  mime_type:         string | null;
  is_portal_visible: boolean;
  appointment_id:    string | null;
  created_at:        string;
}

export interface PortalNotification {
  id:         string;
  tenant_id:  string;
  patient_id: string;
  title:      string;
  body:       string;
  type:       'info' | 'reminder' | 'result' | 'invoice' | 'system';
  is_read:    boolean;
  link_type:  string | null;
  link_id:    string | null;
  created_at: string;
}

export interface AppointmentRequest {
  id:              string;
  tenant_id:       string;
  patient_id:      string | null;
  patient_name:    string;
  patient_phone:   string;
  preferred_date:  string;
  preferred_time:  string | null;
  doctor_id:       string | null;
  service_name:    string | null;
  notes:           string | null;
  status:          RequestStatus;
  rejection_reason: string | null;
  created_at:      string;
}

export const REQUEST_STATUS_META: Record<string, { label: string, color: string, text: string }> = {
  pending:   { label: 'მოლოდინში', color: 'bg-amber-50',  text: 'text-amber-600' },
  confirmed: { label: 'დადასტურდა', color: 'bg-emerald-50',text: 'text-emerald-600' },
  rejected:  { label: 'უარყოფილია', color: 'bg-rose-50',   text: 'text-rose-600' },
  cancelled: { label: 'გაუქმდა',    color: 'bg-slate-50',  text: 'text-slate-500' },
};

export const DOC_CATEGORY_META: Record<string, { label: string, icon: string, color: string }> = {
  lab_result:   { label: 'ანალიზი', icon: '🧪', color: 'bg-blue-100 text-blue-700' },
  xray:         { label: 'რენტგენი', icon: '🦴', color: 'bg-emerald-100 text-emerald-700' },
  prescription: { label: 'რეცეპტი', icon: '💊', color: 'bg-amber-100 text-amber-700' },
  invoice:      { label: 'ინვოისი', icon: '🧾', color: 'bg-slate-100 text-slate-700' },
  consent:      { label: 'თანხმობა', icon: '📝', color: 'bg-purple-100 text-purple-700' },
  referral:     { label: 'მიმართვა', icon: '↗️', color: 'bg-indigo-100 text-indigo-700' },
  report:       { label: 'დასკვნა',  icon: '📄', color: 'bg-rose-100 text-rose-700' },
  other:        { label: 'სხვა',     icon: '📁', color: 'bg-slate-100 text-slate-500' },
};

export const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];
