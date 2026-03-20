// types/soapNotes.ts

export type NoteStatus  = 'draft' | 'signed' | 'amended'
export type NoteCategory =
  | 'general' | 'extraction' | 'implant' | 'root_canal'
  | 'orthodontic' | 'pediatric' | 'checkup' | 'emergency' | 'other'

export interface ICD10Code {
  code:       string
  label:      string
  is_primary: boolean
}

export interface Vitals {
  bp_systolic?:    number
  bp_diastolic?:   number
  pulse?:          number
  temp?:           number
  weight?:         number
  pain_score?:     number   // 0–10
}

export interface SoapTemplate {
  id:                   string
  tenant_id:            string
  name:                 string
  category:             NoteCategory
  subjective_tpl:       string
  objective_tpl:        string
  assessment_tpl:       string
  plan_tpl:             string
  subjective_phrases:   string[]
  objective_phrases:    string[]
  assessment_phrases:   string[]
  plan_phrases:         string[]
  suggested_icd10:      { code: string; label: string }[]
  is_active:            boolean
  created_at:           string
}

export interface SoapNote {
  id:             string
  tenant_id:      string
  patient_id:     string
  patient_name:   string
  doctor_id:      string
  doctor_name:    string | null
  appointment_id: string | null
  template_id:    string | null
  template_name:  string | null
  subjective:     string
  objective:      string
  assessment:     string
  plan:           string
  icd10_codes:    ICD10Code[]
  teeth_involved: string[]
  vitals:         Vitals | null
  follow_up_date: string | null
  follow_up_notes:string | null
  attachments:    { name: string; url: string; type: string }[]
  is_signed:      boolean
  signed_at:      string | null
  signed_by:      string | null
  status:         NoteStatus
  amended_from:   string | null
  notes:          string | null
  created_at:     string
  updated_at:     string
}

// History list row (from view)
export interface SoapNoteHistoryRow {
  id:                  string
  patient_id:          string
  patient_name:        string
  doctor_id:           string
  doctor_name:         string | null
  appointment_id:      string | null
  template_name:       string | null
  subjective_preview:  string
  assessment_preview:  string
  icd10_codes:         ICD10Code[]
  teeth_involved:      string[]
  follow_up_date:      string | null
  status:              NoteStatus
  is_signed:           boolean
  signed_at:           string | null
  created_at:          string
  updated_at:          string
}

// ─── Labels ───────────────────────────────────────────────────

export const SECTION_META = {
  subjective: {
    key:         'subjective' as const,
    label:       'S — Subjective',
    label_short: 'S',
    label_ka:    'პაციენტის ჩივილები',
    color:       'bg-blue-600',
    light:       'bg-blue-50 border-blue-200',
    placeholder: 'მთავარი ჩივილი, ამჟამინდელი დაავადება, ანამნეზი...',
  },
  objective: {
    key:         'objective' as const,
    label:       'O — Objective',
    label_short: 'O',
    label_ka:    'გამოკვლევის მონაცემები',
    color:       'bg-teal-600',
    light:       'bg-teal-50 border-teal-200',
    placeholder: 'კლინ. გამოკვლევა, სასიცოცხლო ნიშნები, სტომ. სტატუსი...',
  },
  assessment: {
    key:         'assessment' as const,
    label:       'A — Assessment',
    label_short: 'A',
    label_ka:    'შეფასება / დიაგნოზი',
    color:       'bg-violet-600',
    light:       'bg-violet-50 border-violet-200',
    placeholder: 'დიაგნოზი, ICD-10 კოდები, პრობლემის ჩამონათვალი...',
  },
  plan: {
    key:         'plan' as const,
    label:       'P — Plan',
    label_short: 'P',
    label_ka:    'მკურნალობის გეგმა',
    color:       'bg-emerald-600',
    light:       'bg-emerald-50 border-emerald-200',
    placeholder: 'მედიკ. დანიშნულება, პროცედ., მომდ. ნაბიჯები, მითითებები...',
  },
} as const

export type SectionKey = keyof typeof SECTION_META

export const CATEGORY_LABELS: Record<NoteCategory, string> = {
  general:      'ზოგადი',
  extraction:   'ამოღება',
  implant:      'იმპლანტი',
  root_canal:   'Root Canal',
  orthodontic:  'ორთოდ.',
  pediatric:    'ბავშვ.',
  checkup:      'გამოკვლ.',
  emergency:    'სასწრ.',
  other:        'სხვა',
}

// Common ICD-10 codes for dental (for quick-pick)
export const DENTAL_ICD10: { code: string; label: string }[] = [
  { code: 'K02.1', label: 'კარიესი, ემ.-დენტ. ზ.' },
  { code: 'K02.9', label: 'კარიესი, დაუ.' },
  { code: 'K04.0', label: 'პულპიტი' },
  { code: 'K04.1', label: 'პ. ნეკროზი' },
  { code: 'K04.4', label: 'პ/ა ფოლოქი' },
  { code: 'K04.5', label: 'ქრ. ა/პ პ.' },
  { code: 'K04.6', label: 'პ/ა აბსცესი' },
  { code: 'K05.0', label: 'მწ. ჯინჯ.' },
  { code: 'K05.1', label: 'ქრ. ჯინჯ.' },
  { code: 'K05.3', label: 'ქრ. პაროდ.' },
  { code: 'K08.1', label: 'კბ. დაკ. (ტრ.)' },
  { code: 'K08.3', label: 'შენ. კბ. ფ/კ.' },
  { code: 'Z01.2', label: 'სტომ. გამოკვ.' },
  { code: 'Z29.8', label: 'გეგ. სტომ. მომ.' },
]
