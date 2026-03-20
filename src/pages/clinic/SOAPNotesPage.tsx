// pages/clinic/SOAPNotesPage.tsx
import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  BadgeCheck, ChevronRight, Clock, FileText,
  History, Loader2, Mic, MicOff, PenLine,
  Plus, RotateCcw, Save, Search, Shield,
  Stethoscope, Tag, X, Zap,
} from 'lucide-react'
import {
  useSoapTemplates, usePatientNotes,
  useCreateSoapNote, useAutoSaveNote,
  useSignNote, useVoiceInput, useSoapNote,
} from '@/hooks/useSoapNotes'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  SoapNote, SoapTemplate, SoapNoteHistoryRow,
  ICD10Code, Vitals, NoteStatus,
  SECTION_META, SectionKey, DENTAL_ICD10,
  CATEGORY_LABELS,
} from '@/types/soapNotes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

// ─── Utils ────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  format(parseISO(d), 'd MMM yyyy', { locale: ka })
const fmtDateTime = (d: string) =>
  format(parseISO(d), 'd MMM yyyy · HH:mm', { locale: ka })

// ─── Template picker modal ────────────────────────────────────
function TemplatePicker({
  onSelect,
  onClose,
}: {
  onSelect: (t: SoapTemplate) => void
  onClose:  () => void
}) {
  const { templates, loading } = useSoapTemplates()
  const [search, setSearch]    = useState('')

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-none">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">შაბლონი</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ძებნა…"
              className="pl-8 h-10 rounded-xl" />
          </div>
        </div>
        <div className="overflow-y-auto max-h-80">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={18} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">შაბლონები არ არის</div>
          ) : filtered.map(t => (
            <button key={t.id} onClick={() => onSelect(t)}
              className="w-full flex items-center gap-3 px-5 py-4 border-b
                border-slate-50 last:border-0 hover:bg-slate-50 text-left
                transition-colors group">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center
                justify-center text-base group-hover:bg-slate-200 transition-colors">
                {t.category === 'emergency' ? '🚨' :
                 t.category === 'checkup'   ? '🔍' :
                 t.category === 'root_canal'? '🦷' : '📋'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-400">
                  {CATEGORY_LABELS[t.category]}
                </p>
              </div>
              <ChevronRight size={14} className="text-slate-300" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Section editor (one S/O/A/P) ────────────────────────────
function SectionEditor({
  sectionKey,
  value,
  onChange,
  phrases,
  readonly,
}: {
  sectionKey: SectionKey
  value:      string
  onChange:   (v: string) => void
  phrases:    string[]
  readonly?:  boolean
}) {
  const meta  = SECTION_META[sectionKey]
  const voice = useVoiceInput()
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [voiceTarget, setVoiceTarget] = useState(false)

  // Auto-resize textarea
  useEffect(() => {
    if (!taRef.current) return
    taRef.current.style.height = 'auto'
    taRef.current.style.height = `${taRef.current.scrollHeight}px`
  }, [value])

  const insertPhrase = (p: string) => {
    const ta  = taRef.current
    if (!ta) { onChange(value + (value ? '\n' : '') + p); return }
    const s   = ta.selectionStart
    const e   = ta.selectionEnd
    const sep = value[s - 1] && value[s - 1] !== '\n' ? '\n' : ''
    const nv  = value.slice(0, s) + sep + p + value.slice(e)
    onChange(nv)
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = s + sep.length + p.length
      ta.focus()
    }, 0)
  }

  const toggleVoice = () => {
    if (voice.listening && voiceTarget) {
      voice.stop()
      setVoiceTarget(false)
    } else {
      setVoiceTarget(true)
      voice.start(
        (txt) => {
          onChange(value + (value.endsWith(' ') || !value ? '' : ' ') + txt + ' ')
        },
        () => setVoiceTarget(false)
      )
    }
  }

  const isListeningHere = voice.listening && voiceTarget

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all
      ${readonly ? 'border-slate-100' : 'border-transparent focus-within:border-current'}`}
      style={readonly ? {} : { '--tw-border-opacity': 1 } as any}>

      {/* Section header */}
      <div className={`flex items-center justify-between px-4 py-3 ${meta.color}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center
            justify-center font-black text-white text-base">
            {meta.label_short}
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              {meta.label}
            </p>
            <p className="text-white/70 text-[10px]">{meta.label_ka}</p>
          </div>
        </div>
        {!readonly && voice.supported && (
          <button
            onClick={toggleVoice}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl
              text-xs font-bold transition-all
              ${isListeningHere
                ? 'bg-white text-rose-600 animate-pulse'
                : 'bg-white/20 text-white hover:bg-white/30'}`}
          >
            {isListeningHere
              ? <><MicOff size={13} /> Stop</>
              : <><Mic size={13} /> ხმა</>}
          </button>
        )}
      </div>

      {/* Textarea */}
      <div className={`${meta.light} border-t-0`}>
        <textarea
          ref={taRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          readOnly={readonly}
          placeholder={readonly ? '' : meta.placeholder}
          className={`w-full px-4 py-3 bg-transparent text-sm text-slate-800
            placeholder-slate-300 resize-none focus:outline-none leading-relaxed
            font-mono min-h-[80px]
            ${readonly ? 'cursor-default text-slate-700' : ''}`}
          rows={4}
          style={{ fontFamily: '"JetBrains Mono", "Courier New", monospace', fontSize: 13 }}
        />

        {/* Phrase chips */}
        {!readonly && phrases.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {phrases.map((p, i) => (
              <button
                key={i}
                onClick={() => insertPhrase(p)}
                className="text-[11px] px-2.5 py-1 rounded-xl border border-current/20
                  font-medium bg-white/60 hover:bg-white transition-colors
                  text-slate-600 hover:text-slate-900"
              >
                + {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ICD-10 picker ────────────────────────────────────────────
function ICD10Picker({
  selected,
  suggested,
  onChange,
  readonly,
}: {
  selected:  ICD10Code[]
  suggested: { code: string; label: string }[]
  onChange:  (codes: ICD10Code[]) => void
  readonly?: boolean
}) {
  const [search, setSearch] = useState('')

  const pool = search
    ? DENTAL_ICD10.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.label.toLowerCase().includes(search.toLowerCase())
      )
    : [...suggested, ...DENTAL_ICD10.filter(d => !suggested.find(s => s.code === d.code))]

  const toggle = (c: { code: string; label: string }) => {
    const exists = selected.find(s => s.code === c.code)
    if (exists) {
      onChange(selected.filter(s => s.code !== c.code))
    } else {
      onChange([...selected, {
        code:       c.code,
        label:      c.label,
        is_primary: selected.length === 0,
      }])
    }
  }

  const setPrimary = (code: string) =>
    onChange(selected.map(s => ({ ...s, is_primary: s.code === code })))

  return (
    <div className="space-y-3">
      {/* Selected codes */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(c => (
            <div key={c.code}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border
                text-xs font-semibold cursor-pointer transition-colors
                ${c.is_primary
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'}`}
              onClick={() => !readonly && setPrimary(c.code)}
              title={c.is_primary ? 'მთავარი დიაგნ.' : 'მთავ. შეყენება'}
            >
              <span className="font-mono">{c.code}</span>
              <span className="font-normal opacity-70 ml-1">{c.label}</span>
              {c.is_primary && <span className="text-[9px] ml-0.5">★</span>}
              {!readonly && (
                <button onClick={e => { e.stopPropagation(); toggle(c) }}
                  className="ml-0.5 opacity-60 hover:opacity-100 p-0.5">
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readonly && (
        <>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ICD-10 კოდი ან სახელი…"
              className="pl-8 h-9 rounded-xl text-xs" />
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {pool.map(c => {
              const sel = !!selected.find(s => s.code === c.code)
              return (
                <button key={c.code} onClick={() => toggle(c)}
                  className={`text-[11px] px-2 py-1 rounded-lg border font-medium
                    transition-colors
                    ${sel
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50'}`}>
                  <span className="font-mono">{c.code}</span>
                  <span className="ml-1 opacity-70">{c.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Vitals panel ─────────────────────────────────────────────
function VitalsPanel({
  vitals,
  onChange,
  readonly,
}: {
  vitals:   Vitals | null
  onChange: (v: Vitals) => void
  readonly?: boolean
}) {
  const v = vitals ?? {}
  const upd = (k: keyof Vitals, val: string) =>
    onChange({ ...v, [k]: val ? Number(val) : undefined })

  const fields: { k: keyof Vitals; label: string; unit: string; min: number; max: number }[] = [
    { k: 'bp_systolic',  label: 'სისტ. WT',  unit: 'mmHg', min: 60,  max: 250 },
    { k: 'bp_diastolic', label: 'დიასტ. WT', unit: 'mmHg', min: 40,  max: 150 },
    { k: 'pulse',        label: 'პულსი',      unit: '/წთ',  min: 30,  max: 200 },
    { k: 'temp',         label: 'ტემპ.',      unit: '°C',   min: 34,  max: 42  },
    { k: 'weight',       label: 'წონა',       unit: 'კგ',   min: 1,   max: 300 },
    { k: 'pain_score',   label: 'ტკ. (NRS)',  unit: '/10',  min: 0,   max: 10  },
  ]

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {fields.map(f => (
        <div key={f.k} className="bg-slate-50 rounded-xl border border-slate-100 p-2.5">
          <p className="text-[10px] text-slate-400 font-semibold mb-1 truncate">{f.label}</p>
          {readonly ? (
            <p className="text-sm font-black text-slate-800 tabular-nums">
              {v[f.k] != null ? `${v[f.k]}${f.unit}` : '—'}
            </p>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number" min={f.min} max={f.max} step={f.k === 'temp' ? 0.1 : 1}
                value={v[f.k] ?? ''}
                onChange={e => upd(f.k, e.target.value)}
                className="w-full bg-transparent text-sm font-black text-slate-800
                  tabular-nums focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 flex-shrink-0">{f.unit}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── History list row ─────────────────────────────────────────
function HistoryRow({
  note,
  selected,
  onClick,
}: {
  note:     SoapNoteHistoryRow
  selected: boolean
  onClick:  () => void
}) {
  const statusColors: Record<NoteStatus, string> = {
    draft:   'bg-slate-200',
    signed:  'bg-emerald-500',
    amended: 'bg-amber-500',
  }
  return (
    <button onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3.5 border-b
        border-slate-50 last:border-0 text-left transition-colors
        ${selected ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}>
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0
        ${statusColors[note.status]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-slate-600 tabular-nums">
            {fmtDate(note.created_at)}
          </span>
          {note.template_name && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5
              py-0.5 rounded-full font-medium truncate max-w-[100px]">
              {note.template_name}
            </span>
          )}
          {note.is_signed && (
            <BadgeCheck size={12} className="text-emerald-500 flex-shrink-0" />
          )}
        </div>
        {note.subjective_preview && (
          <p className="text-xs text-slate-600 truncate leading-relaxed">
            {note.subjective_preview}
          </p>
        )}
        {note.assessment_preview && (
          <p className="text-xs text-slate-400 truncate">
            → {note.assessment_preview}
          </p>
        )}
        {note.icd10_codes?.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {note.icd10_codes.slice(0, 3).map(c => (
              <span key={c.code}
                className="text-[10px] font-mono bg-violet-50 text-violet-600
                  px-1.5 py-0.5 rounded">
                {c.code}
              </span>
            ))}
          </div>
        )}
      </div>
      <ChevronRight size={13} className="text-slate-300 flex-shrink-0 mt-1" />
    </button>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────

export default function SOAPNotesPage() {
  const { id: patientId } = useParams<{ id: string }>()
  const [patientName, setPatientName] = useState('პაციენტი')
  
  const { notes, loading: histLoading, refetch } = usePatientNotes(patientId || null)
  const { create, busy: createBusy }             = useCreateSoapNote()
  const { sign, amend, busy: signBusy }          = useSignNote()

  const [activeId,     setActiveId]     = useState<string | null>(null)
  const [showTplPick,  setShowTplPick]  = useState(false)
  const [showVitals,   setShowVitals]   = useState(false)
  const [showICD,      setShowICD]      = useState(false)
  const [tab,          setTab]          = useState<'editor' | 'history'>('editor')

  const { note, loading: noteLoading, refetch: refetchNote } = useSoapNote(activeId)
  const { debouncedSave, saveNow, saving, lastSaved }        = useAutoSaveNote(activeId)

  // Fetch patient name if possible (optional enhancement)
  useEffect(() => {
    if (!patientId) return
    // We can fetch from customers table
    setPatientName(`ID: ${patientId.slice(0,8)}`)
  }, [patientId])

  // Local draft state
  const [draft, setDraft] = useState<{
    subjective: string; objective: string; assessment: string; plan: string
    icd10_codes: ICD10Code[]; vitals: Vitals | null
    follow_up_date: string; follow_up_notes: string
  } | null>(null)

  // Sync note → draft
  useEffect(() => {
    if (!note) return
    setDraft({
      subjective:       note.subjective,
      objective:        note.objective,
      assessment:       note.assessment,
      plan:             note.plan,
      icd10_codes:      note.icd10_codes ?? [],
      vitals:           note.vitals,
      follow_up_date:   note.follow_up_date ?? '',
      follow_up_notes:  note.follow_up_notes ?? '',
    })
  }, [note?.id])

  const setField = (k: string, v: any) => {
    if (!draft || !note || note.is_signed) return
    const nd = { ...draft, [k]: v }
    setDraft(nd)
    debouncedSave({ [k]: v })
  }

  const handleNewNote = async (template?: SoapTemplate) => {
    if (!patientId) return
    const n = await create({
      patientId, patientName,
      templateId:   template?.id,
      templateName: template?.name,
      subjective:   template?.subjective_tpl ?? '',
      objective:    template?.objective_tpl  ?? '',
      assessment:   template?.assessment_tpl ?? '',
      plan:         template?.plan_tpl       ?? '',
    })
    if (n) {
      setActiveId(n.id)
      setTab('editor')
      refetch()
      setShowTplPick(false)
    }
  }

  const handleSign = async () => {
    if (!activeId || !draft) return
    await saveNow({
      subjective:      draft.subjective,
      objective:       draft.objective,
      assessment:      draft.assessment,
      plan:            draft.plan,
      icd10_codes:     draft.icd10_codes,
      vitals:          draft.vitals,
      follow_up_date:  draft.follow_up_date || null,
      follow_up_notes: draft.follow_up_notes || null,
    })
    const ok = await sign(activeId)
    if (ok) { refetchNote(); refetch() }
  }

  const handleAmend = async () => {
    if (!activeId) return
    const copy = await amend(activeId)
    if (copy) { setActiveId(copy.id); refetch() }
  }

  const isReadonly = note?.is_signed ?? false

  return (
    <div className="flex h-full overflow-hidden bg-slate-50 min-h-screen">

      {/* ── Left panel: history list ── */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-slate-100
        flex flex-col overflow-hidden">

        <div className="px-5 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-black text-slate-900">კლინ. ჩანაწერები</h2>
            <Button
              size="sm"
              onClick={() => setShowTplPick(true)}
              className="rounded-xl h-8 text-xs font-bold"
            >
              <Plus size={14} className="mr-1" />
              ახალი
            </Button>
          </div>
          <p className="text-xs text-slate-400 font-medium truncate">{patientName}</p>
        </div>

        {/* Quick new without template */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => handleNewNote()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              border border-dashed border-slate-200 text-xs font-semibold
              text-slate-400 hover:border-slate-400 hover:text-slate-600
              transition-all bg-slate-50/50 hover:bg-slate-50">
            <FileText size={14} />
            ცარიელი ჩანაწერი
          </button>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto">
          {histLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <History size={20} className="text-slate-300" />
              </div>
              <p className="text-slate-400 text-xs font-medium">ჩანაწერები ვერ მოიძებნა</p>
            </div>
          ) : notes.map(n => (
            <HistoryRow
              key={n.id}
              note={n}
              selected={activeId === n.id}
              onClick={() => { setActiveId(n.id); setTab('editor') }}
            />
          ))}
        </div>
      </div>

      {/* ── Main editor ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Editor toolbar */}
        <div className="bg-white border-b border-slate-100 px-6 py-4
          flex-shrink-0 flex items-center justify-between gap-6 shadow-sm z-10">
          <div className="flex items-center gap-4 min-w-0">
            {note ? (
              <>
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <Stethoscope size={20} className="text-slate-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h1 className="text-sm font-black text-slate-900 truncate">
                      {note.template_name ?? 'SOAP ჩანაწერი'}
                    </h1>
                    {note.is_signed && (
                      <span className="flex items-center gap-1 text-[10px] font-bold
                        text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0 border border-emerald-100">
                        <BadgeCheck size={10} />
                        ხელმ.
                      </span>
                    )}
                    {note.status === 'amended' && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50
                        px-2 py-0.5 rounded-full flex-shrink-0 border border-amber-100">
                        შ/ც
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {fmtDateTime(note.created_at)}
                    {saving && ' · შენახვა…'}
                    {!saving && lastSaved && ` · შენახული: ${format(lastSaved, 'HH:mm')}`}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <FileText size={20} className="text-slate-200" />
                </div>
                <p className="text-sm font-medium text-slate-400">
                  აარჩიეთ ჩანაწერი ან შექმენით ახალი
                </p>
              </div>
            )}
          </div>

          {note && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant={showVitals ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowVitals(s => !s)}
                className="rounded-xl h-9 text-xs"
              >
                <Zap size={14} className="mr-1.5" />
                Vitals
              </Button>
              <Button
                variant={showICD ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowICD(s => !s)}
                className={`rounded-xl h-9 text-xs ${showICD ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
              >
                <Tag size={14} className="mr-1.5" />
                ICD-10
                {(draft?.icd10_codes?.length ?? 0) > 0 && (
                  <span className="ml-1.5 bg-white/20 rounded-full px-1.5 text-[10px]">
                    {draft.icd10_codes.length}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveNow({ subjective: draft?.subjective, objective: draft?.objective, assessment: draft?.assessment, plan: draft?.plan })}
                disabled={isReadonly || saving}
                className="rounded-xl h-9 text-xs"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} className="mr-1.5" />}
                შენახვა
              </Button>
              {!note.is_signed ? (
                <Button
                  size="sm"
                  onClick={handleSign}
                  disabled={signBusy}
                  className="rounded-xl h-9 text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  {signBusy
                    ? <Loader2 size={14} className="animate-spin" />
                    : <BadgeCheck size={14} className="mr-1.5" />}
                  ხელმოწერა
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAmend}
                  disabled={signBusy}
                  className="rounded-xl h-9 text-xs border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                >
                  <RotateCcw size={14} className="mr-1.5" />
                  შესწორება
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {noteLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={32} className="animate-spin text-slate-200" />
            </div>
          ) : note && draft ? (
            <div className="max-w-4xl mx-auto p-6 space-y-6 pb-20">
              {/* Vitals & ICD toggle views */}
              {showVitals && (
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">სასიცოცხლო ნიშნები</p>
                  <VitalsPanel
                    vitals={draft.vitals}
                    onChange={v => setField('vitals', v)}
                    readonly={isReadonly}
                  />
                </div>
              )}

              {showICD && (
                <div className="bg-violet-50/30 border border-violet-100 rounded-3xl p-5 shadow-sm">
                  <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-4">დიაგნოზის კოდები (ICD-10)</p>
                  <ICD10Picker
                    selected={draft.icd10_codes}
                    suggested={[]}
                    onChange={codes => setField('icd10_codes', codes)}
                    readonly={isReadonly}
                  />
                </div>
              )}

              {/* SOAP sections */}
              <div className="space-y-4">
                {(['subjective','objective','assessment','plan'] as SectionKey[]).map(sk => (
                  <SectionEditor
                    key={sk}
                    sectionKey={sk}
                    value={draft[sk]}
                    onChange={v => setField(sk, v)}
                    phrases={[]}
                    readonly={isReadonly}
                  />
                ))}
              </div>

              {/* Follow-up */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Clock size={12} className="text-slate-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">მომდევნო ვიზიტი</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1.5 uppercase ml-1">თარიღი</label>
                    <Input
                      type="date"
                      value={draft.follow_up_date}
                      onChange={e => setField('follow_up_date', e.target.value)}
                      disabled={isReadonly}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold block mb-1.5 uppercase ml-1">შენიშვნა</label>
                    <Input
                      value={draft.follow_up_notes}
                      onChange={e => setField('follow_up_notes', e.target.value)}
                      disabled={isReadonly}
                      placeholder="კ/გ, სეანსი…"
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Signed Footer */}
              {note.is_signed && (
                <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 rounded-3xl px-6 py-5">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <Shield size={24} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-900 mb-0.5">სამედიცინო ჩანაწერი დამოწმებულია</p>
                    <p className="text-xs text-emerald-600 font-medium">
                      {note.signed_at ? fmtDateTime(note.signed_at) : ''} · {note.doctor_name || 'დაუზუსტებელი ექიმი'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-10">
              <div className="w-20 h-20 bg-slate-100 rounded-[2.5rem] flex items-center justify-center mb-6">
                <Stethoscope size={36} className="text-slate-200" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">კლინიკური დოკუმენტაცია</h3>
              <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                აარჩიეთ არსებული ჩანაწერი ისტორიიდან ან შექმენით ახალი SOAP დოკუმენტი პაციენტისთვის.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Template Picker Backdrop */}
      {showTplPick && (
        <TemplatePicker
          onSelect={handleNewNote}
          onClose={() => setShowTplPick(false)}
        />
      )}
    </div>
  )
}
