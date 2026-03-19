// types/shiftReport.ts

export interface TopProduct {
  product_id:    string
  product_name:  string
  total_qty:     number
  total_revenue: number
}

export interface HourlyBreakdown {
  hr:       string   // ISO timestamp truncated to hour
  tx_count: number
  revenue:  number
}

export interface CashierBreakdown {
  cashier_id:   string
  cashier_name: string
  tx_count:     number
  revenue:      number
  discounts:    number
}

export interface ShiftReport {
  session_id:          string
  drawer_id:           string
  shift_start:         string
  shift_end:           string

  // Counts
  total_transactions:  number
  voided_transactions: number
  refund_transactions: number

  // Revenue
  gross_sales:         number
  total_discounts:     number
  total_refunds:       number
  net_sales:           number
  total_tax:           number

  // Payment split
  cash_sales:          number
  card_sales:          number
  other_sales:         number

  // Cash drawer
  opening_float:       number
  cash_in:             number
  cash_out:            number
  expected_cash:       number
  declared_cash:       number | null
  cash_variance:       number | null

  // Rich breakdowns
  top_products:       TopProduct[]
  hourly_breakdown:   HourlyBreakdown[]
  cashier_breakdown:  CashierBreakdown[]
}

export interface ShiftSummaryRow {
  id:          string
  session_id:  string
  drawer_id:   string
  shift_start: string
  shift_end:   string
  net_sales:   number
  cash_variance: number | null
  generated_at:  string
  drawer?: { name: string }
}

// Report type: X = live/mid-shift, Z = end-of-day final
export type ReportType = 'X' | 'Z'
