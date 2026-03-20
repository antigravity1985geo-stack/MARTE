// types/consentForms.ts

export type ConsentCategory =
  | 'general' | 'extraction' | 'implant' | 'root_canal'
  | 'surgery'  | 'anesthesia' | 'orthodontic'
  | 'whitening'| 'veneer'    | 'pediatric' | 'other'

export type ConsentStatus =
  | 'pending' | 'signed' | 'witnessed' | 'completed' | 'revoked'

export interface TemplateVariable {
  key:      string
  label:    string    // Georgian label shown in form
  required: boolean
  type?:    'text' | 'date' | 'textarea'
}

export interface ConsentFormTemplate {
  id:               string
  tenant_id:        string
  name:             string
  slug:             string
  category:         ConsentCategory
  body_ka:          string          // with {{variable}} placeholders
  variables:        TemplateVariable[]
  requires_witness: boolean
  version:          string
  is_active:        boolean
  created_at:       string
}

export interface ConsentForm {
  id:               string
  tenant_id:        string
  template_id:      string
  template_version: string
  patient_id:       string
  patient_name:     string
  patient_phone:    string | null
  appointment_id:   string | null
  doctor_id:        string | null
  doctor_name:      string | null
  variables_data:   Record<string, string>
  rendered_body:    string
  patient_signature: string | null   // base64
  witness_signature: string | null
  doctor_signature:  string | null
  patient_signed_at: string | null
  witness_signed_at: string | null
  doctor_signed_at:  string | null
  witness_name:      string | null
  signed_ip:         string | null
  status:            ConsentStatus
  notes:             string | null
  created_at:        string
  updated_at:        string
  // joined
  template?:         Pick<ConsentFormTemplate, 'name' | 'category' | 'requires_witness'>
}

// ─── Labels ───────────────────────────────────────────────────

export const CATEGORY_META: Record<ConsentCategory, { label: string; icon: string }> = {
  general:      { label: 'ზოგადი',        icon: '📋' },
  extraction:   { label: 'ამოღება',       icon: '🦷' },
  implant:      { label: 'იმპლანტი',      icon: '🔩' },
  root_canal:   { label: 'Root Canal',    icon: '🔬' },
  surgery:      { label: 'ქირურგია',      icon: '🏥' },
  anesthesia:   { label: 'ანესთეზია',     icon: '💉' },
  orthodontic:  { label: 'ორთოდ.',        icon: '😁' },
  whitening:    { label: 'გათეთრება',     icon: '✨' },
  veneer:       { label: 'ვინირი',        icon: '💎' },
  pediatric:    { label: 'ბავშვ.',        icon: '🧒' },
  other:        { label: 'სხვა',          icon: '📄' },
}

export const STATUS_META: Record<ConsentStatus, {
  label: string; color: string; text: string; dot: string
}> = {
  pending:   { label: 'ელოდება',    color: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  signed:    { label: 'ხელმ. მოეწ.',color: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  witnessed: { label: 'მოწმე',      color: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500'  },
  completed: { label: 'დასრულ.',    color: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  revoked:   { label: 'გაუქმებ.',   color: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-400'    },
}

// Interpolate {{key}} placeholders
export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `[${key}]`)
}
