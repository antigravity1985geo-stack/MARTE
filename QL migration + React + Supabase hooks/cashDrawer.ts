// types/cashDrawer.ts

export type DrawerStatus = 'open' | 'closed' | 'suspended'

export type TransactionType =
  | 'sale'
  | 'refund'
  | 'cash_in'
  | 'cash_out'
  | 'opening_float'
  | 'closing_count'

export interface CashDrawer {
  id: string
  tenant_id: string
  name: string
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CashDrawerSession {
  id: string
  tenant_id: string
  drawer_id: string
  opened_by: string
  closed_by: string | null
  opening_float: number
  opened_at: string
  opening_notes: string | null
  closing_declared: number | null
  closed_at: string | null
  closing_notes: string | null
  expected_cash: number | null
  variance: number | null
  status: DrawerStatus
  created_at: string
  updated_at: string
  // joined
  drawer?: CashDrawer
  opener_name?: string
}

export interface CashDrawerTransaction {
  id: string
  tenant_id: string
  session_id: string
  drawer_id: string
  type: TransactionType
  amount: number
  reference_id: string | null
  performed_by: string
  note: string | null
  created_at: string
  // joined
  performer_name?: string
}

export interface SessionSummary {
  opening_float: number
  total_sales: number
  total_refunds: number
  total_cash_in: number
  total_cash_out: number
  expected_cash: number
  declared_cash: number | null
  variance: number | null
}

export const TX_LABELS: Record<TransactionType, string> = {
  sale: 'გაყიდვა',
  refund: 'დაბრუნება',
  cash_in: 'ნაღდი შემოსვლა',
  cash_out: 'ნაღდი გასვლა',
  opening_float: 'საწყისი ნაშთი',
  closing_count: 'დახურვის დათვლა',
}

export const TX_SIGN: Record<TransactionType, 1 | -1> = {
  sale: 1,
  cash_in: 1,
  opening_float: 1,
  refund: -1,
  cash_out: -1,
  closing_count: 1,
}
