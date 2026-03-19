// types/splitPayment.ts

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'store_credit'
  | 'gift_card'
  | 'bank_transfer'

export interface PaymentLeg {
  id:            string          // local uuid for list key
  method:        PaymentMethod
  amount:        number          // editable by cashier
  // cash
  cash_tendered?: number
  cash_change?:   number
  // card
  card_last4?:    string
  card_brand?:    string
  terminal_ref?:  string
  approval_code?: string
}

export interface SplitPaymentState {
  total:       number
  legs:        PaymentLeg[]
  allocated:   number            // sum of legs
  remaining:   number            // total - allocated
  isBalanced:  boolean           // remaining ≈ 0
}

export interface FinalizePaymentInput {
  tenant_id:        string
  cart_items:       CartItemInput[]
  subtotal:         number
  discount_total:   number
  tax_total:        number
  total:            number
  payments:         PaymentLegInput[]
  client_id?:       string | null
  client_name?:     string | null
  notes?:           string | null
  cash_session_id?: string | null
  cash_drawer_id?:  string | null
}

export interface CartItemInput {
  product_id:  string
  name:        string
  qty:         number
  unit_price:  number
  discount:    number
  line_total:  number
  tax_rate:    number
}

export interface PaymentLegInput {
  method:        PaymentMethod
  amount:        number
  cash_tendered?: number
  cash_change?:   number
  card_last4?:    string
  card_brand?:    string
  terminal_ref?:  string
  approval_code?: string
}

export interface FinalizePaymentResult {
  transaction_id: string
  receipt_number: string
  total:          number
  cash_amount:    number
  card_amount:    number
  cash_change:    number
}

// ─── Labels & metadata ────────────────────────────────────────

export const METHOD_META: Record<PaymentMethod, {
  label:   string
  color:   string         // Tailwind bg class
  text:    string         // Tailwind text class
  border:  string
}> = {
  cash: {
    label:  'ნაღდი',
    color:  'bg-emerald-500',
    text:   'text-emerald-700',
    border: 'border-emerald-400',
  },
  card: {
    label:  'ბარათი',
    color:  'bg-blue-500',
    text:   'text-blue-700',
    border: 'border-blue-400',
  },
  store_credit: {
    label:  'კრედიტი',
    color:  'bg-violet-500',
    text:   'text-violet-700',
    border: 'border-violet-400',
  },
  gift_card: {
    label:  'საჩუქრის ბარათი',
    color:  'bg-amber-500',
    text:   'text-amber-700',
    border: 'border-amber-400',
  },
  bank_transfer: {
    label:  'გადარიცხვა',
    color:  'bg-slate-500',
    text:   'text-slate-700',
    border: 'border-slate-400',
  },
}

export const CARD_BRANDS = ['Visa', 'Mastercard', 'Amex', 'სხვა']

// Quick-split presets: [cash%, card%]
export const QUICK_SPLITS: Array<{ label: string; cash: number; card: number }> = [
  { label: '50 / 50',  cash: 0.5,  card: 0.5  },
  { label: '70 / 30',  cash: 0.7,  card: 0.3  },
  { label: '30 / 70',  cash: 0.3,  card: 0.7  },
]
