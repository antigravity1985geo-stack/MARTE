
import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, differenceInDays, isPast, isToday } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  AlertTriangle, ArrowRight, Beaker, Calendar,
  CheckCircle2, ChevronRight, Clock, FileText,
  FlaskConical, Loader2, Paperclip, Plus,
  RefreshCw, RotateCcw, Search, Send, Truck,
  User, X, Zap, Settings2, Sparkles, TrendingUp
} from 'lucide-react'
import { LabManagementDialog } from '@/components/clinic/LabManagementDialog'
import { Button } from '@/components/ui/button'

import {
  useLabOrders, useLabOrderActions,
  useDentalLabs, useLabWorkTypes, useLabOrder,
} from '@/hooks/useDentalLab'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  LabOrder, LabOrderStatus, LabOrderCategory,
  STATUS_META, CATEGORY_LABELS, FDI_TEETH, VITA_SHADES,
  STATUS_TRANSITIONS,
} from '@/types/dentalLab'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'react-hot-toast'

// ─── Utils ────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) => {
    try {
        return format(new Date(d), 'd MMM yyyy', { locale: ka })
    } catch (e) {
        return d
    }
}

const daysLeft = (due: string) => differenceInDays(new Date(due), new Date())

// ─── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: LabOrderStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold
      px-2.5 py-1 rounded-full ${m.color} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

// ─── Due date chip ────────────────────────────────────────────
function DueDateChip({ due, status }: { due: string; status: LabOrderStatus }) {
  const done    = ['fitted','cancelled','received'].includes(status)
  const days    = daysLeft(due)
  const overdue = !done && days < 0
  const urgent  = !done && days === 0
  const soon    = !done && days <= 2 && days >= 0

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg
      ${overdue ? 'bg-rose-100 text-rose-700' :
        urgent  ? 'bg-orange-100 text-orange-700' :
        soon    ? 'bg-amber-100 text-amber-700' :
        done    ? 'bg-slate-100 text-slate-400' :
                  'bg-slate-100 text-slate-600'}`}>
      <Clock size={10} />
      {done ? fmtDate(due) :
       overdue ? `${Math.abs(days)}დ ვადა გასული` :
       urgent  ? 'დღეს' :
       `${days}დ`}
    </span>
  )
}

// ─── Teeth display ────────────────────────────────────────────
function TeethChips({ teeth }: { teeth: string[] }) {
  if (!teeth?.length) return <span className="text-slate-300 text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {teeth.map(t => (
        <span key={t} className="text-[11px] font-mono font-bold bg-teal-50
          text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded">
          {t}
        </span>
      ))}
    </div>
  )
}

// ─── Order card (kanban column) ───────────────────────────────
function OrderCard({
  order,
  onClick,
}: {
  order:   LabOrder
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-3.5 cursor-pointer
        hover:border-teal-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-[11px] font-bold text-slate-400 tracking-wider">
          {order.order_number}
        </span>
        <DueDateChip due={order.due_date} status={order.status} />
      </div>

      <p className="text-sm font-semibold text-slate-900 mb-1 leading-snug">
        {order.work_type_name}
      </p>
      <p className="text-xs text-slate-500 mb-2 truncate">
        {order.patient_name ?? (order.patient_id ? 'პაციენტი #' + order.patient_id.slice(0,6) : '—')}
      </p>

      <TeethChips teeth={order.teeth} />

      <div className="flex items-center justify-between mt-2.5 pt-2.5
        border-t border-slate-100">
        <span className="text-xs text-slate-400">
          {order.lab?.name}
        </span>
        <span className="text-sm font-bold text-slate-700 tabular-nums">
          ₾{fmt(order.lab_cost)}
        </span>
      </div>
    </div>
  )
}

// ─── Kanban board ─────────────────────────────────────────────
const BOARD_COLUMNS: LabOrderStatus[] = [
  'draft', 'sent', 'in_progress', 'ready', 'received', 'fitted',
]

function KanbanBoard({
  orders,
  onSelect,
}: {
  orders:   LabOrder[]
  onSelect: (o: LabOrder) => void
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {BOARD_COLUMNS.map(col => {
        const colOrders = orders.filter(o => o.status === col)
        const meta      = STATUS_META[col]
        return (
          <div key={col} className="flex-shrink-0 w-56">
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <span className="text-xs font-semibold text-slate-600">{meta.label}</span>
              <span className="ml-auto text-xs text-slate-400 bg-slate-100
                rounded-full px-2 py-0.5 font-medium">
                {colOrders.length}
              </span>
            </div>
            <div className="space-y-2">
              {colOrders.map(o => (
                <OrderCard key={o.id} order={o} onClick={() => onSelect(o)} />
              ))}
              {colOrders.length === 0 && (
                <div className="border-2 border-dashed border-slate-100 rounded-xl
                  h-20 flex items-center justify-center">
                  <span className="text-xs text-slate-300">ცარიელია</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── New Order Form ───────────────────────────────────────────
function NewOrderForm({
  tenantId,
  initialPatientId = null,
  initialTeeth = [],
  onSave,
  onClose,
}: {
  tenantId: string
  initialPatientId?: string | null
  initialTeeth?: string[]
  onSave:   () => void
  onClose:  () => void
}) {
  const { user, activeTenantId: authTenantId } = useAuthStore()
  const { labs } = useDentalLabs()
  const { createOrder, busy }    = useLabOrderActions()

  const [patients, setPatients]  = useState<any[]>([])
  const [labId, setLabId]        = useState<string | null>(null)
  const { types }                   = useLabWorkTypes(labId)
  const [form, setForm] = useState({
    patient_id:     initialPatientId,
    work_type_name: '',
    category:       'crown' as LabOrderCategory,
    material:       '',
    shade:          '',
    units:          1,
    due_date:       '',
    lab_cost:       '',
    patient_cost:   '',
    instructions:   '',
    special_notes:  '',
    teeth:          initialTeeth,
  })
  const [workTypeId, setWorkTypeId] = useState<string | null>(null)

  useEffect(() => {
    if (labs.length > 0 && !labId) {
      setLabId(labs[0].id)
    }
  }, [labs, labId])

  useEffect(() => {
    if (authTenantId) {
      const fetchPatients = async () => {
        const { data, error } = await supabase
          .from('clinic_patients')
          .select('id, first_name, last_name')
          .eq('tenant_id', authTenantId)
          .order('first_name', { ascending: true })

        if (error) {
          console.error('Error fetching patients:', error)
          toast.error('პაციენტების ჩატვირთვა ვერ მოხერხდა.')
        } else {
          setPatients(data || [])
        }
      }
      fetchPatients()
    }
  }, [authTenantId])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const toggleTooth = (t: string) =>
    set('teeth', form.teeth.includes(t)
      ? form.teeth.filter(x => x !== t)
      : [...form.teeth, t])

  const pickType = (id: string) => {
    const t = types.find(x => x.id === id)
    if (!t) {
      setWorkTypeId(null)
      set('work_type_name', '')
      set('category', 'crown') // Default category
      set('material', '')
      set('lab_cost', '')
      return
    }
    setWorkTypeId(t.id)
    set('work_type_name', t.name)
    set('category', t.category)
    set('material', t.material ?? '')
    set('lab_cost', String(t.base_cost))
  }

  const handleSubmit = async () => {
    if (!form.patient_id) return toast.error('აირჩიეთ პაციენტი')
    if (!labId) return toast.error('აირჩიეთ ლაბორატორია')
    if (!workTypeId) return toast.error('აირჩიეთ სამუშაო ტიპი')
    if (!form.due_date) return toast.error('მიუთითეთ ჩაბარების თარიღი')
    if (!user) return toast.error('ავტორიზაციის შეცდომა')

    const result = await createOrder({
      lab_id:          labId,
      patient_id:      form.patient_id,
      doctor_id:       user.id,
      appointment_id:  null,
      work_type_id:    workTypeId,
      work_type_name:  form.work_type_name,
      category:        form.category,
      material:        form.material || null,
      shade:           form.shade || null,
      teeth:           form.teeth,
      units:           form.units,
      instructions:    form.instructions || null,
      special_notes:   form.special_notes || null,
      attachments:     [],
      sent_date:       null,
      due_date:        form.due_date,
      received_date:   null,
      fit_date:        null,
      lab_cost:        parseFloat(form.lab_cost) || 0,
      patient_cost:    parseFloat(form.patient_cost) || 0,
      paid_to_lab:     false,
      paid_date:       null,
      status:          'draft',
      remake_reason:   null,
      cancel_reason:   null,
    })
    if (result) { onSave(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl
        flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4
          border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
              <FlaskConical size={18} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">ახალი ლაბ. შეკვეთა</h2>
              <p className="text-xs text-slate-400">Lab Order</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200
              flex items-center justify-center transition-colors">
            <X size={15} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Patient Selection */}
          <div className="grid gap-2">
            <label className="block text-xs font-semibold text-slate-500
              uppercase tracking-wider mb-1.5">პაციენტი *</label>
            <select value={form.patient_id || ''} onChange={e => set('patient_id', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">— აირჩიეთ პაციენტი —</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>

          {/* Lab + Work type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500
                uppercase tracking-wider mb-1.5">ლაბორატორია *</label>
              <select value={labId || ''} onChange={e => setLabId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                  text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="">— აირჩიეთ —</option>
                {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500
                uppercase tracking-wider mb-1.5">სამუშაო ტიპი *</label>
              <select value={workTypeId || ''} onChange={e => pickType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                  text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="">— აირჩიეთ —</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({CATEGORY_LABELS[t.category]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Material, Shade, Units */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500
                uppercase tracking-wider mb-1.5">მასალა</label>
              <input value={form.material} onChange={e => set('material', e.target.value)}
                placeholder="Zirconia, PFM…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                  text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500
                uppercase tracking-wider mb-1.5">ფერი (Shade)</label>
              <select value={form.shade} onChange={e => set('shade', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                  text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="">—</option>
                {VITA_SHADES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500
                uppercase tracking-wider mb-1.5">ერთეული</label>
              <input type="number" min={1} max={32}
                value={form.units} onChange={e => set('units', parseInt(e.target.value)||1)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                  text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>

          {/* Tooth selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500
              uppercase tracking-wider mb-2">კბილები (FDI)</label>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              {/* Upper jaw */}
              <div className="flex justify-center gap-1 mb-1">
                {FDI_TEETH.slice(0, 8).map(t => (
                  <button key={t} type="button" onClick={() => toggleTooth(t)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold font-mono transition-all
                      ${form.teeth.includes(t)
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-teal-300'}`}>
                    {t}
                  </button>
                ))}
                <div className="w-2" />
                {FDI_TEETH.slice(8, 16).map(t => (
                  <button key={t} type="button" onClick={() => toggleTooth(t)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold font-mono transition-all
                      ${form.teeth.includes(t)
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-teal-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
              {/* Midline indicator */}
              <div className="flex justify-center my-1">
                <div className="w-[calc(50%-4px)] h-px bg-slate-200" />
                <div className="mx-2 text-[9px] text-slate-300 font-semibold">—</div>
                <div className="w-[calc(50%-4px)] h-px bg-slate-200" />
              </div>
              {/* Lower jaw */}
              <div className="flex justify-center gap-1 mb-1">
                {FDI_TEETH.slice(16, 24).map(t => (
                  <button key={t} type="button" onClick={() => toggleTooth(t)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold font-mono transition-all
                      ${form.teeth.includes(t)
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-teal-300'}`}>
                    {t}
                  </button>
                ))}
                <div className="w-2" />
                {FDI_TEETH.slice(24).map(t => (
                  <button key={t} type="button" onClick={() => toggleTooth(t)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold font-mono transition-all
                      ${form.teeth.includes(t)
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-teal-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
              {form.teeth.length > 0 && (
                <p className="text-center text-xs text-teal-600 font-semibold mt-1">
                  მონიშნული: {form.teeth.sort().join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Dates + Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500
                uppercase tracking-wider mb-1.5">ჩაბარების თარიღი *</label>
              <input type="date" value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                  text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500
                  uppercase tracking-wider mb-1.5">ლაბ. ფასი ₾</label>
                <input type="number" min={0} step={0.01}
                  value={form.lab_cost} onChange={e => set('lab_cost', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                    text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500
                  uppercase tracking-wider mb-1.5">პაციენტი ₾</label>
                <input type="number" min={0} step={0.01}
                  value={form.patient_cost} onChange={e => set('patient_cost', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                    text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-500
              uppercase tracking-wider mb-1.5">ინსტრუქცია ლაბ-ისთვის</label>
            <textarea value={form.instructions}
              onChange={e => set('instructions', e.target.value)}
              rows={3} placeholder="სპეც. მოთხოვნები, ოკლუზია, ფორმა…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm
              font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            გაუქმება
          </button>
          <button onClick={handleSubmit} disabled={busy || !form.due_date || !form.work_type_name || !labId}
            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold
              rounded-xl text-sm transition-colors disabled:opacity-40
              flex items-center justify-center gap-2">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            შეკვეთის შექმნა
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order detail panel ───────────────────────────────────────
function OrderDetailPanel({
  orderId,
  onClose,
  onRefresh,
}: {
  orderId:   string
  onClose:   () => void
  onRefresh: () => void
}) {
  const { order, events, loading } = useLabOrder(orderId)
  const { advanceStatus, uploadAttachment, busy } = useLabOrderActions()
  const [remakeReason, setRemakeReason] = useState('')
  const [showRemake,   setShowRemake]   = useState(false)

  const handleAdvance = async (status: LabOrderStatus) => {
    if (status === 'remake' && !remakeReason) { setShowRemake(true); return }
    const ok = await advanceStatus(
      orderId, status,
      undefined,
      status === 'remake' ? { remake_reason: remakeReason } : undefined
    )
    if (ok) { onRefresh(); setShowRemake(false); setRemakeReason('') }
  }

  if (loading || !order) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={22} className="animate-spin text-slate-400" />
      </div>
    )
  }

  const transitions = STATUS_TRANSITIONS[order.status as LabOrderStatus] || []
  const profit = order.patient_cost - order.lab_cost

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs font-bold text-slate-400 tracking-wider mb-1">
            {order.order_number}
          </p>
          <h3 className="text-lg font-black text-slate-900">{order.work_type_name}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{order.lab?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status as LabOrderStatus} />
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200
              flex items-center justify-center transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Key info grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { l: 'კბილები', v: <TeethChips teeth={order.teeth} /> },
          { l: 'ფერი',    v: order.shade ?? '—' },
          { l: 'მასალა',  v: order.material ?? '—' },
          { l: 'ერთ.',    v: String(order.units) },
        ].map(({ l, v }) => (
          <div key={l} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{l}</p>
            <div className="text-sm font-semibold text-slate-800">{v}</div>
          </div>
        ))}
      </div>

      {/* Dates timeline */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          დროის ხაზი
        </p>
        <div className="space-y-2.5">
          {[
            { l: 'გაგზავნა',   v: order.sent_date,     done: !!order.sent_date     },
            { l: 'ჩაბ. ვადა',  v: order.due_date,      done: !!order.received_date, due: true },
            { l: 'მიღება',     v: order.received_date,  done: !!order.received_date  },
            { l: 'ჩამაგრება',  v: order.fit_date,       done: !!order.fit_date       },
          ].map(({ l, v, done, due }) => (
            <div key={l} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${done ? 'bg-teal-500' : 'bg-slate-200'}`} />
                <span className="text-xs text-slate-500">{l}</span>
              </div>
              {v ? (
                due
                  ? <DueDateChip due={v} status={order.status as LabOrderStatus} />
                  : <span className="text-xs font-semibold text-slate-700 tabular-nums">
                      {fmtDate(v)}
                    </span>
              ) : (
                <span className="text-xs text-slate-300">—</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cost */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">ლაბ. ფასი</p>
          <p className="text-base font-black text-slate-800 tabular-nums">₾{fmt(order.lab_cost)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">პაციენტი</p>
          <p className="text-base font-black text-slate-800 tabular-nums">₾{fmt(order.patient_cost)}</p>
        </div>
        <div className={`border rounded-xl p-3 text-center
          ${profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <p className="text-[10px] uppercase tracking-wider mb-1
            ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">მოგება</p>
          <p className={`text-base font-black tabular-nums
            ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {profit >= 0 ? '+' : ''}₾{fmt(profit)}
          </p>
        </div>
      </div>

      {/* Payment status */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3
        border border-slate-100">
        <span className="text-xs text-slate-500">ლაბ-ს გადახდა</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full
          ${order.paid_to_lab
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-amber-100 text-amber-700'}`}>
          {order.paid_to_lab ? `გადახდილია ${order.paid_date ? fmtDate(order.paid_date) : ''}` : 'გადაუხდელი'}
        </span>
      </div>

      {/* Instructions */}
      {order.instructions && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1.5">
            ინსტრუქცია
          </p>
          <p className="text-sm text-blue-800 leading-relaxed">{order.instructions}</p>
        </div>
      )}

      {/* Remake reason input */}
      {showRemake && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-orange-700">გადაკეთების მიზეზი *</p>
          <textarea
            value={remakeReason}
            onChange={e => setRemakeReason(e.target.value)}
            rows={2}
            className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none bg-white"
            placeholder="ახსენით პრობლემა…"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowRemake(false)}
              className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
              გაუქმება
            </button>
            <button onClick={() => handleAdvance('remake')} disabled={!remakeReason}
              className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold
                disabled:opacity-40">
              დადასტ. გადაკეთება
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {transitions.length > 0 && !showRemake && (
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
            შემდეგი ნაბიჯი
          </p>
          <div className="flex flex-wrap gap-2">
            {transitions.map(s => {
              const m    = STATUS_META[s as LabOrderStatus]
              const icons: Record<string, React.ElementType> = {
                sent: Send, in_progress: Zap, ready: CheckCircle2,
                received: Truck, fitted: CheckCircle2, remake: RotateCcw, cancelled: X,
              }
              const Icon = icons[s] ?? ArrowRight
              return (
                <button key={s} onClick={() => handleAdvance(s as LabOrderStatus)} disabled={busy}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                    border transition-all disabled:opacity-40
                    ${m.color} ${m.text} border-current/20 hover:opacity-80`}>
                  <Icon size={12} />
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Event timeline */}
      {events.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
            ისტორია
          </p>
          <div className="space-y-2">
            {[...events].reverse().map(ev => (
              <div key={ev.id} className="flex items-start gap-3 text-xs">
                <div className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0
                  ${STATUS_META[ev.status as LabOrderStatus]?.dot ?? 'bg-slate-300'}`} />
                <div className="flex-1">
                  <span className="font-semibold text-slate-700">
                    {STATUS_META[ev.status as LabOrderStatus]?.label ?? ev.status}
                  </span>
                  {ev.note && <span className="text-slate-400 ml-1">— {ev.note}</span>}
                </div>
                <span className="text-slate-300 flex-shrink-0 tabular-nums">
                  {format(new Date(ev.created_at), 'dd.MM · HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────

export default function LabOrdersPage() {
  const tenantId = useAuthStore((s) => s.activeTenantId)
  const [searchParams] = useSearchParams()
  const initialPatientId = searchParams.get('patientId')
  const initialTooth     = searchParams.get('tooth')

  const [tab,      setTab]       = useState<'board' | 'list'>('board')
  const [status,   setStatus]    = useState<LabOrderStatus | 'all'>('all')
  const [search,   setSearch]    = useState('')
  const [showForm, setShowForm]  = useState(!!initialPatientId)
  const [showMgmt, setShowMgmt]  = useState(false)
  const [selected, setSelected]  = useState<LabOrder | null>(null)

  useEffect(() => {
    if (initialPatientId) setShowForm(true)
  }, [initialPatientId])

  const { orders, loading, refetch } = useLabOrders({
    status: status === 'all' ? undefined : status,
  })

  const filtered = orders.filter(o =>
    !search ||
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.work_type_name.toLowerCase().includes(search.toLowerCase()) ||
    (o.patient_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const overdue  = orders.filter(o =>
    !['fitted','cancelled','received'].includes(o.status) &&
    isPast(new Date(o.due_date)) && !isToday(new Date(o.due_date))
  ).length
  const ready    = orders.filter(o => o.status === 'ready').length
  const unpaid   = orders.filter(o => !o.paid_to_lab && o.status !== 'cancelled').length
  const totalCost= orders.filter(o => !o.paid_to_lab && o.status !== 'cancelled')
    .reduce((s, o) => s + o.lab_cost, 0)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
              ლაბ. შეკვეთები
            </h1>
            <Sparkles size={20} className="text-primary animate-pulse" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Dental Lab Orders & Workflow Tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowMgmt(true)} className="rounded-2xl h-12 px-5 border-slate-200 bg-white shadow-sm hover:shadow-md hover:bg-slate-50 gap-2 font-bold text-slate-600 transition-all active:scale-95">
            <Settings2 size={18} />
            ლაბორატორიები
          </Button>
          <Button onClick={() => setShowForm(true)} className="rounded-2xl h-12 px-6 bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 gap-2 font-bold transition-all active:scale-95">
            <Plus size={18} />
            ახალი შეკვეთა
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: 'სულ შეკვეთა', v: String(orders.length),  bg: 'bg-white', icon: FileText, color: 'text-blue-500', trend: 'Total volume' },
          { l: 'ვადა გასული', v: String(overdue), bg: 'bg-white', icon: Clock, color: overdue > 0 ? 'text-rose-500' : 'text-slate-400', trend: 'Needs attention' },
          { l: 'ლაბ. მზადაა', v: String(ready), bg: 'bg-white', icon: Zap, color: 'text-amber-500', trend: 'Ready to fit' },
          { l: 'გადასახდელი', v: `₾${fmt(totalCost)}`, bg: 'bg-white', icon: TrendingUp, color: 'text-emerald-500', trend: 'Unpaid invoices' },
        ].map(({ l, v, bg, icon: Icon, color, trend }) => (
          <div key={l} className={`${bg} dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} bg-current/10 transition-colors group-hover:bg-current group-hover:text-white`}>
                <Icon size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{trend}</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{l}</p>
            <p className={`text-3xl font-black tabular-nums transition-colors ${color}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ნომ., პაციენტი, ტიპი…"
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>

        <select value={status} onChange={e => setStatus(e.target.value as any)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm
            text-slate-600 focus:outline-none bg-white">
          <option value="all">ყველა სტატუსი</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Board / List toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {(['board','list'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {t === 'board' ? 'Kanban' : 'სია'}
            </button>
          ))}
        </div>

        <button onClick={refetch} className="w-8 h-8 rounded-xl bg-slate-100
          flex items-center justify-center hover:bg-slate-200 transition-colors">
          <RefreshCw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main content — kanban or list */}
      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={22} className="animate-spin text-slate-400" />
            </div>
          ) : tab === 'board' ? (
            <KanbanBoard orders={filtered} onSelect={setSelected} />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3">შეკვეთა</th>
                            <th className="px-4 py-3">პაციენტი</th>
                            <th className="px-4 py-3">ტიპი</th>
                            <th className="px-4 py-3">ლაბორატორია</th>
                            <th className="px-4 py-3">ვადა</th>
                            <th className="px-4 py-3">სტატუსი</th>
                            <th className="px-4 py-3 text-right">ფასი</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map(o => (
                            <tr key={o.id} onClick={() => setSelected(o)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-400">{o.order_number}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{o.patient_name ?? '—'}</td>
                                <td className="px-4 py-3 text-slate-600">{o.work_type_name}</td>
                                <td className="px-4 py-3 text-slate-500">{o.lab?.name}</td>
                                <td className="px-4 py-3"><DueDateChip due={o.due_date} status={o.status as LabOrderStatus} /></td>
                                <td className="px-4 py-3"><StatusBadge status={o.status as LabOrderStatus} /></td>
                                <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-700">₾{fmt(o.lab_cost)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="py-20 text-center">
                        <Beaker size={40} className="mx-auto text-slate-100 mb-3" />
                        <p className="text-sm text-slate-400 font-medium">შეკვეთები არ მოიძებნა</p>
                    </div>
                )}
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        {selected && (
            <div className="w-80 bg-white border border-slate-200 rounded-2xl p-5 shadow-lg h-fit sticky top-4">
                <OrderDetailPanel
                    orderId={selected.id}
                    onClose={() => setSelected(null)}
                    onRefresh={refetch}
                />
            </div>
        )}
      </div>

      {showForm && (
        <NewOrderForm
          tenantId={tenantId!}
          initialPatientId={initialPatientId}
          initialTeeth={initialTooth ? [initialTooth] : []}
          onSave={refetch}
          onClose={() => setShowForm(false)}
        />
      )}

      {showMgmt && (
        <LabManagementDialog onClose={() => { setShowMgmt(false); refetch() }} />
      )}
    </div>
  )
}
