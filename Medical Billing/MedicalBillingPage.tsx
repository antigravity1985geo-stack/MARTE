// components/MedicalBillingPage.tsx
// Design: structured-document aesthetic — clean tabular layouts,
// invoice-like precision, deep navy + emerald signal color.
// Feels like a real billing system, not a demo.

import { useState, useMemo, useCallback } from 'react'
import { format, isPast, parseISO, addMonths } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  ArrowRight, BadgeCheck, Ban, Building2, Calendar,
  CheckCircle2, ChevronRight, CreditCard, FileText,
  Loader2, Plus, Printer, ReceiptText, RefreshCw,
  Search, Shield, Trash2, TrendingUp, Wallet, X,
} from 'lucide-react'

import {
  useInvoices, useInvoice, useCreateInvoice,
  useRecordPayment, useInvoiceActions,
  useInsuranceClaims, useClaimActions,
  useInsurers, usePatientInsurance,
  useInstallmentPlan, useCreateInstallmentPlan,
} from '@/hooks/useMedicalBilling'
import { useTenant } from '@/hooks/useTenant'
import {
  MedicalInvoice, InsuranceClaim, InstallmentScheduleItem,
  InvoiceStatus, ClaimStatus, PaymentMethod, Frequency,
  INVOICE_STATUS_META, CLAIM_STATUS_META, METHOD_LABELS, FREQ_LABELS,
  InvoiceItemInput,
} from '@/types/medicalBilling'

// ─── Utils ────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('ka-GE', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n)
const fmtDate = (d: string) => format(parseISO(d), 'd MMM yyyy', { locale: ka })

type Tab = 'invoices' | 'claims' | 'installments'

// ─── Shared: status badge ─────────────────────────────────────
function InvBadge({ status }: { status: InvoiceStatus }) {
  const m = INVOICE_STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold
      px-2.5 py-0.5 rounded-full ${m.color} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot} flex-shrink-0`} />
      {m.label}
    </span>
  )
}
function ClaimBadge({ status }: { status: ClaimStatus }) {
  const m = CLAIM_STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold
      px-2.5 py-0.5 rounded-full ${m.color} ${m.text}`}>
      {m.label}
    </span>
  )
}

// ─── Create Invoice Modal ─────────────────────────────────────
function CreateInvoiceModal({ onSave, onClose }: {
  onSave: () => void; onClose: () => void
}) {
  const { create, busy } = useCreateInvoice()
  const { insurers }     = useInsurers()

  const EMPTY_ITEM: InvoiceItemInput = {
    description: '', procedure_code: '', quantity: 1,
    unit_price: 0, discount_pct: 0, tax_pct: 18, is_insured: true,
  }

  const [items,        setItems]       = useState<InvoiceItemInput[]>([{ ...EMPTY_ITEM }])
  const [patientName,  setPatientName] = useState('')
  const [patientPhone, setPatientPhone]= useState('')
  const [doctorName,   setDoctorName]  = useState('')
  const [insurerId,    setInsurerId]   = useState('')
  const [insurancePct, setInsurancePct]= useState(0)
  const [dueDate,      setDueDate]     = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [notes,        setNotes]       = useState('')

  const setItem = (i: number, k: keyof InvoiceItemInput, v: any) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  const addItem    = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  // Live totals
  const totals = useMemo(() => {
    let sub = 0, disc = 0, tax = 0
    for (const it of items) {
      const gross  = it.quantity * it.unit_price
      const dsc    = gross * (it.discount_pct / 100)
      const taxable= gross - dsc
      const taxAmt = taxable * (it.tax_pct / 100)
      sub  += gross
      disc += dsc
      tax  += taxAmt
    }
    const total       = sub - disc + tax
    const insuredSub  = items.filter(i => i.is_insured)
      .reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const insuranceAmt = insuredSub * (insurancePct / 100)
    return {
      subtotal: sub, discount: disc, tax, total,
      insuranceAmt, copay: total - insuranceAmt,
    }
  }, [items, insurancePct])

  const handleSave = async () => {
    if (!patientName || items.some(i => !i.description || !i.unit_price)) {
      toast?.('შეავსეთ სავალდებულო ველები')
      return
    }
    const result = await create({
      patient_id:     crypto.randomUUID(), // replace with real patient picker
      patient_name:   patientName,
      patient_phone:  patientPhone || undefined,
      doctor_name:    doctorName || undefined,
      insurer_id:     insurerId || undefined,
      insurance_pct:  insurancePct,
      discount_amount:0,
      due_date:       dueDate,
      items,
      notes:          notes || undefined,
    })
    if (result) { onSave(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl
        flex flex-col max-h-[95vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4
          border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <ReceiptText size={18} className="text-blue-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900">ახალი ინვოისი</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200
              flex items-center justify-center transition-colors">
            <X size={15} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Patient + Doctor */}
          <div className="px-6 py-5 border-b border-slate-50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              პაციენტი
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 block mb-1">სახელი / გვარი *</label>
                <input value={patientName} onChange={e => setPatientName(e.target.value)}
                  placeholder="გიორგი ბერიძე"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">ტელეფონი</label>
                <input value={patientPhone} onChange={e => setPatientPhone(e.target.value)}
                  placeholder="+995 5xx…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">ექიმი</label>
                <input value={doctorName} onChange={e => setDoctorName(e.target.value)}
                  placeholder="ხვიჩა კოპალიანი"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">ჩაბ. ვადა *</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
          </div>

          {/* Insurance */}
          <div className="px-6 py-5 border-b border-slate-50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              სადაზღვევო
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 block mb-1">სადაზღვ. კომპ.</label>
                <select value={insurerId} onChange={e => {
                    setInsurerId(e.target.value)
                    const ins = insurers.find(i => i.id === e.target.value)
                    if (ins) setInsurancePct(ins.coverage_pct)
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="">— სადაზღვ. გარეშე —</option>
                  {insurers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              {insurerId && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">დაფარვა %</label>
                  <input type="number" min={0} max={100}
                    value={insurancePct} onChange={e => setInsurancePct(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                      text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="px-6 py-5 border-b border-slate-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                მომსახურება / პროცედურები
              </p>
              <button onClick={addItem}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600
                  hover:text-blue-800 transition-colors">
                <Plus size={12} /> დამატება
              </button>
            </div>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid gap-2 text-[10px] font-semibold text-slate-400
                uppercase tracking-wider px-1"
                style={{ gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 1fr auto' }}>
                <span>აღწერა</span>
                <span className="text-right">რაოდ.</span>
                <span className="text-right">ერთ. ფასი</span>
                <span className="text-right">ფასდ. %</span>
                <span className="text-right">დღგ %</span>
                <span className="text-right">სულ</span>
                <span />
              </div>

              {items.map((item, i) => {
                const gross = item.quantity * item.unit_price
                const dsc   = gross * (item.discount_pct / 100)
                const tax   = (gross - dsc) * (item.tax_pct / 100)
                const total = gross - dsc + tax
                return (
                  <div key={i} className="grid gap-2 items-center bg-slate-50 rounded-xl p-2"
                    style={{ gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 1fr auto' }}>
                    <input value={item.description}
                      onChange={e => setItem(i, 'description', e.target.value)}
                      placeholder="პროცედ. სახელი"
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm
                        focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white" />
                    <input type="number" min={0.01} step={0.01}
                      value={item.quantity}
                      onChange={e => setItem(i, 'quantity', parseFloat(e.target.value)||1)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm
                        text-center focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white" />
                    <input type="number" min={0} step={0.01}
                      value={item.unit_price}
                      onChange={e => setItem(i, 'unit_price', parseFloat(e.target.value)||0)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm
                        text-right focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white" />
                    <input type="number" min={0} max={100}
                      value={item.discount_pct}
                      onChange={e => setItem(i, 'discount_pct', parseFloat(e.target.value)||0)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm
                        text-right focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white" />
                    <input type="number" min={0} max={100}
                      value={item.tax_pct}
                      onChange={e => setItem(i, 'tax_pct', parseFloat(e.target.value)||0)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm
                        text-right focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white" />
                    <p className="text-sm font-bold text-slate-800 tabular-nums text-right pr-1">
                      ₾{fmt(total)}
                    </p>
                    <button onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                      className="w-6 h-6 rounded-lg flex items-center justify-center
                        text-slate-300 hover:text-rose-500 hover:bg-rose-50
                        transition-colors disabled:opacity-20">
                      <X size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="px-6 py-4">
            <label className="text-xs text-slate-500 block mb-1">შენიშვნა</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm
                resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>

        {/* Footer with totals */}
        <div className="flex-shrink-0 border-t border-slate-100 px-6 py-4 bg-slate-50">
          <div className="flex items-end justify-between gap-6">
            {/* Totals breakdown */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <span className="text-slate-500">ქვეჯამი:</span>
              <span className="text-right tabular-nums">₾{fmt(totals.subtotal)}</span>
              {totals.discount > 0 && <>
                <span className="text-slate-500">ფასდაკლება:</span>
                <span className="text-right tabular-nums text-amber-600">−₾{fmt(totals.discount)}</span>
              </>}
              <span className="text-slate-500">დღგ:</span>
              <span className="text-right tabular-nums">₾{fmt(totals.tax)}</span>
              {insurerId && <>
                <span className="text-slate-500">სადაზღვ. ({insurancePct}%):</span>
                <span className="text-right tabular-nums text-teal-600">−₾{fmt(totals.insuranceAmt)}</span>
                <span className="text-slate-500 font-semibold">Co-pay პაციენტი:</span>
                <span className="text-right tabular-nums font-bold">₾{fmt(totals.copay)}</span>
              </>}
            </div>
            {/* Grand total + actions */}
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-0.5">სულ</p>
              <p className="text-3xl font-black text-slate-900 tabular-nums">
                ₾{fmt(totals.total)}
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm
                    font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                  გაუქმება
                </button>
                <button onClick={handleSave} disabled={busy || !patientName}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold
                    rounded-xl text-sm transition-colors disabled:opacity-40
                    flex items-center gap-2">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  შექმნა
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Record Payment Modal ─────────────────────────────────────
function PaymentModal({ invoice, onDone, onClose }: {
  invoice: MedicalInvoice; onDone: () => void; onClose: () => void
}) {
  const { record, busy } = useRecordPayment()
  const [amount,  setAmount]  = useState(String(invoice.balance_due.toFixed(2)))
  const [method,  setMethod]  = useState<PaymentMethod>('cash')
  const [refText, setRefText] = useState('')
  const [notes,   setNotes]   = useState('')

  const copayLeft = invoice.copay_amount - (invoice.payments
    ?.filter(p => p.method !== 'insurance')
    .reduce((s, p) => s + p.amount, 0) ?? 0)

  const handleRecord = async () => {
    const ok = await record(
      invoice.id, parseFloat(amount) || 0,
      method, refText || undefined, notes || undefined,
    )
    if (ok) { onDone(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">გადახდის ჩაწერა</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Invoice summary */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-5 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{invoice.invoice_number}</span>
            <InvBadge status={invoice.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">სულ</span>
            <span className="text-sm font-bold tabular-nums">₾{fmt(invoice.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-slate-400">გადახდილია</span>
            <span className="text-sm tabular-nums text-emerald-600">₾{fmt(invoice.amount_paid)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5">
            <span className="text-xs font-semibold text-slate-600">ნაშთი</span>
            <span className="text-base font-black tabular-nums text-rose-700">₾{fmt(invoice.balance_due)}</span>
          </div>
          {invoice.insurer_id && (
            <div className="flex justify-between text-xs text-teal-600 font-medium">
              <span>Co-pay ნაშთი</span>
              <span>₾{fmt(copayLeft)}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">მეთოდი</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cash','card','bank_transfer'] as PaymentMethod[]).map(m => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors
                    ${method === m
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1.5">თანხა (₾)</label>
            <input type="number" min={0.01} step={0.01}
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-xl
                font-black text-slate-900 text-right tabular-nums
                focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {(method === 'card' || method === 'bank_transfer') && (
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">
                {method === 'card' ? 'Auth კოდი' : 'გადარ. ნომ.'}
              </label>
              <input value={refText} onChange={e => setRefText(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-sm
                font-semibold text-slate-600 hover:bg-slate-50">
              გაუქმება
            </button>
            <button onClick={handleRecord}
              disabled={busy || !amount || parseFloat(amount) <= 0}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white
                font-bold rounded-xl text-sm disabled:opacity-40 transition-colors
                flex items-center justify-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              ჩაწერა
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Installment Plan Modal ───────────────────────────────────
function InstallmentModal({ invoice, onDone, onClose }: {
  invoice: MedicalInvoice; onDone: () => void; onClose: () => void
}) {
  const { create, busy } = useCreateInstallmentPlan()
  const [downPayment, setDownPayment] = useState(0)
  const [count,       setCount]       = useState(3)
  const [frequency,   setFrequency]   = useState<Frequency>('monthly')
  const [firstDate,   setFirstDate]   = useState(
    format(addMonths(new Date(), 1), 'yyyy-MM-dd')
  )
  const [interest, setInterest] = useState(0)

  const financed  = invoice.balance_due - downPayment
  const perInst   = count > 0 ? financed / count : 0

  const handleCreate = async () => {
    const ok = await create(
      invoice.id, invoice.patient_id,
      invoice.balance_due, downPayment,
      count, frequency, firstDate, interest,
    )
    if (ok) { onDone(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
              <Calendar size={16} className="text-violet-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900">განვადების გეგმა</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Summary */}
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-5">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-violet-600">{invoice.invoice_number}</span>
            <span className="font-black text-violet-900 tabular-nums">₾{fmt(invoice.balance_due)}</span>
          </div>
          <p className="text-xs text-violet-500">{invoice.patient_name}</p>
        </div>

        <div className="space-y-4">
          {/* Down payment */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">
              წინასწარი გადახდა (₾)
            </label>
            <input type="number" min={0} max={invoice.balance_due} step={0.01}
              value={downPayment} onChange={e => setDownPayment(parseFloat(e.target.value)||0)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>

          {/* Count + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">განვადება (თვე)</label>
              <div className="flex gap-1">
                {[2,3,6,9,12].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors
                      ${count === n
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">სიხშირე</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                {Object.entries(FREQ_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* First due date */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">პირველი გადახდის თარ.</label>
            <input type="date" value={firstDate} onChange={e => setFirstDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>

          {/* Calculation preview */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 mb-3">გეგმის სქემა</p>
            <div className="space-y-2 text-sm">
              {[
                ['სულ', `₾${fmt(invoice.balance_due)}`],
                ['წინ. გადახდა', downPayment > 0 ? `−₾${fmt(downPayment)}` : '—'],
                ['საფინანსო', `₾${fmt(financed)}`],
                ['თვიური', <span key="p" className="font-black text-violet-700">₾{fmt(perInst)}</span>],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between items-center">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-sm
                font-semibold text-slate-600">
              გაუქმება
            </button>
            <button onClick={handleCreate} disabled={busy || financed <= 0 || count < 1}
              className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold
                rounded-xl text-sm disabled:opacity-40 transition-colors
                flex items-center justify-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
              შექმნა
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Invoice detail panel ─────────────────────────────────────
function InvoiceDetailPanel({ invoiceId, onClose, onRefresh }: {
  invoiceId: string; onClose: () => void; onRefresh: () => void
}) {
  const { invoice, loading, refetch } = useInvoice(invoiceId)
  const { issue, cancel, busy: actBusy } = useInvoiceActions()
  const { claimActions } = { claimActions: useClaimActions() }
  const [showPay,    setShowPay]    = useState(false)
  const [showInst,   setShowInst]   = useState(false)
  const [showClaim,  setShowClaim]  = useState(false)

  if (loading || !invoice) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    )
  }

  const paidPct = invoice.total > 0 ? (invoice.amount_paid / invoice.total) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs font-bold text-slate-400 tracking-wider">
            {invoice.invoice_number}
          </p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{invoice.patient_name}</p>
          {invoice.doctor_name && (
            <p className="text-xs text-slate-400">ექიმი: {invoice.doctor_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <InvBadge status={invoice.status} />
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <X size={13} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Payment progress */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-slate-500">გადახდა</span>
          <span className="font-bold text-slate-900 tabular-nums">
            ₾{fmt(invoice.amount_paid)} / ₾{fmt(invoice.total)}
          </span>
        </div>
        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${Math.min(paidPct, 100)}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-slate-400">{paidPct.toFixed(0)}% გადახდილი</span>
          <span className={`font-bold tabular-nums ${invoice.balance_due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {invoice.balance_due > 0 ? `ნაშთი ₾${fmt(invoice.balance_due)}` : '✓ სრულად'}
          </span>
        </div>
      </div>

      {/* Insurance split */}
      {invoice.insurer_id && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-center">
            <p className="text-[10px] text-teal-600 font-semibold mb-0.5">სადაზღვ. ({invoice.insurance_pct}%)</p>
            <p className="text-base font-black text-teal-800 tabular-nums">₾{fmt(invoice.insurance_amount)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <p className="text-[10px] text-blue-600 font-semibold mb-0.5">Co-pay (პაციენტი)</p>
            <p className="text-base font-black text-blue-800 tabular-nums">₾{fmt(invoice.copay_amount)}</p>
          </div>
        </div>
      )}

      {/* Items */}
      {invoice.items && invoice.items.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          {invoice.items.map((item, i) => (
            <div key={item.id} className={`flex items-center justify-between px-4 py-3
              ${i < invoice.items!.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm text-slate-800 truncate">{item.description}</p>
                {item.procedure_code && (
                  <p className="text-[10px] font-mono text-slate-400">{item.procedure_code}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold tabular-nums text-slate-800">₾{fmt(item.line_total)}</p>
                <p className="text-[10px] text-slate-400">{item.quantity}×₾{fmt(item.unit_price)}</p>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-700">სულ</span>
            <span className="text-lg font-black tabular-nums text-slate-900">₾{fmt(invoice.total)}</span>
          </div>
        </div>
      )}

      {/* Payments history */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            გადახდების ისტ.
          </p>
          <div className="space-y-1.5">
            {invoice.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between
                bg-slate-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center
                    justify-center flex-shrink-0">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{METHOD_LABELS[p.method]}</p>
                    <p className="text-[10px] text-slate-400">
                      {format(parseISO(p.paid_at), 'd MMM, HH:mm', { locale: ka })}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold tabular-nums text-emerald-700">₾{fmt(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Installment schedule */}
      {invoice.installment?.schedule && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            განვადება
          </p>
          <div className="space-y-1.5">
            {(invoice.installment.schedule as InstallmentScheduleItem[])
              .sort((a, b) => a.installment_no - b.installment_no)
              .map(s => (
                <div key={s.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 border
                    ${s.status === 'paid'    ? 'bg-emerald-50 border-emerald-100' :
                      s.status === 'overdue' ? 'bg-rose-50 border-rose-100' :
                                               'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold w-5 tabular-nums
                      ${s.status === 'paid' ? 'text-emerald-600' :
                        s.status === 'overdue' ? 'text-rose-600' : 'text-slate-400'}`}>
                      #{s.installment_no}
                    </span>
                    <p className="text-xs text-slate-600 tabular-nums">
                      {fmtDate(s.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold tabular-nums">₾{fmt(s.amount)}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                      ${s.status === 'paid'    ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                                                  'bg-slate-200 text-slate-500'}`}>
                      {s.status === 'paid' ? '✓' : s.status === 'overdue' ? '!' : '•'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
        {invoice.status === 'draft' && (
          <button onClick={async () => {
              await issue(invoice.id); refetch(); onRefresh()
            }}
            disabled={actBusy}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700
              text-white text-xs font-bold rounded-xl transition-colors">
            <ArrowRight size={12} />
            გაცემა
          </button>
        )}
        {['issued','partially_paid','overdue'].includes(invoice.status) && (
          <>
            <button onClick={() => setShowPay(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700
                text-white text-xs font-bold rounded-xl transition-colors">
              <Wallet size={12} />
              გადახდა
            </button>
            {!invoice.installment && (
              <button onClick={() => setShowInst(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700
                  text-white text-xs font-bold rounded-xl transition-colors">
                <Calendar size={12} />
                განვადება
              </button>
            )}
            {invoice.insurer_id && !invoice.claim && (
              <button onClick={() => setShowClaim(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700
                  text-white text-xs font-bold rounded-xl transition-colors">
                <Shield size={12} />
                Claim
              </button>
            )}
          </>
        )}
        <button onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200
            text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50">
          <Printer size={12} />
          ბეჭდვა
        </button>
      </div>

      {/* Modals */}
      {showPay && (
        <PaymentModal
          invoice={invoice}
          onDone={() => { refetch(); onRefresh() }}
          onClose={() => setShowPay(false)}
        />
      )}
      {showInst && (
        <InstallmentModal
          invoice={invoice}
          onDone={() => { refetch(); onRefresh() }}
          onClose={() => setShowInst(false)}
        />
      )}
    </div>
  )
}

// ─── Claims tab ───────────────────────────────────────────────
function ClaimsTab() {
  const [statusF, setStatusF] = useState<ClaimStatus | 'all'>('all')
  const { claims, loading, refetch } = useInsuranceClaims({ status: statusF === 'all' ? undefined : statusF })
  const { submitClaim, updateClaim, busy } = useClaimActions()

  const totalClaimed  = claims.reduce((s, c) => s + c.claimed_amount, 0)
  const totalApproved = claims.filter(c => ['approved','partial','paid'].includes(c.status))
    .reduce((s, c) => s + (c.approved_amount ?? 0), 0)
  const totalPaid     = claims.filter(c => c.status === 'paid')
    .reduce((s, c) => s + (c.paid_amount ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'სულ Claimed', v: `₾${fmt(totalClaimed)}`,  color: 'text-slate-900' },
          { l: 'დამტკიცდა',  v: `₾${fmt(totalApproved)}`, color: 'text-teal-700'  },
          { l: 'ანაზღ.',     v: `₾${fmt(totalPaid)}`,     color: 'text-emerald-700' },
        ].map(({ l, v, color }) => (
          <div key={l} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{l}</p>
            <p className={`text-xl font-black tabular-nums ${color}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', ...Object.keys(CLAIM_STATUS_META)] as (ClaimStatus|'all')[]).map(s => (
          <button key={s} onClick={() => setStatusF(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold
              border transition-colors
              ${statusF === s
                ? 'bg-slate-900 text-white border-slate-900'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s === 'all' ? 'ყველა' : CLAIM_STATUS_META[s as ClaimStatus].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={18} className="animate-spin text-slate-300" />
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-12">
            <Shield size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Claim-ები ვერ მოიძებნა</p>
          </div>
        ) : claims.map(c => (
          <div key={c.id} className="flex items-center gap-4 px-4 py-4
            border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-xs font-bold text-slate-400">{c.claim_number}</span>
                <ClaimBadge status={c.status} />
              </div>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {(c.invoice as any)?.patient_name ?? '—'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {c.insurer?.name} · {(c.invoice as any)?.invoice_number}
              </p>
            </div>
            <div className="text-right flex-shrink-0 space-y-1">
              <p className="text-sm font-bold tabular-nums text-slate-900">
                ₾{fmt(c.claimed_amount)}
              </p>
              {c.approved_amount != null && (
                <p className="text-xs tabular-nums text-teal-600 font-semibold">
                  ✓ ₾{fmt(c.approved_amount)}
                </p>
              )}
            </div>
            {c.status === 'draft' && (
              <button onClick={async () => { await submitClaim(c.id); refetch() }}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700
                  text-white text-xs font-bold rounded-xl transition-colors flex-shrink-0">
                <ArrowRight size={12} />
                გაგზავნა
              </button>
            )}
            {c.status === 'approved' && (
              <button onClick={async () => {
                  await updateClaim(c.id, {
                    status: 'paid', paid_amount: c.approved_amount!,
                    paid_at: new Date().toISOString(),
                  })
                  refetch()
                }}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700
                  text-white text-xs font-bold rounded-xl transition-colors flex-shrink-0">
                <CheckCircle2 size={12} />
                გადახდა
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function MedicalBillingPage() {
  const [tab,        setTab]       = useState<Tab>('invoices')
  const [status,     setStatus]    = useState<InvoiceStatus | 'all'>('all')
  const [search,     setSearch]    = useState('')
  const [showCreate, setShowCreate]= useState(false)
  const [selectedId, setSelectedId]= useState<string | null>(null)

  const { invoices, loading, refetch } = useInvoices({ status: status === 'all' ? undefined : status })

  const filtered = invoices.filter(i =>
    !search ||
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    i.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.doctor_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // KPIs
  const outstanding = invoices.filter(i => ['issued','partially_paid','overdue'].includes(i.status))
    .reduce((s, i) => s + i.balance_due, 0)
  const collected   = invoices.reduce((s, i) => s + i.amount_paid, 0)
  const overdueCnt  = invoices.filter(i => i.status === 'overdue').length

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">ბილინგი</h1>
          <p className="text-xs text-slate-400 mt-0.5">Medical Billing System</p>
        </div>
        {tab === 'invoices' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700
              text-white font-bold text-sm rounded-xl transition-colors">
            <Plus size={15} />
            ახალი ინვოისი
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'სულ შემ.',     v: `₾${fmt(collected)}`,   cls: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { l: 'გადასახ.',     v: `₾${fmt(outstanding)}`, cls: 'text-rose-700    bg-rose-50    border-rose-100'    },
          { l: 'ვადა გასული',  v: String(overdueCnt),      cls: overdueCnt > 0 ? 'text-rose-700 bg-rose-50 border-rose-100' : 'text-slate-700 bg-slate-50 border-slate-100' },
          { l: 'სულ ინვ.',     v: String(invoices.length),  cls: 'text-slate-700 bg-slate-50 border-slate-100' },
        ].map(({ l, v, cls }) => (
          <div key={l} className={`rounded-2xl border p-4 ${cls}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60 mb-1">{l}</p>
            <p className="text-2xl font-black tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { k: 'invoices',     l: 'ინვოისები',  icon: ReceiptText },
          { k: 'claims',       l: 'Сlaims',      icon: Shield      },
          { k: 'installments', l: 'განვადება',   icon: Calendar    },
        ] as { k: Tab; l: string; icon: any }[]).map(({ k, l, icon: Icon }) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
              text-sm font-semibold transition-colors
              ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={14} />
            {l}
          </button>
        ))}
      </div>

      {tab === 'claims' && <ClaimsTab />}

      {tab === 'invoices' && (
        <>
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ინვ. ნომ., პაციენტი…"
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <select value={status} onChange={e => setStatus(e.target.value as any)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm
                text-slate-600 focus:outline-none bg-white">
              <option value="all">ყველა სტატუსი</option>
              {Object.entries(INVOICE_STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button onClick={refetch}
              className="w-9 h-9 border border-slate-200 rounded-xl flex items-center
                justify-center hover:bg-slate-50 transition-colors">
              <RefreshCw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Content */}
          <div className="flex gap-5 items-start">
            {/* Invoice list */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={22} className="animate-spin text-slate-300" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <FileText size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">ინვოისები ვერ მოიძებნა</p>
                </div>
              ) : filtered.map(inv => (
                <button key={inv.id}
                  onClick={() => setSelectedId(selectedId === inv.id ? null : inv.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 border-b
                    border-slate-50 last:border-0 text-left transition-colors
                    ${selectedId === inv.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>

                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0
                    ${INVOICE_STATUS_META[inv.status].dot}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {inv.invoice_number}
                      </span>
                      <InvBadge status={inv.status} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {inv.patient_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {inv.doctor_name ?? '—'} · {fmtDate(inv.issue_date)}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className="text-base font-black tabular-nums text-slate-900">
                      ₾{fmt(inv.total)}
                    </p>
                    {inv.balance_due > 0 && inv.status !== 'draft' && (
                      <p className="text-xs text-rose-600 font-semibold tabular-nums">
                        ნაშთი ₾{fmt(inv.balance_due)}
                      </p>
                    )}
                    {inv.insurer_id && (
                      <p className="text-xs text-teal-600 font-medium">
                        {inv.insurance_pct}% სად.
                      </p>
                    )}
                  </div>

                  <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* Detail panel */}
            {selectedId && (
              <div className="w-80 flex-shrink-0 bg-white border border-slate-100
                rounded-2xl p-5 overflow-y-auto max-h-[80vh] sticky top-4">
                <InvoiceDetailPanel
                  invoiceId={selectedId}
                  onClose={() => setSelectedId(null)}
                  onRefresh={refetch}
                />
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'installments' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <Calendar size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">
            განვადების გეგმები ინვოისის დეტალებიდან შეიქმნება
          </p>
          <p className="text-slate-300 text-xs mt-1">
            ინვოისი → „განვადება" ღილაკი
          </p>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateInvoiceModal
          onSave={refetch}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
