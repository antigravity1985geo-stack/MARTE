// components/CustomerDisplayButton.tsx
// Drop this into your POS toolbar.
// It opens the display in a new window AND keeps it in sync.

import { useEffect, useRef, useCallback } from 'react'
import { Monitor } from 'lucide-react'
import { useDisplayBroadcaster } from '@/hooks/useCustomerDisplay'
import { DisplayCartItem }        from '@/types/customerDisplay'

interface CustomerDisplayButtonProps {
  tenantId:    string
  drawerId:    string
  // Current cart state — pass live values
  cartItems:       DisplayCartItem[]
  subtotal:        number
  discountTotal:   number
  taxTotal:        number
  total:           number
  clientName?:     string | null
}

export function CustomerDisplayButton({
  tenantId, drawerId,
  cartItems, subtotal, discountTotal, taxTotal, total, clientName,
}: CustomerDisplayButtonProps) {
  const display = useDisplayBroadcaster(tenantId, drawerId)
  const winRef  = useRef<Window | null>(null)

  const openDisplay = () => {
    if (winRef.current && !winRef.current.closed) {
      winRef.current.focus()
      return
    }
    winRef.current = window.open(
      '/display',
      'CustomerDisplay',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    )
  }

  // Sync cart to display whenever it changes
  useEffect(() => {
    display.updateCart(
      cartItems, subtotal, discountTotal, taxTotal, total, clientName
    )
  }, [cartItems, subtotal, discountTotal, taxTotal, total, clientName])

  return (
    <button
      onClick={openDisplay}
      className="flex items-center gap-2 px-3 py-2 border border-slate-200
        rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50
        hover:border-slate-300 transition-colors"
      title="Customer Display"
    >
      <Monitor size={15} />
      <span className="text-sm font-semibold hidden sm:block">ეკრანი</span>
    </button>
  )
}

// ─── Hook for full manual control ────────────────────────────
// Use this when you want fine-grained control:
// e.g. trigger payment_start / payment_done separately.
//
// const pos = usePOSDisplaySync(tenantId, drawerId)
// pos.syncCart(items, totals)     // call on every cart change
// pos.startPayment('card')        // call when checkout begins
// pos.confirmPayment(result)      // call after sale saved
// pos.reset()                     // call after done screen clears

export function usePOSDisplaySync(tenantId: string, drawerId: string) {
  const display = useDisplayBroadcaster(tenantId, drawerId)

  const syncCart = useCallback((
    items:         DisplayCartItem[],
    subtotal:      number,
    discountTotal: number,
    taxTotal:      number,
    total:         number,
    clientName?:   string | null,
  ) => {
    display.updateCart(items, subtotal, discountTotal, taxTotal, total, clientName)
  }, [display])

  return {
    syncCart,
    startPayment:    display.startPayment,
    confirmPayment:  display.paymentDone,
    reset:           display.clearDisplay,
  }
}
