// components/ConsentFormsPage.tsx
// Design: document-first — feels like a real legal form.
// Crisp white paper, judicial serif body text, signature pad prominent.
// Color signals only for status — otherwise black ink on white.

import { useState, useRef, useCallback } from 'react'
import { format, parseISO }              from 'date-fns'
import { ka }                            from 'date-fns/locale'
import {
  CheckCircle2, ChevronRight, ClipboardList,
  Download, Eraser, FileCheck2, FilePlus2,
  Loader2, PenLine, Printer, RotateCcw,
  Shield, Trash2, X,
} from 'lucide-react'

import {
  useConsentTemplates, useConsentForms,
  useCreateConsentForm, useSignConsent, useSignaturePad,
} from '@/hooks/useConsentForms'
import { useTenant }  from '@/hooks/useTenant'
import {
  ConsentFormTemplate, ConsentForm, ConsentStatus,
  ConsentCategory, CATEGORY_META, STATUS_META, renderTemplate,
} from '@/types/consentForms'

// ─── Utils ────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  format(parseISO(d), 'd MMMM yyyy, HH:mm', { locale: ka })

// ─── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: ConsentStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold
      px-2.5 py-0.5 rounded-full ${m.color} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

// ─── Signature Pad widget ─────────────────────────────────────
function SignaturePad({
  label,
  onCapture,
  height = 140,
}: {
  label:     string
  onCapture: (data: string) => void
  height?:   number
}) {
  const canvasRef              = useRef<HTMLCanvasElement>(null)
  const { clear, getDataURL, isEmpty } = useSignaturePad(canvasRef)

  const handleCapture = () => {
    const data = getDataURL()
    if (!data) return
    onCapture(data)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      <div className="relative border-2 border-dashed border-slate-300 rounded-2xl
        overflow-hidden bg-white" style={{ height }}>
        <canvas
          ref={canvasRef}
          width={560}
          height={height}
          className="w-full h-full touch-none cursor-crosshair"
          style={{ display: 'block' }}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center
            pointer-events-none">
            <p className="text-slate-300 text-sm select-none flex items-center gap-2">
              <PenLine size={16} />
              მოაწერეთ ხელი
            </p>
          </div>
        )}
        {/* Baseline */}
        <div className="absolute bottom-8 left-8 right-8 border-b border-slate-200
          pointer-events-none" />
      </div>
      <div className="flex gap-2">
        <button
          onClick={clear}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200
            rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50
            transition-colors"
        >
          <Eraser size={12} />
          გასუფთავება
        </button>
        <button
          onClick={handleCapture}
          disabled={isEmpty}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900
            text-white rounded-xl text-xs font-bold disabled:opacity-30
            hover:bg-slate-700 transition-colors"
        >
          <CheckCircle2 size={12} />
          დადასტურება
        </button>
      </div>
    </div>
  )
}

// ─── Step 1: Template picker ──────────────────────────────────
function TemplatePicker({
  onSelect,
  onClose,
}: {
  onSelect: (t: ConsentFormTemplate) => void
  onClose:  () => void
}) {
  const { templates, loading } = useConsentTemplates()
  const [search, setSearch]    = useState('')
  const [catF,   setCatF]      = useState<ConsentCategory | 'all'>('all')

  const filtered = templates.filter(t => {
    if (catF !== 'all' && t.category !== catF) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const cats = [...new Set(templates.map(t => t.category))]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl
        flex flex-col max-h-[80vh] overflow-hidden">

        <div className="flex items-center justify-between px-6 pt-5 pb-4
          border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900">ფორმის შაბლონი</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0 space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ძებნა…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-400" />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <button onClick={() => setCatF('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold
                border transition-colors
                ${catF === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              ყველა
            </button>
            {cats.map(c => (
              <button key={c} onClick={() => setCatF(c)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold
                  border transition-colors
                  ${catF === c
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={18} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.map(t => (
            <button key={t.id} onClick={() => onSelect(t)}
              className="w-full flex items-center gap-4 p-4 border border-slate-200
                rounded-2xl hover:border-slate-400 hover:bg-slate-50
                transition-colors text-left group">
              <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center
                justify-center text-xl flex-shrink-0 group-hover:bg-slate-200
                transition-colors">
                {CATEGORY_META[t.category].icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {CATEGORY_META[t.category].label}
                  {t.requires_witness && ' · მოწმე საჭ.'}
                  {' · v'}{t.version}
                </p>
              </div>
              <ChevronRight size={15} className="text-slate-300 flex-shrink-0
                group-hover:text-slate-500 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Fill variables ───────────────────────────────────
function VariablesForm({
  template,
  patientName,
  onSubmit,
  onBack,
  busy,
}: {
  template:    ConsentFormTemplate
  patientName: string
  onSubmit:    (vars: Record<string, string>) => void
  onBack:      () => void
  busy:        boolean
}) {
  const [vars, setVars] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = { patient_name: patientName }
    for (const v of template.variables) {
      defaults[v.key] = v.key === 'patient_name' ? patientName : ''
    }
    return defaults
  })

  const set = (k: string, v: string) => setVars(p => ({ ...p, [k]: v }))

  const canSubmit = template.variables
    .filter(v => v.required)
    .every(v => (vars[v.key] ?? '').trim() !== '')

  // Live preview
  const preview = renderTemplate(template.body_ka, vars)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-6 pt-5 pb-4
        border-b border-slate-100 flex-shrink-0">
        <button onClick={onBack}
          className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center
            hover:bg-slate-200 transition-colors">
          <RotateCcw size={13} className="text-slate-500" />
        </button>
        <h2 className="text-base font-bold text-slate-900">{template.name}</h2>
      </div>

      <div className="flex-1 overflow-hidden flex gap-0">
        {/* Variables panel */}
        <div className="w-56 flex-shrink-0 border-r border-slate-100
          overflow-y-auto p-5 space-y-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            ველები
          </p>
          {template.variables.map(v => (
            <div key={v.key}>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {v.label}
                {v.required && <span className="text-rose-500 ml-0.5">*</span>}
              </label>
              {v.type === 'textarea' ? (
                <textarea
                  value={vars[v.key] ?? ''}
                  onChange={e => set(v.key, e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2
                    text-xs resize-none focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              ) : (
                <input
                  type={v.type === 'date' ? 'date' : 'text'}
                  value={vars[v.key] ?? ''}
                  onChange={e => set(v.key, e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2
                    text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              )}
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4">
            გადახედვა
          </p>
          <div className="bg-white border border-slate-200 rounded-2xl p-6
            shadow-sm prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800
              leading-relaxed">
              {preview}
            </pre>
          </div>
        </div>
      </div>

      <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
        <button onClick={onBack}
          className="flex-1 py-3 border border-slate-200 rounded-xl text-sm
            font-semibold text-slate-600 hover:bg-slate-50">
          უკან
        </button>
        <button
          onClick={() => onSubmit(vars)}
          disabled={!canSubmit || busy}
          className="flex-1 py-3 bg-slate-900 hover:bg-slate-700 text-white font-bold
            rounded-xl text-sm transition-colors disabled:opacity-40
            flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <FileCheck2 size={14} />}
          ფორმის შექმნა
        </button>
      </div>
    </div>
  )
}

// ─── Signing screen ───────────────────────────────────────────
function SigningScreen({
  form,
  onSigned,
  onClose,
}: {
  form:     ConsentForm
  onSigned: () => void
  onClose:  () => void
}) {
  const { signAsPatient, signAsWitness, signAsDoctor, busy } = useSignConsent()
  const [step, setStep]         = useState<'read' | 'sign' | 'witness' | 'doctor' | 'done'>('read')
  const [witnessName, setWitnessName] = useState('')
  const [capturedSig, setCapturedSig] = useState<string | null>(null)

  const needsWitness = (form.template as any)?.requires_witness

  const handlePatientSign = async () => {
    if (!capturedSig) return
    const ok = await signAsPatient(form.id, capturedSig)
    if (ok) {
      setCapturedSig(null)
      setStep(needsWitness ? 'witness' : 'doctor')
    }
  }

  const handleWitnessSign = async () => {
    if (!capturedSig || !witnessName.trim()) return
    const ok = await signAsWitness(form.id, capturedSig, witnessName)
    if (ok) { setCapturedSig(null); setStep('doctor') }
  }

  const handleDoctorSign = async () => {
    if (!capturedSig) return
    const ok = await signAsDoctor(form.id, capturedSig)
    if (ok) { setStep('done'); onSigned() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl
        flex flex-col max-h-[95vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4
          border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {(form.template as any)?.name}
            </h2>
            <p className="text-xs text-slate-400">{form.patient_name}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {[
            { k: 'read',    l: 'კითხვა'      },
            { k: 'sign',    l: 'პაციენტი'    },
            ...(needsWitness ? [{ k: 'witness', l: 'მოწმე' }] : []),
            { k: 'doctor',  l: 'ექიმი'       },
          ].map(({ k, l }) => {
            const isDone = (
              (k === 'read'    && step !== 'read') ||
              (k === 'sign'    && ['witness','doctor','done'].includes(step)) ||
              (k === 'witness' && ['doctor','done'].includes(step)) ||
              (k === 'doctor'  && step === 'done')
            )
            return (
              <div key={k}
                className={`flex-1 text-center py-3 text-xs font-semibold border-b-2
                  transition-colors
                  ${step === k
                    ? 'border-slate-900 text-slate-900'
                    : isDone
                      ? 'border-emerald-400 text-emerald-600'
                      : 'border-transparent text-slate-400'}`}>
                {isDone ? '✓ ' : ''}{l}
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Read step */}
          {step === 'read' && (
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800
                  leading-[1.9] tracking-wide">
                  {form.rendered_body}
                </pre>
              </div>
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200
                rounded-xl p-4">
                <Shield size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  გთხოვთ, ყურადღებით წაიკითხოთ ზემოთ მოცემული ინფორმაცია
                  ხელმოწერამდე.
                </p>
              </div>
              <button onClick={() => setStep('sign')}
                className="w-full py-4 bg-slate-900 hover:bg-slate-700 text-white
                  font-bold rounded-2xl text-base transition-colors
                  flex items-center justify-center gap-2">
                <PenLine size={18} />
                წავიკითხე — ხელმოწერაზე გადასვლა
              </button>
            </div>
          )}

          {/* Patient sign step */}
          {step === 'sign' && (
            <div className="p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium">
                  <span className="font-bold">{form.patient_name}</span> — მოაწერეთ ხელი
                  ქვემოთ, რათა დაადასტუროთ ზემოთ წაკითხული ინფორმაციის გაგება
                  და ნებაყოფლობითი თანხმობა.
                </p>
              </div>
              <SignaturePad
                label="პაციენტის ხელმოწერა"
                onCapture={sig => setCapturedSig(sig)}
              />
              {capturedSig && (
                <div className="flex items-center gap-3 bg-emerald-50 border
                  border-emerald-200 rounded-xl p-3">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <p className="text-sm text-emerald-700 font-medium">
                    ხელმოწერა მზადაა — დააჭირეთ "დადასტ." ქვემოთ
                  </p>
                </div>
              )}
              <button onClick={handlePatientSign}
                disabled={!capturedSig || busy}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white
                  font-bold rounded-2xl transition-colors disabled:opacity-40
                  flex items-center justify-center gap-2">
                {busy
                  ? <Loader2 size={18} className="animate-spin" />
                  : <CheckCircle2 size={18} />}
                ხელმოწერის შენახვა
              </button>
            </div>
          )}

          {/* Witness sign step */}
          {step === 'witness' && (
            <div className="p-6 space-y-5">
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                <p className="text-sm text-violet-800">
                  ეს ფორმა მოითხოვს მოწმის ხელმოწერას. მოწმე ადასტურებს,
                  რომ პაციენტმა ნებაყოფლობით მოაწერა ხელი.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                  მოწმის სახელი / გვარი *
                </label>
                <input
                  value={witnessName}
                  onChange={e => setWitnessName(e.target.value)}
                  placeholder="სახელი გვარი"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                    text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <SignaturePad
                label="მოწმის ხელმოწერა"
                onCapture={sig => setCapturedSig(sig)}
              />
              <button onClick={handleWitnessSign}
                disabled={!capturedSig || !witnessName.trim() || busy}
                className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white
                  font-bold rounded-2xl transition-colors disabled:opacity-40
                  flex items-center justify-center gap-2">
                {busy
                  ? <Loader2 size={18} className="animate-spin" />
                  : <CheckCircle2 size={18} />}
                მოწმის ხელმოწ. შენახვა
              </button>
            </div>
          )}

          {/* Doctor sign step */}
          {step === 'doctor' && (
            <div className="p-6 space-y-5">
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                <p className="text-sm text-teal-800">
                  ექიმმა უნდა მოაწეროს ხელი, რათა დაადასტუროს, რომ
                  პაციენტი ინფორმირებულია სრულად.
                </p>
              </div>
              {form.doctor_name && (
                <p className="text-sm font-semibold text-slate-600">
                  ექიმი: {form.doctor_name}
                </p>
              )}
              <SignaturePad
                label="ექიმის ხელმოწერა"
                onCapture={sig => setCapturedSig(sig)}
              />
              <button onClick={handleDoctorSign}
                disabled={!capturedSig || busy}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white
                  font-bold rounded-2xl transition-colors disabled:opacity-40
                  flex items-center justify-center gap-2">
                {busy
                  ? <Loader2 size={18} className="animate-spin" />
                  : <FileCheck2 size={18} />}
                დასრულება
              </button>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="p-6 flex flex-col items-center text-center gap-5 py-12">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center
                justify-center ring-4 ring-emerald-200">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 mb-1">
                  ფორმა ხელმოწერილია
                </p>
                <p className="text-sm text-slate-400">
                  {(form.template as any)?.name}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-200
                    rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  <Printer size={14} />
                  ბეჭდვა
                </button>
                <button onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white
                    rounded-xl text-sm font-bold hover:bg-slate-700">
                  <X size={14} />
                  დახურვა
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Form detail view (read-only) ─────────────────────────────
function FormDetailPanel({
  form,
  onClose,
  onRefresh,
}: {
  form:      ConsentForm
  onClose:   () => void
  onRefresh: () => void
}) {
  const { revoke } = useSignConsent()
  const [showSign, setShowSign] = useState(false)

  const renderSig = (sig: string | null, label: string) => {
    if (!sig) return (
      <div className="border-2 border-dashed border-slate-200 rounded-xl h-20
        flex items-center justify-center">
        <p className="text-xs text-slate-300">{label} — ხელი არ მოწერია</p>
      </div>
    )
    return (
      <div className="border border-emerald-200 rounded-xl overflow-hidden bg-white">
        <p className="text-[10px] font-semibold text-slate-400 px-3 pt-2 uppercase tracking-wider">
          {label}
        </p>
        <img src={sig} alt={label}
          className="w-full h-20 object-contain p-2" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-black text-slate-900">
            {(form.template as any)?.name}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{form.patient_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={form.status} />
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <X size={12} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-1.5 text-xs">
        {form.patient_signed_at && (
          <div className="flex justify-between">
            <span className="text-slate-400">პაც. ხელმ.</span>
            <span className="font-semibold text-emerald-700">{fmtDate(form.patient_signed_at)}</span>
          </div>
        )}
        {form.witness_signed_at && (
          <div className="flex justify-between">
            <span className="text-slate-400">მოწმე ({form.witness_name})</span>
            <span className="font-semibold text-violet-700">{fmtDate(form.witness_signed_at)}</span>
          </div>
        )}
        {form.doctor_signed_at && (
          <div className="flex justify-between">
            <span className="text-slate-400">ექიმი</span>
            <span className="font-semibold text-teal-700">{fmtDate(form.doctor_signed_at)}</span>
          </div>
        )}
      </div>

      {/* Form body (collapsed) */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-slate-500
          hover:text-slate-800 flex items-center gap-1.5 list-none">
          <ClipboardList size={12} />
          ფორმის ტექსტი
        </summary>
        <div className="mt-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
          <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700
            leading-relaxed">
            {form.rendered_body}
          </pre>
        </div>
      </details>

      {/* Signatures */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          ხელმოწერები
        </p>
        {renderSig(form.patient_signature, 'პაციენტი')}
        {(form.template as any)?.requires_witness &&
          renderSig(form.witness_signature, `მოწმე${form.witness_name ? ` — ${form.witness_name}` : ''}`)}
        {renderSig(form.doctor_signature, 'ექიმი')}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        {form.status === 'pending' && (
          <button onClick={() => setShowSign(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5
              bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700">
            <PenLine size={13} />
            ხელმოწერა
          </button>
        )}
        {['signed','witnessed'].includes(form.status) && (
          <button onClick={() => setShowSign(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5
              bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700">
            <FileCheck2 size={13} />
            გაგრძელება
          </button>
        )}
        <button onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200
            rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <Printer size={13} />
        </button>
        {form.status !== 'revoked' && form.status !== 'completed' && (
          <button
            onClick={async () => { await revoke(form.id); onRefresh() }}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-rose-200
              rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {showSign && (
        <SigningScreen
          form={form}
          onSigned={onRefresh}
          onClose={() => { setShowSign(false); onRefresh() }}
        />
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────
interface ConsentFormsPageProps {
  patientId?:   string
  patientName?: string
  appointmentId?: string
  doctorName?:  string
}

export default function ConsentFormsPage({
  patientId,
  patientName = '',
  appointmentId,
  doctorName,
}: ConsentFormsPageProps) {
  const { tenantId }  = useTenant()
  const { forms, loading, refetch } = useConsentForms(patientId)
  const { create, busy }            = useCreateConsentForm()

  const [showPicker,  setShowPicker]  = useState(false)
  const [pickedTpl,   setPickedTpl]   = useState<ConsentFormTemplate | null>(null)
  const [selected,    setSelected]    = useState<ConsentForm | null>(null)
  const [newForm,     setNewForm]     = useState<ConsentForm | null>(null)

  // Stats
  const pending   = forms.filter(f => f.status === 'pending').length
  const completed = forms.filter(f => f.status === 'completed').length

  const handleCreate = async (vars: Record<string, string>) => {
    if (!pickedTpl) return
    const result = await create(
      pickedTpl, patientId ?? crypto.randomUUID(),
      patientName || vars.patient_name || 'პაციენტი',
      vars, appointmentId, doctorName,
    )
    if (result) {
      setPickedTpl(null)
      setNewForm(result)
      refetch()
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">თანხმობის ფორმები</h1>
          <p className="text-xs text-slate-400 mt-0.5">Medical Consent Forms</p>
        </div>
        <button onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700
            text-white font-bold text-sm rounded-xl transition-colors">
          <FilePlus2 size={15} />
          ახალი ფორმა
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'სულ',       v: forms.length,  cls: 'bg-slate-50 text-slate-900 border-slate-100' },
          { l: 'ელოდება',   v: pending,       cls: pending > 0 ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-slate-50 text-slate-900 border-slate-100' },
          { l: 'დასრულ.',   v: completed,     cls: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
        ].map(({ l, v, cls }) => (
          <div key={l} className={`rounded-2xl border p-4 text-center ${cls}`}>
            <p className="text-2xl font-black">{v}</p>
            <p className="text-xs font-medium opacity-60 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-5 items-start">

        {/* Forms list */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100
          overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">ფორმები ვერ მოიძებნა</p>
              <p className="text-slate-300 text-xs mt-1">
                შექმენით პირველი — "ახალი ფორმა" ღილაკზე
              </p>
            </div>
          ) : forms.map(f => (
            <button key={f.id}
              onClick={() => setSelected(selected?.id === f.id ? null : f)}
              className={`w-full flex items-center gap-4 px-5 py-4 border-b
                border-slate-50 last:border-0 text-left transition-colors
                ${selected?.id === f.id ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}>
              {/* Category icon */}
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center
                justify-center text-lg flex-shrink-0">
                {CATEGORY_META[(f.template as any)?.category ?? 'general'].icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {(f.template as any)?.name ?? 'ფორმა'}
                  </p>
                  <StatusBadge status={f.status} />
                </div>
                <p className="text-xs text-slate-400">
                  {f.patient_name} · {fmtDate(f.created_at)}
                </p>
              </div>

              <div className="text-right flex-shrink-0 space-y-1">
                {f.patient_signed_at && (
                  <p className="text-[10px] text-emerald-600 font-medium">
                    ✓ პაც.
                  </p>
                )}
                {f.doctor_signed_at && (
                  <p className="text-[10px] text-teal-600 font-medium">
                    ✓ ექ.
                  </p>
                )}
              </div>

              <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 bg-white border border-slate-100
            rounded-2xl p-5 overflow-y-auto max-h-[80vh] sticky top-4">
            <FormDetailPanel
              form={selected}
              onClose={() => setSelected(null)}
              onRefresh={() => { refetch(); setSelected(null) }}
            />
          </div>
        )}
      </div>

      {/* Template picker modal */}
      {showPicker && (
        <TemplatePicker
          onSelect={t => { setPickedTpl(t); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Variable fill modal */}
      {pickedTpl && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl
            flex flex-col" style={{ height: '90vh' }}>
            <VariablesForm
              template={pickedTpl}
              patientName={patientName}
              onSubmit={handleCreate}
              onBack={() => setPickedTpl(null)}
              busy={busy}
            />
          </div>
        </div>
      )}

      {/* Auto-open signing for newly created form */}
      {newForm && (
        <SigningScreen
          form={newForm}
          onSigned={refetch}
          onClose={() => { setNewForm(null); refetch() }}
        />
      )}
    </div>
  )
}
