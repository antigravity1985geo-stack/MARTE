// src/types/holdOrder.ts

export type HoldStatus = 'held' | 'resumed' | 'voided'

export interface HeldOrderItem {
  product_id:  string
  name:        string
  barcode:     string | null
  price:       number
  qty:         number
  discount:    number
  line_total:  number
  tax_rate:    number
}

export interface HeldOrder {
  id:               string
  tenant_id:        string
  drawer_id:        string | null
  held_by:          string
  label:            string | null
  hold_number:      number
  items:            HeldOrderItem[]
  subtotal:         number
  discount_total:   number
  tax_total:        number
  total:            number
  client_id:        string | null
  client_name:      string | null
  discount_audit_id: string | null
  discount_amount:   number | null
  notes:            string | null
  status:           HoldStatus
  held_at:          string
  resumed_at:       string | null
  voided_at:        string | null
  created_at:       string
}

// What gets passed from POS cart to hold
export interface HoldCartInput {
  items:          HeldOrderItem[]
  subtotal:       number
  discount_total: number
  tax_total:      number
  total:          number
  client_id?:     string | null
  client_name?:   string | null
  discount_audit_id?: string | null
  discount_amount?:   number | null
  label?:         string
  notes?:         string
}
