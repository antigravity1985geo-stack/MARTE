// hooks/useDentalLab.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import {
  DentalLab, LabWorkType, LabOrder,
  LabOrderEvent, LabOrderStatus, LabOrderAttachment,
} from '@/types/dentalLab'
import toast from 'react-hot-toast'

// ─── Labs list ────────────────────────────────────────────────
export function useDentalLabs() {
  const { tenantId } = useTenant()
  const [labs, setLabs] = useState<DentalLab[]>([])

  useEffect(() => {
    supabase.from('dental_labs').select('*')
      .eq('tenant_id', tenantId).eq('is_active', true)
      .order('name')
      .then(({ data }) => setLabs(data ?? []))
  }, [tenantId])

  return { labs }
}

// ─── Work types ───────────────────────────────────────────────
export function useLabWorkTypes(labId?: string) {
  const { tenantId } = useTenant()
  const [types, setTypes] = useState<LabWorkType[]>([])

  useEffect(() => {
    let q = supabase.from('lab_work_types').select('*')
      .eq('tenant_id', tenantId).eq('is_active', true)
    if (labId) q = q.or(`lab_id.eq.${labId},lab_id.is.null`)
    q.order('name').then(({ data }) => setTypes(data ?? []))
  }, [tenantId, labId])

  return { types }
}

// ─── Lab orders list ──────────────────────────────────────────
export function useLabOrders(filters?: {
  status?:    LabOrderStatus | 'all'
  patientId?: string
  labId?:     string
  overdue?:   boolean
}) {
  const { tenantId } = useTenant()
  const [orders,  setOrders]  = useState<LabOrder[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('lab_orders')
      .select(`
        *,
        lab:dental_labs(name),
        doctor:auth.users(email)
      `)
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: true })

    if (filters?.status && filters.status !== 'all')
      q = q.eq('status', filters.status)
    if (filters?.patientId)
      q = q.eq('patient_id', filters.patientId)
    if (filters?.labId)
      q = q.eq('lab_id', filters.labId)
    if (filters?.overdue)
      q = q.lt('due_date', new Date().toISOString().split('T')[0])
        .not('status', 'in', '("fitted","cancelled","received")')

    const { data } = await q
    setOrders((data ?? []) as unknown as LabOrder[])
    setLoading(false)
  }, [tenantId, filters?.status, filters?.patientId, filters?.labId, filters?.overdue])

  useEffect(() => {
    load()
    const ch = supabase.channel('lab_orders_rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'lab_orders',
        filter: `tenant_id=eq.${tenantId}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, tenantId])

  return { orders, loading, refetch: load }
}

// ─── Single order with events ─────────────────────────────────
export function useLabOrder(id: string | null) {
  const [order,  setOrder]  = useState<LabOrder | null>(null)
  const [events, setEvents] = useState<LabOrderEvent[]>([])
  const [loading,setLoading]= useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      supabase.from('lab_orders').select('*, lab:dental_labs(name)').eq('id', id).single(),
      supabase.from('lab_order_events').select('*').eq('order_id', id).order('created_at'),
    ]).then(([o, e]) => {
      setOrder(o.data as unknown as LabOrder ?? null)
      setEvents(e.data ?? [])
      setLoading(false)
    })
  }, [id])

  return { order, events, loading }
}

// ─── Create / Update ──────────────────────────────────────────
export function useLabOrderActions() {
  const { tenantId } = useTenant()
  const { user }     = useAuth()
  const [busy, setBusy] = useState(false)

  const createOrder = useCallback(async (
    data: Omit<LabOrder,
      'id'|'tenant_id'|'order_number'|'created_by'|'created_at'|'updated_at'|
      'lab'|'patient_name'|'doctor_name'
    >
  ): Promise<LabOrder | null> => {
    setBusy(true)
    const { data: row, error } = await supabase
      .from('lab_orders')
      .insert({ ...data, tenant_id: tenantId, created_by: user!.id, order_number: '' })
      .select('*, lab:dental_labs(name)')
      .single()
    setBusy(false)
    if (error) { toast.error(error.message); return null }
    toast.success(`შეკვეთა #${(row as any).order_number} შეიქმნა`)
    return row as unknown as LabOrder
  }, [tenantId, user])

  const updateOrder = useCallback(async (
    id: string,
    data: Partial<LabOrder>
  ): Promise<boolean> => {
    setBusy(true)
    const { error } = await supabase
      .from('lab_orders').update(data).eq('id', id)
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('განახლდა')
    return true
  }, [])

  const advanceStatus = useCallback(async (
    id:        string,
    newStatus: LabOrderStatus,
    note?:     string,
    extraData?: Partial<LabOrder>
  ): Promise<boolean> => {
    const dateFields: Partial<Record<LabOrderStatus, Partial<LabOrder>>> = {
      sent:     { sent_date:     new Date().toISOString().split('T')[0] },
      received: { received_date: new Date().toISOString().split('T')[0] },
      fitted:   { fit_date:      new Date().toISOString().split('T')[0] },
    }
    return updateOrder(id, {
      status: newStatus,
      ...dateFields[newStatus],
      ...extraData,
    })
  }, [updateOrder])

  const uploadAttachment = useCallback(async (
    orderId: string,
    file:    File,
    existing: LabOrderAttachment[]
  ): Promise<boolean> => {
    setBusy(true)
    const ext  = file.name.split('.').pop()
    const path = `${tenantId}/lab-orders/${orderId}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, file)

    if (upErr) { toast.error(upErr.message); setBusy(false); return false }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(path)

    const newAtt: LabOrderAttachment = {
      name: file.name, url: publicUrl,
      type: file.type, size: file.size,
    }

    const ok = await updateOrder(orderId, {
      attachments: [...existing, newAtt]
    })
    setBusy(false)
    if (ok) toast.success('ფაილი ატვირთულია')
    return ok
  }, [tenantId, updateOrder])

  return { createOrder, updateOrder, advanceStatus, uploadAttachment, busy }
}
