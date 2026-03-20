// hooks/useConsentForms.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import {
  ConsentFormTemplate, ConsentForm, ConsentStatus,
  ConsentCategory, renderTemplate,
} from '@/types/consentForms'
import toast from 'react-hot-toast'

// ─── Templates ────────────────────────────────────────────────
export function useConsentTemplates(category?: ConsentCategory) {
  const { tenantId } = useTenant()
  const [templates, setTemplates] = useState<ConsentFormTemplate[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    let q = supabase.from('consent_form_templates')
      .select('*').eq('tenant_id', tenantId).eq('is_active', true)
    if (category) q = q.eq('category', category)
    q.order('name').then(({ data }) => {
      setTemplates((data ?? []) as ConsentFormTemplate[])
      setLoading(false)
    })
  }, [tenantId, category])

  return { templates, loading }
}

// ─── Forms list ───────────────────────────────────────────────
export function useConsentForms(patientId?: string | null) {
  const { tenantId } = useTenant()
  const [forms,   setForms]   = useState<ConsentForm[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('consent_forms')
      .select('*, template:consent_form_templates(name,category,requires_witness)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (patientId) q = q.eq('patient_id', patientId)
    const { data } = await q
    setForms((data ?? []) as ConsentForm[])
    setLoading(false)
  }, [tenantId, patientId])

  useEffect(() => {
    load()
    const ch = supabase.channel('consent_rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'consent_forms',
        filter: `tenant_id=eq.${tenantId}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, tenantId])

  return { forms, loading, refetch: load }
}

// ─── Create form from template ────────────────────────────────
export function useCreateConsentForm() {
  const { tenantId } = useTenant()
  const { user }     = useAuth()
  const [busy, setBusy] = useState(false)

  const create = useCallback(async (
    template:       ConsentFormTemplate,
    patientId:      string,
    patientName:    string,
    variablesData:  Record<string, string>,
    appointmentId?: string,
    doctorName?:    string,
  ): Promise<ConsentForm | null> => {
    setBusy(true)

    // Enrich variables with defaults
    const vars = {
      ...variablesData,
      patient_name: variablesData.patient_name ?? patientName,
    }

    const rendered = renderTemplate(template.body_ka, vars)

    const { data, error } = await supabase
      .from('consent_forms')
      .insert({
        tenant_id:        tenantId,
        template_id:      template.id,
        template_version: template.version,
        patient_id:       patientId,
        patient_name:     patientName,
        appointment_id:   appointmentId ?? null,
        doctor_id:        user?.id ?? null,
        doctor_name:      doctorName ?? null,
        variables_data:   vars,
        rendered_body:    rendered,
        status:           'pending',
        created_by:       user?.id ?? null,
        signed_ip:        null,
      })
      .select('*, template:consent_form_templates(name,category,requires_witness)')
      .single()

    setBusy(false)
    if (error) { toast.error(error.message); return null }
    toast.success('ფორმა მომზადდა')
    return data as ConsentForm
  }, [tenantId, user])

  return { create, busy }
}

// ─── Save signature ───────────────────────────────────────────
export function useSignConsent() {
  const [busy, setBusy] = useState(false)

  const signAsPatient = useCallback(async (
    formId:    string,
    signature: string,    // base64 PNG
  ): Promise<boolean> => {
    setBusy(true)
    const { error } = await supabase.from('consent_forms').update({
      patient_signature: signature,
      patient_signed_at: new Date().toISOString(),
      status:            'signed',
    }).eq('id', formId)
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('ხელმოწერა შენახულია')
    return true
  }, [])

  const signAsWitness = useCallback(async (
    formId:      string,
    signature:   string,
    witnessName: string,
  ): Promise<boolean> => {
    setBusy(true)
    const { error } = await supabase.from('consent_forms').update({
      witness_signature: signature,
      witness_signed_at: new Date().toISOString(),
      witness_name:      witnessName,
      status:            'witnessed',
    }).eq('id', formId)
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('მოწმის ხელმოწერა შენახულია')
    return true
  }, [])

  const signAsDoctor = useCallback(async (
    formId:    string,
    signature: string,
  ): Promise<boolean> => {
    setBusy(true)
    const { error } = await supabase.from('consent_forms').update({
      doctor_signature: signature,
      doctor_signed_at: new Date().toISOString(),
      status:           'completed',
    }).eq('id', formId)
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('დასრულდა')
    return true
  }, [])

  const revoke = useCallback(async (formId: string): Promise<boolean> => {
    setBusy(true)
    const { error } = await supabase.from('consent_forms').update({
      status: 'revoked',
    }).eq('id', formId)
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('თანხმობა გაუქმებულია')
    return true
  }, [])

  return { signAsPatient, signAsWitness, signAsDoctor, revoke, busy }
}

// ─── Signature pad hook ───────────────────────────────────────
export function useSignaturePad(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const drawing   = useRef(false)
  const hasData   = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const src  = 'touches' in e ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing.current = true
      const p = getPos(e, canvas)
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
    }
    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return
      e.preventDefault()
      const p = getPos(e, canvas)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      hasData.current = true
      setIsEmpty(false)
    }
    const end = () => { drawing.current = false }

    canvas.addEventListener('mousedown',  start, { passive: false })
    canvas.addEventListener('mousemove',  move,  { passive: false })
    canvas.addEventListener('mouseup',    end)
    canvas.addEventListener('mouseleave', end)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove',  move,  { passive: false })
    canvas.addEventListener('touchend',   end)

    return () => {
      canvas.removeEventListener('mousedown',  start)
      canvas.removeEventListener('mousemove',  move)
      canvas.removeEventListener('mouseup',    end)
      canvas.removeEventListener('mouseleave', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove',  move)
      canvas.removeEventListener('touchend',   end)
    }
  }, [canvasRef])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasData.current = false
    setIsEmpty(true)
  }, [canvasRef])

  const getDataURL = useCallback((): string | null => {
    if (!hasData.current || !canvasRef.current) return null
    return canvasRef.current.toDataURL('image/png')
  }, [canvasRef])

  return { clear, getDataURL, isEmpty }
}
