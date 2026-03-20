// types/medicalBilling.ts

// ─── Enums ────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'draft' | 'issued' | 'partially_paid'
  | 'paid' | 'overdue' | 'cancelled' | 'written_off'

export type ClaimStatus =
  | 'draft' | 'submitted' | 'under_review'
  | 'approved' | 'partial' | 'rejected' | 'paid' | 'resubmitted'

export type InstallmentStatus = 'active' | 'completed' | 'defaulted' | 'cancelled'
export type ScheduleStatus    = 'pending' | 'paid' | 'overdue' | 'waived'
export type PaymentMethod     = 'cash' | 'card' | 'bank_transfer' | 'insurance' | 'installment'
export type Frequency         = 'weekly' | 'biweekly' | 'monthly'

// ─── Entities ─────────────────────────────────────────────────

export interface InsuranceCompany {
  id:           string
  tenant_id:    string
  name:         string
  code:         string | null
  contact_name: string | null
  phone:        string | null
  email:        string | null
  claim_email:  string | null
  coverage_pct: number
  is_active:    boolean
}

export interface PatientInsurance {
  id:             string
  patient_id:     string
  insurer_id:     string
  policy_number:  string
  group_number:   string | null
  holder_name:    string | null
  coverage_pct:   number
  annual_limit:   number | null
  deductible:     number
  deductible_met: number
  valid_from:     string
  valid_to:       string | null
  is_primary:     boolean
  is_active:      boolean
  // joined
  insurer?:       InsuranceCompany
}

export interface InvoiceItem {
  id:              string
  invoice_id:      string
  description:     string
  procedure_code:  string | null
  quantity:        number
  unit_price:      number
  discount_pct:    number
  discount_amount: number
  tax_pct:         number
  line_total:      number
  is_insured:      boolean
}

export interface InvoicePayment {
  id:          string
  invoice_id:  string
  amount:      number
  method:      PaymentMethod
  reference:   string | null
  paid_at:     string
  notes:       string | null
}

export interface MedicalInvoice {
  id:               string
  tenant_id:        string
  invoice_number:   string
  patient_id:       string
  patient_name:     string
  patient_phone:    string | null
  appointment_id:   string | null
  doctor_id:        string | null
  doctor_name:      string | null
  insurer_id:       string | null
  policy_id:        string | null
  insurance_pct:    number
  insurance_amount: number
  copay_amount:     number
  subtotal:         number
  discount_amount:  number
  tax_amount:       number
  total:            number
  amount_paid:      number
  balance_due:      number
  issue_date:       string
  due_date:         string
  paid_date:        string | null
  status:           InvoiceStatus
  payment_method:   string | null
  notes:            string | null
  created_at:       string
  updated_at:       string
  // joined
  items?:           InvoiceItem[]
  payments?:        InvoicePayment[]
  claim?:           InsuranceClaim
  installment?:     InstallmentPlan
}

export interface InsuranceClaim {
  id:               string
  tenant_id:        string
  claim_number:     string
  invoice_id:       string
  insurer_id:       string
  policy_id:        string | null
  claimed_amount:   number
  approved_amount:  number | null
  paid_amount:      number | null
  rejection_reason: string | null
  submitted_at:     string | null
  approved_at:      string | null
  paid_at:          string | null
  status:           ClaimStatus
  diagnosis_codes:  string[]
  procedure_codes:  string[]
  notes:            string | null
  created_at:       string
  // joined
  insurer?:         InsuranceCompany
  invoice?:         Pick<MedicalInvoice, 'invoice_number' | 'patient_name' | 'total'>
}

export interface InstallmentPlan {
  id:                 string
  invoice_id:         string
  patient_id:         string
  total_amount:       number
  down_payment:       number
  financed_amount:    number
  installment_count:  number
  installment_amount: number
  frequency:          Frequency
  first_due_date:     string
  interest_pct:       number
  status:             InstallmentStatus
  created_at:         string
  schedule?:          InstallmentScheduleItem[]
}

export interface InstallmentScheduleItem {
  id:             string
  plan_id:        string
  installment_no: number
  due_date:       string
  amount:         number
  paid_amount:    number
  paid_at:        string | null
  status:         ScheduleStatus
}

// ─── Form inputs ──────────────────────────────────────────────

export interface InvoiceItemInput {
  description:    string
  procedure_code: string
  quantity:       number
  unit_price:     number
  discount_pct:   number
  tax_pct:        number
  is_insured:     boolean
}

export interface CreateInvoiceInput {
  patient_id:     string
  patient_name:   string
  patient_phone?: string
  appointment_id?: string
  doctor_id?:     string
  doctor_name?:   string
  insurer_id?:    string
  policy_id?:     string
  insurance_pct:  number
  items:          InvoiceItemInput[]
  discount_amount:number
  due_date:       string
  notes?:         string
}

// ─── Labels ───────────────────────────────────────────────────

export const INVOICE_STATUS_META: Record<InvoiceStatus, {
  label: string; color: string; text: string; dot: string
}> = {
  draft:          { label: 'დრაფტი',        color: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'    },
  issued:         { label: 'გაცემული',      color: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'     },
  partially_paid: { label: 'ნაწილობ. გადახ', color: 'bg-amber-100',  text: 'text-amber-700',   dot: 'bg-amber-500'    },
  paid:           { label: 'გადახდილი',     color: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500'  },
  overdue:        { label: 'ვადა გასული',   color: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500'     },
  cancelled:      { label: 'გაუქმებული',    color: 'bg-slate-100',   text: 'text-slate-400',   dot: 'bg-slate-300'    },
  written_off:    { label: 'ჩამოწერილი',    color: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-400'   },
}

export const CLAIM_STATUS_META: Record<ClaimStatus, {
  label: string; color: string; text: string
}> = {
  draft:        { label: 'დრაფტი',       color: 'bg-slate-100',   text: 'text-slate-600'   },
  submitted:    { label: 'გაგზავნილი',   color: 'bg-blue-100',    text: 'text-blue-700'    },
  under_review: { label: 'განიხილება',   color: 'bg-amber-100',   text: 'text-amber-700'   },
  approved:     { label: 'დამტკიცდა',   color: 'bg-teal-100',    text: 'text-teal-700'    },
  partial:      { label: 'ნაწილობ.',     color: 'bg-orange-100',  text: 'text-orange-700'  },
  rejected:     { label: 'უარყოფილი',   color: 'bg-rose-100',    text: 'text-rose-700'    },
  paid:         { label: 'ანაზღაურდა',  color: 'bg-emerald-100', text: 'text-emerald-700' },
  resubmitted:  { label: 'ხელახლა გაგ.', color: 'bg-violet-100', text: 'text-violet-700'  },
}

export const FREQ_LABELS: Record<Frequency, string> = {
  weekly:    'კვირეული',
  biweekly:  'ორ-კვირეული',
  monthly:   'თვიური',
}

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:          'ნაღდი',
  card:          'ბარათი',
  bank_transfer: 'გადარიცხვა',
  insurance:     'სადაზღვევო',
  installment:   'განვადება',
}
