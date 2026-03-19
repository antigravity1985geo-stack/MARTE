// src/types/returns.ts

export type RefundMethod = 'cash' | 'card' | 'store_credit'
export type ReturnStatus = 'completed' | 'cancelled'
export type RsgeStatus   = 'pending' | 'sent' | 'failed' | 'not_required'

// ─── DB rows ──────────────────────────────────────────────────

export interface Return {
  id:                 string
  tenant_id:          string
  original_tx_id:     string
  return_number:      string
  processed_by:       string
  created_at:         string
  refund_amount:      number
  refund_method:      RefundMethod
  cash_drawer_tx_id:  string | null
  rsge_status:        RsgeStatus
  rsge_document_id:   string | null
  rsge_error:         string | null
  status:             ReturnStatus
  reason:             string | null
  notes:              string | null
}

export interface ReturnItem {
  id:               string
  tenant_id:        string
  return_id:        string
  original_item_id: string
  product_id:       string
  original_qty:     number
  returned_qty:     number
  unit_price:       number
  discount_amount:  number
  line_total:       number
  created_at:       string
}

// ─── Transaction lookup ────────────────────────────────────────

export interface OriginalTransactionItem {
  id:               string          // transaction_items.id
  product_id:       string
  product_name:     string
  product_barcode:  string | null
  qty:              number
  unit_price:       number
  discount_amount:  number
  line_total:       number
  already_returned: number          // sum from return_items
  returnable_qty:   number          // qty - already_returned
}

export interface OriginalTransaction {
  id:             string
  receipt_number: string
  created_at:     string
  total:          number
  payment_method: string
  client_name:    string | null
  client_phone:   string | null
  items:          OriginalTransactionItem[]
  returns:        Return[]           // past returns on this tx
}

// ─── Return draft (UI state) ───────────────────────────────────

export interface ReturnLineInput {
  original_item_id: string
  product_id:       string
  product_name:     string
  original_qty:     number
  unit_price:       number
  discount_amount:  number
  returned_qty:     number           // user-controlled
  line_total:       number           // computed
}

export interface ReturnDraft {
  original_tx_id:   string
  lines:            ReturnLineInput[]
  refund_method:    RefundMethod
  reason:           string
  notes:            string
}

// ─── RPC result ───────────────────────────────────────────────

export interface CreateReturnResult {
  return_id:      string
  return_number:  string
  refund_amount:  number
}

// ─── Labels ───────────────────────────────────────────────────

export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  cash:         'ნაღდი',
  card:         'ბარათი',
  store_credit: 'სტორ კრედიტი',
}

export const RETURN_REASONS = [
  'პროდუქტი დაზიანებულია',
  'არასწორი პროდუქტი',
  'მომხმარებელმა გადაიფიქრა',
  'ხარისხის პრობლემა',
  'ვადა გასული',
  'სხვა',
]

// ─── Product Returns (Inventory) ──────────────────────────────

export type ProductReturnStatus = 'pending' | 'approved' | 'completed' | 'rejected'
export type ProductReturnType   = 'supplier' | 'customer'

export interface ProductReturn {
  id:                 string
  tenant_id:          string
  user_id:            string
  type:               ProductReturnType
  product_id:         string
  product_name:       string
  counterparty_id:    string
  counterparty_name:  string
  quantity:           number
  reason:             string | null
  status:             ProductReturnStatus
  created_at:         string
  image_url:          string | null
  total?:             number
}
