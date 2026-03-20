// hooks/useSoapNotes.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import {
  SoapNote, SoapTemplate, SoapNoteHistoryRow,
  ICD10Code, Vitals, NoteCategory,
} from '@/types/soapNotes'
import toast from 'react-hot-toast'

// ─── Templates ────────────────────────────────────────────────
export function useSoapTemplates(category?: NoteCategory) {
  const { tenantId } = useTenant()
  const [templates, setTemplates] = useState<SoapTemplate[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    let q = supabase.from('soap_templates')
      .select('*').eq('tenant_id', tenantId).eq('is_active', true)
    if (category) q = q.eq('category', category)
    q.order('name').then(({ data }) => {
      setTemplates((data ?? []) as SoapTemplate[])
      setLoading(false)
    })
  }, [tenantId, category])

  return { templates, loading }
}

// ─── Patient note history ─────────────────────────────────────
export function usePatientNotes(patientId: string | null) {
  const { tenantId } = useTenant()
  const [notes,   setNotes]   = useState<SoapNoteHistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    const { data } = await supabase
      .from('patient_note_history')
      .select('*')
      .eq('patient_id', patientId)
      .limit(50)
    setNotes((data ?? []) as SoapNoteHistoryRow[])
    setLoading(false)
  }, [patientId])

  useEffect(() => {
    load()
    if (!patientId) return
    const ch = supabase.channel(`soap_${patientId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'soap_notes',
        filter: `patient_id=eq.${patientId}`,
      }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, patientId])

  return { notes, loading, refetch: load }
}

// ─── Single note (full) ───────────────────────────────────────
export function useSoapNote(id: string | null) {
  const [note,    setNote]    = useState<SoapNote | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data } = await supabase
      .from('soap_notes').select('*').eq('id', id).single()
    setNote(data as SoapNote ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])
  return { note, loading, refetch: load }
}

// ─── Create note ──────────────────────────────────────────────
export function useCreateSoapNote() {
  const { tenantId } = useTenant()
  const { user }     = useAuth()
  const [busy, setBusy] = useState(false)

  const create = useCallback(async (data: {
    patientId:     string
    patientName:   string
    appointmentId?:string
    templateId?:   string
    templateName?: string
    subjective?:   string
    objective?:    string
    assessment?:   string
    plan?:         string
  }): Promise<SoapNote | null> => {
    setBusy(true)
    const { data: row, error } = await supabase
      .from('soap_notes')
      .insert({
        tenant_id:      tenantId,
        patient_id:     data.patientId,
        patient_name:   data.patientName,
        doctor_id:      user!.id,
        doctor_name:    null,              // fill from profile if needed
        appointment_id: data.appointmentId ?? null,
        template_id:    data.templateId   ?? null,
        template_name:  data.templateName ?? null,
        subjective:     data.subjective   ?? '',
        objective:      data.objective    ?? '',
        assessment:     data.assessment   ?? '',
        plan:           data.plan         ?? '',
        icd10_codes:    [],
        teeth_involved: [],
        status:         'draft',
        is_signed:      false,
      })
      .select()
      .single()

    setBusy(false)
    if (error) { toast.error(error.message); return null }
    return row as SoapNote
  }, [tenantId, user])

  return { create, busy }
}

// ─── Auto-save note (debounced) ───────────────────────────────
export function useAutoSaveNote(noteId: string | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const save = useCallback(async (fields: Partial<SoapNote>) => {
    if (!noteId) return
    setSaving(true)
    await supabase.from('soap_notes')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', noteId)
    setSaving(false)
    setLastSaved(new Date())
  }, [noteId])

  const debouncedSave = useCallback((fields: Partial<SoapNote>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(fields), 1500)
  }, [save])

  const saveNow = useCallback(async (fields: Partial<SoapNote>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    await save(fields)
  }, [save])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { debouncedSave, saveNow, saving, lastSaved }
}

// ─── Sign note ────────────────────────────────────────────────
export function useSignNote() {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)

  const sign = useCallback(async (noteId: string): Promise<boolean> => {
    setBusy(true)
    const { error } = await supabase.from('soap_notes').update({
      is_signed:  true,
      signed_at:  new Date().toISOString(),
      signed_by:  user?.id ?? null,
      status:     'signed',
      updated_at: new Date().toISOString(),
    }).eq('id', noteId)
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('ჩანაწერი ხელმოწერილია')
    return true
  }, [user])

  const amend = useCallback(async (noteId: string): Promise<SoapNote | null> => {
    setBusy(true)
    // Fetch original
    const { data: orig } = await supabase
      .from('soap_notes').select('*').eq('id', noteId).single()
    if (!orig) { setBusy(false); return null }

    // Create amendment copy
    const { data: copy, error } = await supabase.from('soap_notes').insert({
      ...orig,
      id:           undefined,
      status:       'draft',
      is_signed:    false,
      signed_at:    null,
      signed_by:    null,
      amended_from: noteId,
      created_at:   undefined,
      updated_at:   undefined,
    }).select().single()

    // Mark original as amended
    await supabase.from('soap_notes').update({ status: 'amended' }).eq('id', noteId)

    setBusy(false)
    if (error) { toast.error(error.message); return null }
    toast.success('შ/ც ასლი შეიქმნა')
    return copy as SoapNote
  }, [])

  return { sign, amend, busy }
}

// ─── Voice-to-text hook ───────────────────────────────────────
export function useVoiceInput() {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() =>
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
  const recRef = useRef<any>(null)

  const start = useCallback((
    onResult:  (text: string) => void,
    onEnd?:    () => void,
    language = 'ka-GE'
  ) => {
    if (!supported) { toast.error('ბრაუზერი არ ემხრობა ხმოვან შეყვანას'); return }

    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    const rec = new SR()
    recRef.current = rec

    rec.lang           = language
    rec.interimResults = true
    rec.continuous     = true
    rec.maxAlternatives = 1

    let interim = ''

    rec.onstart   = () => setListening(true)
    rec.onend     = () => { setListening(false); onEnd?.() }
    rec.onerror   = (e: any) => {
      setListening(false)
      if (e.error !== 'no-speech') toast.error(`Mic: ${e.error}`)
    }
    rec.onresult  = (e: any) => {
      let final = '', int = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else int += t
      }
      if (final) onResult(final)
    }

    rec.start()
  }, [supported])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  return { start, stop, listening, supported }
}
