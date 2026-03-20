// hooks/useDoctorPerformance.ts
import { useState, useEffect, useCallback } from 'react'
import { subDays, subMonths, subYears, format } from 'date-fns'
import { supabase }  from '@/lib/supabase'
import { useTenant } from '@/hooks/useTenant'
import {
  DateRange, Doctor,
  DoctorDailyStat, DoctorRevenueStat,
  DoctorRetention, ChairUtilization,
  DoctorProcedure, DoctorSummaryCard,
} from '@/types/doctorPerformance'

// ─── Date range helper ────────────────────────────────────────
export function useDateRange(range: DateRange) {
  const to   = new Date()
  const from = range === '7d'  ? subDays(to, 7)
             : range === '30d' ? subDays(to, 30)
             : range === '90d' ? subDays(to, 90)
             : range === '6m'  ? subMonths(to, 6)
             :                   subYears(to, 1)
  return {
    from: format(from, 'yyyy-MM-dd'),
    to:   format(to,   'yyyy-MM-dd'),
  }
}

// ─── Doctors list ─────────────────────────────────────────────
export function useDoctors() {
  const { tenantId } = useTenant()
  const [doctors, setDoctors] = useState<Doctor[]>([])

  useEffect(() => {
    supabase
      .from('user_profiles')
      .select('id, full_name, email, avatar_url, specialty')
      .eq('tenant_id', tenantId)
      .in('role', ['doctor', 'dentist'])
      .order('full_name')
      .then(({ data }) => setDoctors((data ?? []) as Doctor[]))
  }, [tenantId])

  return { doctors }
}

// ─── Daily stats ──────────────────────────────────────────────
export function useDoctorDailyStats(
  doctorId: string | null,
  from: string,
  to: string,
) {
  const { tenantId } = useTenant()
  const [data, setData]     = useState<DoctorDailyStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let q = supabase
      .from('doctor_daily_stats')
      .select('*')
      .gte('day', from)
      .lte('day', to)
      .order('day')
    if (doctorId) q = q.eq('doctor_id', doctorId)
    q.then(({ data: rows }) => {
      setData((rows ?? []) as DoctorDailyStat[])
      setLoading(false)
    })
  }, [tenantId, doctorId, from, to])

  return { data, loading }
}

// ─── Revenue stats ────────────────────────────────────────────
export function useDoctorRevenueStats(
  doctorId: string | null,
  from: string,
  to: string,
) {
  const { tenantId } = useTenant()
  const [data, setData]       = useState<DoctorRevenueStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    let q = supabase
      .from('doctor_revenue_stats')
      .select('*')
      .gte('month', from)
      .lte('month', to)
    if (doctorId) q = q.eq('doctor_id', doctorId)
    q.then(({ data: rows }) => {
      setData((rows ?? []) as DoctorRevenueStat[])
      setLoading(false)
    })
  }, [tenantId, doctorId, from, to])

  return { data, loading }
}

// ─── Retention ────────────────────────────────────────────────
export function useDoctorRetention(
  doctorId: string | null,
  from: string,
  to: string,
) {
  const { tenantId } = useTenant()
  const [data, setData]       = useState<DoctorRetention[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .rpc('get_doctor_retention', {
        p_tenant_id: tenantId,
        p_doctor_id: doctorId ?? null,
        p_from:      from,
        p_to:        to,
      })
      .then(({ data: rows }) => {
        setData((rows ?? []) as DoctorRetention[])
        setLoading(false)
      })
  }, [tenantId, doctorId, from, to])

  return { data, loading }
}

// ─── Chair utilization ────────────────────────────────────────
export function useChairUtilization(from: string, to: string) {
  const [data, setData]       = useState<ChairUtilization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('chair_utilization')
      .select('*')
      .gte('day', from)
      .lte('day', to)
      .order('day')
      .then(({ data: rows }) => {
        setData((rows ?? []) as ChairUtilization[])
        setLoading(false)
      })
  }, [from, to])

  return { data, loading }
}

// ─── Top procedures ───────────────────────────────────────────
export function useDoctorProcedures(
  doctorId: string | null,
  from: string,
  to: string,
) {
  const { tenantId } = useTenant()
  const [data, setData]       = useState<DoctorProcedure[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .rpc('get_doctor_procedures', {
        p_tenant_id: tenantId,
        p_doctor_id: doctorId ?? null,
        p_from:      from,
        p_to:        to,
        p_limit:     10,
      })
      .then(({ data: rows }) => {
        setData((rows ?? []) as DoctorProcedure[])
        setLoading(false)
      })
  }, [tenantId, doctorId, from, to])

  return { data, loading }
}

// ─── Composite: summary cards for all doctors ─────────────────
export function useDoctorSummaries(from: string, to: string) {
  const { data: daily,   loading: l1 } = useDoctorDailyStats(null, from, to)
  const { data: revenue, loading: l2 } = useDoctorRevenueStats(null, from, to)
  const { data: retention, loading: l3 } = useDoctorRetention(null, from, to)

  const loading = l1 || l2 || l3

  const summaries: DoctorSummaryCard[] = (() => {
    if (loading) return []

    // Group by doctor_id
    const map: Record<string, DoctorSummaryCard> = {}

    for (const d of daily) {
      if (!map[d.doctor_id]) {
        map[d.doctor_id] = {
          doctor_id:          d.doctor_id,
          doctor_name:        d.doctor_name,
          total_revenue:      0, avg_invoice: 0, revenue_trend: 0,
          total_appointments: 0, completion_rate: 0, no_show_rate: 0,
          avg_duration_min:   0, unique_patients: 0, retention_rate: 0,
          procedures_per_day: 0, revenue_per_hour: 0,
        }
      }
      const s = map[d.doctor_id]
      s.total_appointments += d.total_appointments
    }

    for (const r of revenue) {
      if (!map[r.doctor_id]) continue
      map[r.doctor_id].total_revenue += r.net_revenue
      map[r.doctor_id].avg_invoice    = r.avg_invoice
    }

    for (const ret of retention) {
      if (!map[ret.doctor_id]) continue
      map[ret.doctor_id].unique_patients  = Number(ret.total_patients)
      map[ret.doctor_id].retention_rate   = Number(ret.retention_rate)
    }

    // Completion rate, procedures per day
    for (const d of daily) {
      const s = map[d.doctor_id]
      if (!s) continue
      const completed = d.completed
      const total     = d.total_appointments
      if (total > 0) {
        s.completion_rate = Math.round((completed / total) * 100)
        s.no_show_rate    = Math.round((d.no_shows / total) * 100)
      }
      s.avg_duration_min = d.avg_duration_min || 30
    }

    // Revenue per hour
    for (const s of Object.values(map)) {
      const days = daily.filter(d => d.doctor_id === s.doctor_id).length || 1
      s.procedures_per_day = Math.round(s.total_appointments / days * 10) / 10
      const hours = (s.total_appointments * s.avg_duration_min) / 60 || 1
      s.revenue_per_hour = Math.round(s.total_revenue / hours)
    }

    return Object.values(map).sort((a, b) => b.total_revenue - a.total_revenue)
  })()

  return { summaries, loading }
}
