// hooks/useShiftReport.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ShiftReport, ShiftSaleRow } from '@/types/shiftReport'
import toast from 'react-hot-toast'

// ─── Live X-report for an open session ───────────────────────
export function useLiveShiftReport(sessionId: string | null) {
  const [report,  setReport]  = useState<ShiftReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .rpc('build_shift_report', { p_session_id: sessionId, p_save: false })
      if (error) throw error
      setReport(data as ShiftReport)
    } catch (e: any) {
      setError(e.message)
      toast.error('ანგარიშის ჩატვირთვა ვერ მოხერხდა')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { fetch() }, [fetch])

  return { report, loading, error, refetch: fetch }
}

// ─── Saved Z-report from shift_sales ─────────────────────────
export function useSavedShiftReport(sessionId: string | null) {
  const [report,  setReport]  = useState<ShiftReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    supabase
      .from('shift_sales')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle()
      .then(({ data }) => {
        setReport(data as unknown as ShiftReport ?? null)
        setLoading(false)
      })
  }, [sessionId])

  return { report, loading }
}

// ─── Shift history list ───────────────────────────────────────
export function useShiftHistory(drawerId: string, limit = 30) {
  const [shifts,  setShifts]  = useState<ShiftSaleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!drawerId) return
    supabase
      .from('shift_sales')
      .select('id, session_id, drawer_id, shift_start, shift_end, net_sales, cash_variance, generated_at, drawer:cash_drawers(name)')
      .eq('drawer_id', drawerId)
      .order('shift_start', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setShifts((data ?? []) as ShiftSaleRow[])
        setLoading(false)
      })
  }, [drawerId, limit])

  return { shifts, loading }
}

// ─── Build and save (for managers regenerating a report) ─────
export function useRegenerateReport() {
  const [busy, setBusy] = useState(false)

  const regenerate = useCallback(async (sessionId: string): Promise<ShiftReport | null> => {
    setBusy(true)
    try {
      const { data, error } = await supabase
        .rpc('build_shift_report', { p_session_id: sessionId, p_save: true })
      if (error) throw error
      toast.success('ანგარიში განახლდა')
      return data as ShiftReport
    } catch (e: any) {
      toast.error(e.message)
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  return { regenerate, busy }
}
