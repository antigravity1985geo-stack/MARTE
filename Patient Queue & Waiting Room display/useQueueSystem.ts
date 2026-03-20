// hooks/useQueueSystem.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import {
  QueueCounter, QueueTicket, CounterDisplayState,
  TicketStatus, ServiceType, TicketPriority, DailyStats,
} from '@/types/queueSystem'
import toast from 'react-hot-toast'

// ─── Counters ─────────────────────────────────────────────────
export function useQueueCounters() {
  const { tenantId } = useTenant()
  const [counters, setCounters] = useState<QueueCounter[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('queue_counters')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('code')
    setCounters(data ?? [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    load()
    const ch = supabase.channel('counters_rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'queue_counters',
        filter: `tenant_id=eq.${tenantId}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, tenantId])

  const toggleCounter = useCallback(async (id: string, isOpen: boolean): Promise<void> => {
    await supabase.from('queue_counters').update({
      is_open:   isOpen,
      opened_at: isOpen ? new Date().toISOString() : null,
    }).eq('id', id)
  }, [])

  return { counters, loading, refetch: load, toggleCounter }
}

// ─── Today's tickets for a counter ───────────────────────────
export function useCounterTickets(counterId: string | null) {
  const { tenantId } = useTenant()
  const [tickets,  setTickets]  = useState<QueueTicket[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    if (!counterId) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('queue_tickets')
      .select('*')
      .eq('counter_id', counterId)
      .gte('issued_at', today)
      .order('display_number', { ascending: true })
    setTickets(data ?? [])
    setLoading(false)
  }, [counterId, tenantId])

  useEffect(() => {
    load()
    if (!counterId) return
    const ch = supabase.channel(`tickets_${counterId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'queue_tickets',
        filter: `counter_id=eq.${counterId}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, counterId])

  const waiting   = tickets.filter(t => t.status === 'waiting')
  const called    = tickets.find(t => t.status === 'called') ?? null
  const serving   = tickets.find(t => t.status === 'serving') ?? null
  const completed = tickets.filter(t => t.status === 'completed')

  // Avg service time (last 10 completed)
  const avgServiceMin = (() => {
    const done = completed.filter(t => t.service_minutes != null).slice(-10)
    if (!done.length) return 8  // default 8 min
    return done.reduce((s, t) => s + (t.service_minutes ?? 0), 0) / done.length
  })()

  return { tickets, waiting, called, serving, completed, loading, avgServiceMin, refetch: load }
}

// ─── All counters display state (for TV) ─────────────────────
export function useAllCountersDisplay(tenantId: string) {
  const [state,   setState]   = useState<CounterDisplayState[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]

    const [countersRes, ticketsRes] = await Promise.all([
      supabase.from('queue_counters')
        .select('*').eq('tenant_id', tenantId).eq('is_active', true).order('code'),
      supabase.from('queue_tickets')
        .select('*').eq('tenant_id', tenantId)
        .gte('issued_at', today)
        .in('status', ['waiting', 'called', 'serving'])
        .order('priority', { ascending: false })
        .order('issued_at', { ascending: true }),
    ])

    const counters = (countersRes.data ?? []) as QueueCounter[]
    const tickets  = (ticketsRes.data  ?? []) as QueueTicket[]

    const display: CounterDisplayState[] = counters.map(c => {
      const cTickets   = tickets.filter(t => t.counter_id === c.id)
      const current    = cTickets.find(t => t.status === 'called' || t.status === 'serving') ?? null
      const waiting    = cTickets.filter(t => t.status === 'waiting')
      return {
        counter:        c,
        current_ticket: current,
        waiting_count:  waiting.length,
        next_tickets:   waiting.slice(0, 3),
      }
    })

    setState(display)
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    load()
    const ch = supabase.channel('all_tickets_rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'queue_tickets',
        filter: `tenant_id=eq.${tenantId}`,
      }, load)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'queue_counters',
        filter: `tenant_id=eq.${tenantId}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, tenantId])

  return { state, loading, refetch: load }
}

// ─── Issue new ticket ─────────────────────────────────────────
export function useIssueTicket() {
  const { tenantId } = useTenant()
  const { user }     = useAuth()
  const [busy, setBusy] = useState(false)

  const issue = useCallback(async (
    counterId:    string,
    opts?: {
      patientId?:    string
      patientName?:  string
      patientPhone?: string
      appointmentId?:string
      serviceType?:  ServiceType
      priority?:     TicketPriority
      notes?:        string
    }
  ): Promise<QueueTicket | null> => {
    setBusy(true)
    const { data, error } = await supabase
      .from('queue_tickets')
      .insert({
        tenant_id:      tenantId,
        counter_id:     counterId,
        ticket_number:  '',        // set by trigger
        display_number: 0,         // set by trigger
        patient_id:     opts?.patientId    ?? null,
        patient_name:   opts?.patientName  ?? null,
        patient_phone:  opts?.patientPhone ?? null,
        appointment_id: opts?.appointmentId ?? null,
        service_type:   opts?.serviceType  ?? null,
        priority:       opts?.priority     ?? 0,
        notes:          opts?.notes        ?? null,
        status:         'waiting',
        created_by:     user?.id ?? null,
      })
      .select('*')
      .single()

    setBusy(false)
    if (error) { toast.error(error.message); return null }
    toast.success(`ბილეთი ${(data as QueueTicket).ticket_number}`)
    return data as QueueTicket
  }, [tenantId, user])

  return { issue, busy }
}

// ─── Counter actions ──────────────────────────────────────────
export function useCounterActions() {
  const { tenantId } = useTenant()
  const [busy, setBusy] = useState(false)

  const callNext = useCallback(async (counterId: string): Promise<QueueTicket | null> => {
    setBusy(true)
    const { data, error } = await supabase.rpc('call_next_ticket', {
      p_counter_id: counterId,
    })
    setBusy(false)
    if (error || !data?.ok) {
      toast.error(data?.error ?? error?.message ?? 'რიგი ცარიელია')
      return null
    }
    return data as QueueTicket
  }, [])

  const recall = useCallback(async (ticketId: string): Promise<void> => {
    await supabase.rpc('recall_ticket', { p_ticket_id: ticketId })
    toast.success('ხელახლა გამოძახება')
  }, [])

  const updateStatus = useCallback(async (
    ticketId: string,
    status:   TicketStatus,
  ): Promise<void> => {
    const extra: Partial<QueueTicket> = {}
    if (status === 'serving')   extra.started_at   = new Date().toISOString()
    if (status === 'completed') extra.completed_at = new Date().toISOString()

    await supabase.from('queue_tickets')
      .update({ status, ...extra }).eq('id', ticketId)
  }, [])

  const cancelTicket = useCallback(async (ticketId: string): Promise<void> => {
    await supabase.from('queue_tickets')
      .update({ status: 'cancelled' }).eq('id', ticketId)
    toast('ბილეთი გაუქმდა')
  }, [])

  return { callNext, recall, updateStatus, cancelTicket, busy }
}

// ─── Daily stats ──────────────────────────────────────────────
export function useQueueStats(counterId: string | null): DailyStats {
  const { tickets } = useCounterTickets(counterId)
  const today = tickets.filter(t => t.issued_at.startsWith(new Date().toISOString().split('T')[0]))

  const completed = today.filter(t => t.status === 'completed')
  const waitTimes = today.filter(t => t.wait_minutes != null).map(t => t.wait_minutes!)
  const svcTimes  = completed.filter(t => t.service_minutes != null).map(t => t.service_minutes!)

  return {
    total_tickets:   today.length,
    completed:       completed.length,
    no_shows:        today.filter(t => t.status === 'no_show').length,
    avg_wait_min:    waitTimes.length ? waitTimes.reduce((s,v)=>s+v,0)/waitTimes.length : null,
    avg_service_min: svcTimes.length  ? svcTimes.reduce((s,v)=>s+v,0)/svcTimes.length  : null,
  }
}

// ─── Sound notification hook ──────────────────────────────────
export function useQueueSound() {
  const playCall = useCallback((ticketNumber: string) => {
    // Web Speech API — no external dependency
    if (!('speechSynthesis' in window)) return
    const msg = new SpeechSynthesisUtterance(
      `ბილეთი ${ticketNumber.replace('-', ' ')} — გთხოვთ მიბრძანდეთ მომსახურების სადგურთან`
    )
    msg.lang  = 'ka-GE'
    msg.rate  = 0.85
    msg.pitch = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(msg)
  }, [])

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain= ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }, [])

  return { playCall, playBeep }
}
