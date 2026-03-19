// hooks/useSplitPayment.ts
import { useState, useMemo, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useActiveSession, useDrawers } from '@/hooks/useCashDrawer'
import { toast } from 'sonner'
import {
  PaymentLeg,
  PaymentMethod,
  SplitPaymentState,
  FinalizePaymentResult,
  CartItemInput,
} from '@/types/splitPayment'

const EPSILON = 0.005   // rounding tolerance

// ─── State manager ───────────────────────────────────────────

export function useSplitPaymentState(total: number) {
  const [legs, setLegs] = useState<PaymentLeg[]>([])

  const allocated = useMemo(
    () => legs.reduce((s, l) => s + (Number(l.amount) || 0), 0),
    [legs]
  )
  const remaining = Math.max(0, total - allocated)
  const isBalanced = Math.abs(total - allocated) < EPSILON

  // ── Add a leg ──────────────────────────────────────────────
  const addLeg = useCallback((method: PaymentMethod) => {
    // Don't duplicate cash/card unless explicitly split
    if (legs.some(l => l.method === method)) {
      toast.info('ეს მეთოდი უკვე დამატებულია — შეცვალეთ თანხა')
      return
    }
    const suggestedAmount = remaining > 0
      ? parseFloat(remaining.toFixed(2))
      : 0
    setLegs(prev => [
      ...prev,
      { id: crypto.randomUUID(), method, amount: suggestedAmount },
    ])
  }, [legs, remaining])

  // ── Remove a leg ───────────────────────────────────────────
  const removeLeg = useCallback((id: string) => {
    setLegs(prev => prev.filter(l => l.id !== id))
  }, [])

  // ── Update amount ──────────────────────────────────────────
  const setAmount = useCallback((id: string, value: number) => {
    setLegs(prev => prev.map(l => {
      if (l.id !== id) return l
      const amount = Math.min(Math.max(0, value), total)
      const cash_change = l.method === 'cash' && l.cash_tendered
        ? Math.max(0, l.cash_tendered - amount)
        : undefined
      return { ...l, amount, cash_change }
    }))
  }, [total])

  // ── Update cash tendered ───────────────────────────────────
  const setCashTendered = useCallback((id: string, tendered: number) => {
    setLegs(prev => prev.map(l =>
      l.id !== id ? l : {
        ...l,
        cash_tendered: tendered,
        cash_change: Math.max(0, tendered - l.amount),
      }
    ))
  }, [])

  // ── Update card details ────────────────────────────────────
  const setCardDetails = useCallback((
    id: string,
    fields: Partial<Pick<PaymentLeg, 'card_last4' | 'card_brand' | 'terminal_ref' | 'approval_code'>>
  ) => {
    setLegs(prev => prev.map(l =>
      l.id !== id ? l : { ...l, ...fields }
    ))
  }, [])

  // ── Quick split preset ─────────────────────────────────────
  const applyQuickSplit = useCallback((cashPct: number, cardPct: number) => {
    const cashAmt = parseFloat((total * cashPct).toFixed(2))
    const cardAmt = parseFloat((total - cashAmt).toFixed(2))
    setLegs([
      { id: crypto.randomUUID(), method: 'cash', amount: cashAmt },
      { id: crypto.randomUUID(), method: 'card', amount: cardAmt },
    ])
  }, [total])

  // ── Auto-fill remaining on last leg ───────────────────────
  const fillRemaining = useCallback((id: string) => {
    setLegs(prev => {
      const others = prev.filter(l => l.id !== id)
      const sumOthers = others.reduce((s, l) => s + (Number(l.amount) || 0), 0)
      const fill = parseFloat(Math.max(0, total - sumOthers).toFixed(2))
      return prev.map(l => l.id !== id ? l : { ...l, amount: fill })
    })
  }, [total])

  // ── Reset ─────────────────────────────────────────────────
  const reset = useCallback(() => setLegs([]), [])

  const state: SplitPaymentState = { total, legs, allocated, remaining, isBalanced }
  return {
    state, legs, allocated, remaining, isBalanced,
    addLeg, removeLeg, setAmount, setCashTendered,
    setCardDetails, applyQuickSplit, fillRemaining, reset,
  }
}

// ─── Finalize ────────────────────────────────────────────────

export function useFinalizePayment() {
  const activeTenantId = useAuthStore(s => s.activeTenantId)
  const { drawers }          = useDrawers()
  // Try to use selected drawer from localStorage or first available
  const selectedDrawerId = localStorage.getItem('pos_drawer_id') || drawers[0]?.id || ''
  const { session }          = useActiveSession(selectedDrawerId)
  const [busy, setBusy]      = useState(false)

  const finalize = useCallback(async (
    legs:       PaymentLeg[],
    cartItems:  CartItemInput[],
    totals:     { subtotal: number; discountTotal: number; taxTotal: number; total: number },
    meta?:      { clientId?: string; clientName?: string; notes?: string }
  ): Promise<FinalizePaymentResult | null> => {
    setBusy(true)
    try {
      const payments = legs.map(l => ({
        method:        l.method,
        amount:        l.amount,
        cash_tendered: l.cash_tendered ?? null,
        cash_change:   l.cash_change   ?? null,
        card_last4:    l.card_last4    ?? null,
        card_brand:    l.card_brand    ?? null,
        terminal_ref:  l.terminal_ref  ?? null,
        approval_code: l.approval_code ?? null,
      }))

      const { data, error } = await supabase.rpc('finalize_split_payment', {
        p_tenant_id:       activeTenantId,
        p_cart_items:      cartItems,
        p_subtotal:        totals.subtotal,
        p_discount_total:  totals.discountTotal,
        p_tax_total:       totals.taxTotal,
        p_total:           totals.total,
        p_payments:        payments,
        p_client_id:       meta?.clientId       ?? null,
        p_client_name:     meta?.clientName     ?? null,
        p_notes:           meta?.notes          ?? null,
        p_cash_session_id: session?.id          ?? null,
        p_cash_drawer_id:  selectedDrawerId     || null,
      })

      if (error) throw error
      toast.success(`გაყიდვა #${data.receipt_number} წარმატებით დასრულდა`)
      return data as FinalizePaymentResult
    } catch (err: any) {
      toast.error(err.message ?? 'შეცდომა გადახდის დამუშავებისას')
      return null
    } finally {
      setBusy(false)
    }
  }, [activeTenantId, session, selectedDrawerId])

  return { finalize, busy, cashAvailable: session?.status === 'open' }
}
