// types/discountAuth.ts

export type DiscountType   = 'percentage' | 'fixed'
export type DiscountScope  = 'cart' | 'item'
export type DiscountStatus = 'approved' | 'rejected' | 'cancelled'

// ─── DB rows ──────────────────────────────────────────────────

export interface DiscountPolicy {
  id:                    string
  tenant_id:             string
  role_name:             string
  self_max_pct:          number
  self_max_fixed:        number
  hard_max_pct:          number
  hard_max_fixed:        number
  requires_override_from: string[]
  allow_percentage:      boolean
  allow_fixed:           boolean
  is_active:             boolean
}

export interface DiscountAuditLog {
  id:                string
  tenant_id:         string
  transaction_id:    string | null
  cart_session_id:   string | null
  scope:             DiscountScope
  product_id:        string | null
  product_name:      string | null
  discount_type:     DiscountType
  discount_value:    number
  discount_amount:   number
  original_amount:   number
  requested_by:      string
  requested_role:    string
  override_required: boolean
  override_by:       string | null
  override_role:     string | null
  override_at:       string | null
  status:            DiscountStatus
  rejection_reason:  string | null
  created_at:        string
  // joined
  requester_name?:   string
  authorizer_name?:  string
}

// ─── Authorization result ─────────────────────────────────────

export interface PinVerifyResult {
  user_id: string
  role:    string
  name:    string
}

// ─── Discount request (UI state) ──────────────────────────────

export interface DiscountRequest {
  scope:          DiscountScope
  type:           DiscountType
  value:          number             // % or GEL
  originalAmount: number             // cart total or item price
  productId?:     string
  productName?:   string
}

export interface DiscountResult {
  approved:         boolean
  discountAmount:   number           // resolved GEL impact
  finalAmount:      number           // originalAmount - discountAmount
  overrideRequired: boolean
  authorizer?:      PinVerifyResult
  logId?:           string
}

// ─── Validation helpers ───────────────────────────────────────

export function computeDiscountAmount(
  type:   DiscountType,
  value:  number,
  amount: number
): number {
  if (type === 'percentage') {
    return parseFloat(((Math.min(value, 100) / 100) * amount).toFixed(2))
  }
  return parseFloat(Math.min(value, amount).toFixed(2))
}

export function needsOverride(
  policy:  DiscountPolicy | null,
  type:    DiscountType,
  value:   number
): boolean {
  if (!policy) return true
  if (type === 'percentage') return value > policy.self_max_pct
  return value > policy.self_max_fixed
}

export function exceedsHardLimit(
  policy:  DiscountPolicy | null,
  type:    DiscountType,
  value:   number
): boolean {
  if (!policy) return false
  if (type === 'percentage') return value > policy.hard_max_pct
  return value > policy.hard_max_fixed
}

// ─── Quick presets ────────────────────────────────────────────

export const DISCOUNT_PRESETS: Array<{ label: string; type: DiscountType; value: number }> = [
  { label: '5%',   type: 'percentage', value: 5   },
  { label: '10%',  type: 'percentage', value: 10  },
  { label: '15%',  type: 'percentage', value: 15  },
  { label: '20%',  type: 'percentage', value: 20  },
  { label: '25%',  type: 'percentage', value: 25  },
  { label: '50%',  type: 'percentage', value: 50  },
]

export const ROLE_LABELS: Record<string, string> = {
  cashier:    'კასიერი',
  supervisor: 'სუპერვაიზერი',
  manager:    'მენეჯერი',
  admin:      'ადმინი',
}
