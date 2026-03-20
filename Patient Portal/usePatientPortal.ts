// hooks/usePatientPortal.ts
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { supabase }  from '@/lib/supabase'
import { useTenant } from '@/hooks/useTenant'
import {
  PortalSession, PortalAppointment, PatientDocument,
  PortalNotification, AppointmentRequest, RequestStatus,
} from '@/types/patientPortal'
import toast from 'react-hot-toast'

const SESSION_KEY = 'portal_session'

// ─── Session management ───────────────────────────────────────

export function usePortalAuth() {
  const [session, setSession] = useState<PortalSession | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  // Validate session on mount
  useEffect(() => {
    if (!session) return
    supabase.rpc('validate_portal_session', { p_token: session.session_token })
      .then(({ data }) => {
        if (!data?.ok) {
          localStorage.removeItem(SESSION_KEY)
          setSession(null)
        }
      })
  }, [])

  const sendOtp = useCallback(async (
    tenantId:  string,
    patientId: string,
    phone:     string,
  ): Promise<boolean> => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('generate_portal_otp', {
        p_tenant_id:     tenantId,
        p_patient_id:    patientId,
        p_patient_phone: phone,
      })
      if (error) throw error
      // In production: send SMS here with the OTP
      // For dev: show in toast
      console.log('OTP:', data)
      toast.success(`OTP გაგზავნილია: ${data}`) // remove in prod
      setOtpSent(true)
      return true
    } catch (e: any) {
      toast.error(e.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyOtp = useCallback(async (
    tenantId:    string,
    patientId:   string,
    otp:         string,
    patientName: string,
  ): Promise<boolean> => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('verify_portal_otp', {
        p_tenant_id:   tenantId,
        p_patient_id:  patientId,
        p_otp:         otp,
        p_patient_name: patientName,
      })
      if (error) throw error
      if (!data?.ok) { toast.error(data?.error ?? 'OTP შეცდომა'); return false }

      const sess: PortalSession = {
        session_token: data.session_token,
        patient_id:    data.patient_id,
        patient_name:  data.patient_name,
        patient_phone: data.patient_phone,
        tenant_id:     tenantId,
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(sess))
      setSession(sess)
      toast.success('კეთილი იყოს თქვენი მობრძანება!')
      return true
    } catch (e: any) {
      toast.error(e.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
    setOtpSent(false)
  }, [])

  return { session, loading, otpSent, sendOtp, verifyOtp, logout }
}

// ─── Patient appointments (portal view) ──────────────────────

export function usePortalAppointments(patientId: string | null) {
  const [upcoming, setUpcoming] = useState<PortalAppointment[]>([])
  const [past,     setPast]     = useState<PortalAppointment[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    const now = new Date().toISOString()

    Promise.all([
      supabase
        .from('appointments')
        .select(`id, start_time, end_time, status, notes,
          doctor:auth.users(email),
          invoice:medical_invoices(id,total,status)`)
        .eq('patient_id', patientId)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(10),
      supabase
        .from('appointments')
        .select(`id, start_time, end_time, status, notes,
          doctor:auth.users(email),
          invoice:medical_invoices(id,total,status)`)
        .eq('patient_id', patientId)
        .lt('start_time', now)
        .order('start_time', { ascending: false })
        .limit(20),
    ]).then(([up, past_]) => {
      const map = (row: any): PortalAppointment => ({
        id:             row.id,
        start_time:     row.start_time,
        end_time:       row.end_time,
        doctor_name:    row.doctor?.email ?? null,
        service_name:   row.service_name ?? null,
        status:         row.status,
        notes:          row.notes,
        invoice_id:     row.invoice?.[0]?.id ?? null,
        invoice_total:  row.invoice?.[0]?.total ?? null,
        invoice_status: row.invoice?.[0]?.status ?? null,
      })
      setUpcoming((up.data ?? []).map(map))
      setPast((past_.data ?? []).map(map))
      setLoading(false)
    })
  }, [patientId])

  return { upcoming, past, loading }
}

// ─── Patient documents (portal view) ─────────────────────────

export function usePortalDocuments(patientId: string | null) {
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    supabase
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_portal_visible', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDocuments((data ?? []) as PatientDocument[])
        setLoading(false)
      })
  }, [patientId])

  return { documents, loading }
}

// ─── Notifications ────────────────────────────────────────────

export function usePortalNotifications(patientId: string | null) {
  const [notifs,   setNotifs]  = useState<PortalNotification[]>([])
  const [unread,   setUnread]  = useState(0)
  const [loading,  setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!patientId) return
    const { data } = await supabase
      .from('portal_notifications')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifs((data ?? []) as PortalNotification[])
    setUnread((data ?? []).filter((n: any) => !n.is_read).length)
    setLoading(false)
  }, [patientId])

  useEffect(() => {
    load()
  }, [load])

  const markRead = useCallback(async (id: string) => {
    await supabase.from('portal_notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!patientId) return
    await supabase.from('portal_notifications')
      .update({ is_read: true })
      .eq('patient_id', patientId)
      .eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }, [patientId])

  return { notifs, unread, loading, markRead, markAllRead, refetch: load }
}

// ─── Booking requests ─────────────────────────────────────────

export function useBookingRequest(tenantId: string | null) {
  const [busy, setBusy] = useState(false)

  const submitRequest = useCallback(async (data: {
    patientId?:    string
    patientName:   string
    patientPhone:  string
    preferredDate: string
    preferredTime: string
    serviceName:   string
    notes?:        string
  }): Promise<boolean> => {
    if (!tenantId) return false
    setBusy(true)
    const { error } = await supabase.from('appointment_requests').insert({
      tenant_id:      tenantId,
      patient_id:     data.patientId ?? null,
      patient_name:   data.patientName,
      patient_phone:  data.patientPhone,
      preferred_date: data.preferredDate,
      preferred_time: data.preferredTime,
      service_name:   data.serviceName,
      notes:          data.notes ?? null,
    })
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('მოთხოვნა გაგზავნილია! კლინიკა დაგიკავშირდებათ.')
    return true
  }, [tenantId])

  return { submitRequest, busy }
}

// ─── Clinic-side: view incoming requests ─────────────────────

export function useAppointmentRequests(opts?: { status?: RequestStatus | 'all' }) {
  const { tenantId } = useTenant()
  const [requests, setRequests] = useState<AppointmentRequest[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('appointment_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (opts?.status && opts.status !== 'all') q = q.eq('status', opts.status)
    const { data } = await q
    setRequests((data ?? []) as AppointmentRequest[])
    setLoading(false)
  }, [tenantId, opts?.status])

  useEffect(() => {
    load()
    const ch = supabase.channel('req_rt')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'appointment_requests',
        filter: `tenant_id=eq.${tenantId}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, tenantId])

  const confirm = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('appointment_requests')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error(error.message); return false }
    toast.success('დადასტურდა')
    load()
    return true
  }, [load])

  const reject = useCallback(async (id: string, reason: string): Promise<boolean> => {
    const { error } = await supabase.from('appointment_requests')
      .update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast.error(error.message); return false }
    toast.success('უარყოფილია')
    load()
    return true
  }, [load])

  return { requests, loading, refetch: load, confirm, reject }
}
