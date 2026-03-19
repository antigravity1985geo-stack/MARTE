// hooks/useReturns.ts
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  OriginalTransaction,
  OriginalTransactionItem,
  ReturnDraft,
  CreateReturnResult,
  Return,
} from '@/types/returns'
import toast from 'react-hot-toast'

// ─── Search original transaction ─────────────────────────────────

export function useTransactionSearch() {
  const [result,  setResult]  = useState<OriginalTransaction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Search by receipt_number or client_phone
      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select(`
          id, receipt_number, created_at, total,
          payment_method, client_name, client_phone,
          transaction_items (
            id, product_id, qty, unit_price, discount_amount, line_total,
            products ( name, barcode )
          )
        `)
        .or(`receipt_number.ilike.%${query}%,client_phone.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (txErr) {
        setError('ქვითარი ვერ მოიძებნა')
        return
      }

      // Fetch existing returns for this transaction
      const { data: existingReturns } = await supabase
        .from('returns')
        .select('*')
        .eq('original_tx_id', txs.id)
        .eq('status', 'completed')

      // Fetch already-returned quantities per item
      const itemIds = txs.transaction_items.map((i: any) => i.id)
      const { data: returnedItems } = await supabase
        .from('return_items')
        .select('original_item_id, returned_qty')
        .in('original_item_id', itemIds)
        .eq('returns.status', 'completed') // join filter

      // Build returned qty map
      const returnedQtyMap: Record<string, number> = {}
      for (const ri of returnedItems ?? []) {
        returnedQtyMap[ri.original_item_id] =
          (returnedQtyMap[ri.original_item_id] ?? 0) + Number(ri.returned_qty)
      }

      const items: OriginalTransactionItem[] = txs.transaction_items.map((item: any) => {
        const alreadyReturned = returnedQtyMap[item.id] ?? 0
        return {
          id:               item.id,
          product_id:       item.product_id,
          product_name:     item.products?.name ?? 'უცნობი',
          product_barcode:  item.products?.barcode ?? null,
          qty:              Number(item.qty),
          unit_price:       Number(item.unit_price),
          discount_amount:  Number(item.discount_amount ?? 0),
          line_total:       Number(item.line_total),
          already_returned: alreadyReturned,
          returnable_qty:   Number(item.qty) - alreadyReturned,
        }
      })

      setResult({
        id:             txs.id,
        receipt_number: txs.receipt_number,
        created_at:     txs.created_at,
        total:          Number(txs.total),
        payment_method: txs.payment_method,
        client_name:    txs.client_name,
        client_phone:   txs.client_phone,
        items,
        returns: existingReturns ?? [],
      })
    } catch (e: any) {
      setError(e.message ?? 'შეცდომა')
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, loading, error, search, clear }
}

// ─── Create Return (RPC) ─────────────────────────────────────────

export function useCreateReturn(tenantId: string) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)

  const createReturn = useCallback(async (
    draft: ReturnDraft,
    cashSessionId?: string | null,
    cashDrawerId?:  string | null,
  ): Promise<CreateReturnResult | null> => {
    setBusy(true)
    try {
      const items = draft.lines
        .filter(l => l.returned_qty > 0)
        .map(l => ({
          original_item_id: l.original_item_id,
          product_id:       l.product_id,
          original_qty:     l.original_qty,
          returned_qty:     l.returned_qty,
          unit_price:       l.unit_price,
          discount_amount:  l.discount_amount,
          line_total:       l.line_total,
        }))

      if (!items.length) {
        toast.error('მონიშნეთ მინიმუმ ერთი პროდუქტი')
        return null
      }

      const { data, error } = await supabase.rpc('create_return', {
        p_tenant_id:       tenantId,
        p_original_tx_id:  draft.original_tx_id,
        p_refund_method:   draft.refund_method,
        p_reason:          draft.reason || null,
        p_notes:           draft.notes  || null,
        p_items:           items,
        p_cash_session_id: cashSessionId ?? null,
        p_cash_drawer_id:  cashDrawerId  ?? null,
      })

      if (error) throw error

      toast.success(`დაბრუნება #${data.return_number} შექმნილია`)
      return data as CreateReturnResult
    } catch (err: any) {
      toast.error(err.message ?? 'შეცდომა დაბრუნების შექმნისას')
      return null
    } finally {
      setBusy(false)
    }
  }, [tenantId, user])

  return { createReturn, busy }
}

// ─── RS.GE Credit Note ─────────────────────────────────────────

export function useRsgeRefund() {
  const [sending, setSending] = useState(false)

  const sendCreditNote = useCallback(async (returnId: string): Promise<boolean> => {
    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('rsge-credit-note', {
        body: { return_id: returnId },
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error ?? 'RS.GE შეცდომა')

      // Update rsge_status in DB
      await supabase
        .from('returns')
        .update({
          rsge_status:      'sent',
          rsge_document_id: data.document_id ?? null,
        })
        .eq('id', returnId)

      toast.success('RS.GE კრედიტ ნოტი გაგზავნილია')
      return true
    } catch (err: any) {
      await supabase
        .from('returns')
        .update({ rsge_status: 'failed', rsge_error: err.message })
        .eq('id', returnId)

      toast.error(`RS.GE: ${err.message}`)
      return false
    } finally {
      setSending(false)
    }
  }, [])

  return { sendCreditNote, sending }
}

// ─── Return History for a transaction ─────────────────────────

export function useReturnHistory(txId: string | null) {
  const [returns,  setReturns]  = useState<Return[]>([])
  const [loading,  setLoading]  = useState(false)

  const fetch = useCallback(async () => {
    if (!txId) return
    setLoading(true)
    const { data } = await supabase
      .from('returns')
      .select('*')
      .eq('original_tx_id', txId)
      .order('created_at', { ascending: false })
    setReturns(data ?? [])
    setLoading(false)
  }, [txId])

  return { returns, loading, refetch: fetch }
}
