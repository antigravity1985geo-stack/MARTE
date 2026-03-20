// types/customerDisplay.ts

export type DisplayState =
  | 'idle'       // welcome screen / screensaver
  | 'shopping'   // cart items visible
  | 'payment'    // processing payment
  | 'done'       // thank you / change

export type DisplayEventType =
  | 'cart_update'     // items changed
  | 'payment_start'   // checkout initiated
  | 'payment_done'    // sale complete
  | 'clear'           // reset to idle

export interface DisplayCartItem {
  product_id:  string
  name:        string
  qty:         number
  unit_price:  number
  discount:    number
  line_total:  number
}

export interface DisplayPaymentResult {
  total:        number
  cash_paid?:   number
  change?:      number
  method:       string   // 'cash' | 'card' | 'split' | …
  receipt_number: string
}

// The full message sent over the channel
export interface DisplayMessage {
  type:       DisplayEventType
  tenant_id?: string
  drawer_id?: string

  // cart_update
  items?:          DisplayCartItem[]
  subtotal?:       number
  discount_total?: number
  tax_total?:      number
  total?:          number
  client_name?:    string | null

  // payment_start
  payment_method?: string

  // payment_done
  result?: DisplayPaymentResult

  ts: number   // Date.now()
}

// What the display screen renders
export interface DisplayScreenState {
  state:        DisplayState
  items:        DisplayCartItem[]
  subtotal:     number
  discount_total: number
  tax_total:    number
  total:        number
  client_name:  string | null
  payment_method: string | null
  result:       DisplayPaymentResult | null
  last_update:  number
}

export const INITIAL_SCREEN_STATE: DisplayScreenState = {
  state:          'idle',
  items:          [],
  subtotal:       0,
  discount_total: 0,
  tax_total:      0,
  total:          0,
  client_name:    null,
  payment_method: null,
  result:         null,
  last_update:    0,
}

// BroadcastChannel name — must match on both sides
export const DISPLAY_CHANNEL = 'sawyobi_customer_display'
