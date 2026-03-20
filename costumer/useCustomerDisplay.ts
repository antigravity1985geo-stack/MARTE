// hooks/useCustomerDisplay.ts
import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  DisplayMessage, DisplayEventType,
  DisplayScreenState, INITIAL_SCREEN_STATE,
  DisplayCartItem, DisplayPaymentResult,
  DISPLAY_CHANNEL,
} from '@/types/customerDisplay'

// ═══════════════════════════════════════════════════════════════
//  POS SIDE — broadcaster
//  Usage: const display = useDisplayBroadcaster(tenantId, drawerId)
//         display.updateCart(items, totals)
//         display.paymentDone(result)
// ═══════════════════════════════════════════════════════════════

export function useDisplayBroadcaster(
  tenantId: string,
  drawerId: string,
  /** Set true if display is on a different device (uses Supabase) */
  crossDevice = false,
) {
  const bcRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bcRef.current = new BroadcastChannel(DISPLAY_CHANNEL)
    }
    return () => { bcRef.current?.close() }
  }, [])

  const send = useCallback(async (msg: Omit<DisplayMessage, 'ts' | 'tenant_id' | 'drawer_id'>) => {
    const full: DisplayMessage = {
      ...msg,
      tenant_id: tenantId,
      drawer_id: drawerId,
      ts:        Date.now(),
    }
    // Same-device: BroadcastChannel
    bcRef.current?.postMessage(full)

    // Cross-device: Supabase Realtime broadcast
    if (crossDevice) {
      await supabase
        .channel(`display:${drawerId}`)
        .send({ type: 'broadcast', event: 'display', payload: full })
    }
  }, [tenantId, drawerId, crossDevice])

  const updateCart = useCallback((
    items:          DisplayCartItem[],
    subtotal:       number,
    discountTotal:  number,
    taxTotal:       number,
    total:          number,
    clientName?:    string | null,
  ) => {
    send({
      type: 'cart_update',
      items, subtotal,
      discount_total: discountTotal,
      tax_total:      taxTotal,
      total,
      client_name:    clientName ?? null,
    })
  }, [send])

  const startPayment = useCallback((method: string) => {
    send({ type: 'payment_start', payment_method: method })
  }, [send])

  const paymentDone = useCallback((result: DisplayPaymentResult) => {
    send({ type: 'payment_done', result })
  }, [send])

  const clearDisplay = useCallback(() => {
    send({ type: 'clear' })
  }, [send])

  return { updateCart, startPayment, paymentDone, clearDisplay }
}

// ═══════════════════════════════════════════════════════════════
//  DISPLAY SIDE — receiver
//  Usage inside CustomerDisplay.tsx
// ═══════════════════════════════════════════════════════════════

export function useDisplayReceiver(
  drawerId?: string,
  crossDevice = false,
) {
  const [screen, setScreen] = useState<DisplayScreenState>(INITIAL_SCREEN_STATE)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    // Go back to idle after 3 min of no activity
    idleTimer.current = setTimeout(() => {
      setScreen(s => s.state !== 'idle' && s.state !== 'done'
        ? { ...INITIAL_SCREEN_STATE }
        : s
      )
    }, 3 * 60 * 1000)
  }, [])

  const applyMessage = useCallback((msg: DisplayMessage) => {
    resetIdleTimer()
    setScreen(prev => {
      switch (msg.type) {
        case 'cart_update':
          return {
            ...prev,
            state:          'shopping',
            items:          msg.items          ?? [],
            subtotal:       msg.subtotal        ?? 0,
            discount_total: msg.discount_total  ?? 0,
            tax_total:      msg.tax_total        ?? 0,
            total:          msg.total            ?? 0,
            client_name:    msg.client_name      ?? null,
            payment_method: null,
            result:         null,
            last_update:    msg.ts,
          }
        case 'payment_start':
          return {
            ...prev,
            state:          'payment',
            payment_method: msg.payment_method ?? null,
            last_update:    msg.ts,
          }
        case 'payment_done':
          // Auto-clear to idle after 6 seconds
          setTimeout(() => setScreen(INITIAL_SCREEN_STATE), 6000)
          return {
            ...prev,
            state:       'done',
            result:      msg.result ?? null,
            last_update: msg.ts,
          }
        case 'clear':
          return { ...INITIAL_SCREEN_STATE }
        default:
          return prev
      }
    })
  }, [resetIdleTimer])

  // Same-device BroadcastChannel
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return
    const bc = new BroadcastChannel(DISPLAY_CHANNEL)
    bc.onmessage = (e: MessageEvent<DisplayMessage>) => applyMessage(e.data)
    return () => bc.close()
  }, [applyMessage])

  // Cross-device Supabase Realtime
  useEffect(() => {
    if (!crossDevice || !drawerId) return
    const ch = supabase
      .channel(`display:${drawerId}`)
      .on('broadcast', { event: 'display' }, ({ payload }) => {
        applyMessage(payload as DisplayMessage)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [crossDevice, drawerId, applyMessage])

  return screen
}
