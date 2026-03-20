// src/pages/pos/RefundPage.tsx
import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  AlertCircle, ArrowLeft, BadgeCheck, Banknote,
  CheckCircle2, ChevronRight, CreditCard, Loader2,
  Minus, Plus, Receipt, RotateCcw, Search,
  ShoppingBag, Wallet, X, XCircle,
} from 'lucide-react'

import { toast } from 'sonner'
import {
  useTransactionSearch,
  useCreateReturn,
  useRsgeRefund,
} from '@/hooks/useReturns'
import { useActiveSession, useDrawers } from '@/hooks/useCashDrawer'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  ReturnLineInput,
  RefundMethod,
  REFUND_METHOD_LABELS,
  RETURN_REASONS,
  CreateReturnResult,
} from '@/types/returns'
import { useSearchParams } from 'react-router-dom'

// ─── Utils ────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) =>
  format(new Date(d), 'd MMM yyyy, HH:mm', { locale: ka })

type Step = 'search' | 'select' | 'confirm' | 'done'

// ─── Step indicator ───────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'search',  label: 'ძიება'    },
    { key: 'select',  label: 'არჩევა'   },
    { key: 'confirm', label: 'დადასტ.'  },
    { key: 'done',    label: 'დასრულ.'  },
  ]
  const idx = steps.findIndex(s => s.key === current)
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1 flex-1 last:flex-none">
          <div className={`flex items-center gap-1.5 ${i <= idx ? 'opacity-100' : 'opacity-30'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${i < idx  ? 'bg-emerald-500 text-white'
              : i === idx ? 'bg-slate-900 text-white'
              :             'bg-slate-100 text-slate-400'}`}>
              {i < idx ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block
              ${i === idx ? 'text-slate-900' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-1 ${i < idx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Search ───────────────────────────────────────────

function SearchStep({ onFound }: { onFound: () => void }) {
  const { result, loading, error, search, clear } = useTransactionSearch()
  const [query, setQuery] = useState('')
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const receipt = searchParams.get('receipt')
    if (receipt) {
      setQuery(receipt)
      search(receipt)
    }
  }, [searchParams, search])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">გაყიდვის ძიება</h2>
        <p className="text-sm text-slate-500">ქვითრის ნომერი ან მომხმარებლის ტელეფონი</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(query)}
          placeholder="RCP-2026-00142  ან  +995 5xx xxx xxx"
          className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-sm
            text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <button
        onClick={() => search(query)}
        disabled={loading || !query.trim()}
        className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl text-sm
          hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        ძიება
      </button>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <XCircle size={18} className="text-rose-500 flex-shrink-0" />
          <p className="text-sm text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {result && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Receipt header */}
          <div className="bg-slate-50 p-4 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Receipt size={15} className="text-slate-500" />
                  <span className="text-sm font-bold text-slate-900">{result.receipt_number}</span>
                </div>
                <p className="text-xs text-slate-400">{fmtDate(result.created_at)}</p>
                {result.client_name && (
                  <p className="text-xs text-slate-500 mt-0.5">{result.client_name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-slate-900">₾{fmt(result.total)}</p>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  {result.payment_method}
                </span>
              </div>
            </div>
          </div>

          {/* Items preview */}
          <div className="p-3 space-y-1">
            {result.items.map(item => (
              <div key={item.id} className="flex items-center justify-between py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{item.product_name}</p>
                  <p className="text-xs text-slate-400">
                    {item.qty} × ₾{fmt(item.unit_price)}
                    {item.already_returned > 0 && (
                      <span className="ml-2 text-amber-600 font-medium">
                        (დაბრუნებულია: {item.already_returned})
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-700 ml-3">
                  ₾{fmt(item.line_total)}
                </p>
              </div>
            ))}
          </div>

          {/* Existing returns warning */}
          {result.returns.length > 0 && (
            <div className="mx-3 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-600" />
                <p className="text-xs font-semibold text-amber-700">
                  ამ ქვითარზე უკვე {result.returns.length} დაბრუნება ყოფილა
                </p>
              </div>
            </div>
          )}

          {/* Check if anything returnable */}
          {result.items.every(i => i.returnable_qty <= 0) ? (
            <div className="mx-3 mb-3 p-3 bg-slate-100 rounded-xl text-center">
              <p className="text-sm text-slate-500 font-medium">ყველა პროდუქტი უკვე დაბრუნებულია</p>
            </div>
          ) : (
            <div className="p-3 border-t border-slate-100">
              <button
                onClick={onFound}
                className="w-full py-2.5 bg-rose-600 text-white font-bold text-sm rounded-xl
                  hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={15} />
                დაბრუნების დაწყება
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Select Items ─────────────────────────────────────

function SelectStep({
  lines,
  setLines,
  refundMethod,
  setRefundMethod,
  reason,
  setReason,
  onBack,
  onNext,
  cashAvailable,
}: {
  lines:            ReturnLineInput[]
  setLines:         (l: ReturnLineInput[]) => void
  refundMethod:     RefundMethod
  setRefundMethod:  (m: RefundMethod) => void
  reason:           string
  setReason:        (r: string) => void
  onBack:           () => void
  onNext:           () => void
  cashAvailable:    boolean
}) {
  const updateQty = (idx: number, delta: number) => {
    setLines(lines.map((l, i) => {
      if (i !== idx) return l
      const newQty = Math.min(
        Math.max(0, l.returned_qty + delta),
        l.original_qty
      )
      // Proportional discount per unit
      const discountPerUnit = l.original_qty > 0 ? l.discount_amount / l.original_qty : 0
      return {
        ...l,
        returned_qty: newQty,
        line_total:   Number(((newQty * l.unit_price) - (newQty * discountPerUnit)).toFixed(2)),
      }
    }))
  }

  const selectAll = () => {
    setLines(lines.map(l => {
      const discountPerUnit = l.original_qty > 0 ? l.discount_amount / l.original_qty : 0
      return {
        ...l,
        returned_qty: l.original_qty,
        line_total:   Number(((l.original_qty * l.unit_price) - (l.original_qty * discountPerUnit)).toFixed(2)),
      }
    }))
  }

  const total = lines.reduce((s, l) => s + l.line_total, 0)
  const hasSelected = lines.some(l => l.returned_qty > 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
          <ArrowLeft size={15} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">პროდუქტების არჩევა</h2>
          <p className="text-sm text-slate-500">მონიშნეთ რა ბრუნდება</p>
        </div>
        <button onClick={selectAll}
          className="ml-auto text-xs font-semibold text-blue-600 hover:text-blue-800 border
            border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
          ყველა
        </button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={line.original_item_id}
            className={`border rounded-xl p-3 transition-colors
              ${line.returned_qty > 0 ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-snug">
                  {line.product_name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  ₾{fmt(line.unit_price)} / ერთ.  •  მაქს: {line.original_qty}
                </p>
              </div>

              {/* Qty control */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => updateQty(idx, -1)}
                  disabled={line.returned_qty <= 0}
                  className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center
                    hover:bg-slate-100 disabled:opacity-30 transition-colors">
                  <Minus size={13} />
                </button>
                <span className={`w-8 text-center text-sm font-bold
                  ${line.returned_qty > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                  {line.returned_qty}
                </span>
                <button
                  onClick={() => updateQty(idx, 1)}
                  disabled={line.returned_qty >= line.original_qty}
                  className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center
                    hover:bg-slate-100 disabled:opacity-30 transition-colors">
                  <Plus size={13} />
                </button>
              </div>

              {/* Line total */}
              <div className="text-right min-w-[64px]">
                <p className={`text-sm font-bold ${line.returned_qty > 0 ? 'text-rose-700' : 'text-slate-300'}`}>
                  {line.returned_qty > 0 ? `₾${fmt(line.line_total)}` : '—'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      {hasSelected && (
        <div className="bg-rose-900 text-white rounded-xl p-4 flex justify-between items-center shadow-lg">
          <span className="text-sm font-semibold opacity-80">სულ დასაბრუნებელი</span>
          <span className="text-2xl font-black tabular-nums">₾{fmt(total)}</span>
        </div>
      )}

      {/* Refund method */}
      <div>
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
          დაბრუნების მეთოდი
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { m: 'cash',         icon: Banknote,    disabled: !cashAvailable },
            { m: 'card',         icon: CreditCard,  disabled: false },
            { m: 'store_credit', icon: Wallet,       disabled: false },
          ] as const).map(({ m, icon: Icon, disabled }) => (
            <button
              key={m}
              disabled={disabled}
              onClick={() => setRefundMethod(m as RefundMethod)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold
                transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                ${refundMethod === m
                  ? 'border-rose-500 bg-rose-50 text-rose-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Icon size={18} />
              {REFUND_METHOD_LABELS[m as RefundMethod]}
              {m === 'cash' && !cashAvailable && (
                <span className="text-[10px] text-slate-400">სალარო დახ.</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div>
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
          მიზეზი
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {RETURN_REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                ${reason === r
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {r}
            </button>
          ))}
        </div>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="ან მიუთითეთ სხვა მიზეზი..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700
            placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!hasSelected || !reason}
        className="w-full py-3.5 bg-rose-600 text-white font-bold rounded-xl text-sm
          hover:bg-rose-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
      >
        გაგრძელება
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ─── Step 3: Confirm ──────────────────────────────────────────

function ConfirmStep({
  lines,
  refundMethod,
  reason,
  onBack,
  onConfirm,
  busy,
}: {
  lines:         ReturnLineInput[]
  refundMethod:  RefundMethod
  reason:        string
  onBack:        () => void
  onConfirm:     () => void
  busy:          boolean
}) {
  const selected = lines.filter(l => l.returned_qty > 0)
  const total    = selected.reduce((s, l) => s + l.line_total, 0)

  const methodIcon: Record<RefundMethod, React.ElementType> = {
    cash:         Banknote,
    card:         CreditCard,
    store_credit: Wallet,
  }
  const MethodIcon = methodIcon[refundMethod]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
          <ArrowLeft size={15} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">დადასტურება</h2>
          <p className="text-sm text-slate-500">შეამოწმეთ დაბრუნების დეტალები</p>
        </div>
      </div>

      {/* Summary card */}
      <div className="border-2 border-rose-200 rounded-2xl overflow-hidden shadow-md">
        <div className="bg-rose-600 text-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw size={16} />
            <span className="text-sm font-bold">დაბრუნების მოთხოვნა</span>
          </div>
          <p className="text-3xl font-black tabular-nums">₾{fmt(total)}</p>
        </div>

        <div className="p-4 space-y-3">
          {/* Items */}
          {selected.map(l => (
            <div key={l.original_item_id} className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-800">{l.product_name}</p>
                <p className="text-xs text-slate-400">{l.returned_qty} × ₾{fmt(l.unit_price)}</p>
              </div>
              <p className="text-sm font-bold text-rose-700">₾{fmt(l.line_total)}</p>
            </div>
          ))}

          <div className="border-t border-slate-100 pt-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">მეთოდი</span>
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1">
                <MethodIcon size={13} className="text-slate-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {REFUND_METHOD_LABELS[refundMethod]}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm text-slate-500">მიზეზი</span>
              <span className="text-sm font-medium text-slate-800 max-w-[180px] text-right">{reason}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RS.GE note */}
      {refundMethod !== 'store_credit' && (
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <BadgeCheck size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            RS.GE კრედიტ ნოტი ავტომატურად გაიგზავნება დადასტურების შემდეგ
          </p>
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={busy}
        className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl text-base
          hover:bg-rose-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
      >
        {busy
          ? <><Loader2 size={18} className="animate-spin" /> მუშავდება...</>
          : <><CheckCircle2 size={18} /> დაბრუნების დადასტურება</>}
      </button>
    </div>
  )
}

// ─── Step 4: Done ─────────────────────────────────────────────

function DoneStep({
  result,
  onRsge,
  rsgeLoading,
  rsgeStatus,
  onNewReturn,
}: {
  result:       CreateReturnResult
  onRsge:       () => void
  rsgeLoading:  boolean
  rsgeStatus:   'idle' | 'sent' | 'failed'
  onNewReturn:  () => void
}) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 size={40} className="text-emerald-600" />
      </div>

      <div>
        <h2 className="text-xl font-black text-slate-900 mb-1">დაბრუნება დასრულდა</h2>
        <p className="text-sm text-slate-500">
          ნომერი: <span className="font-bold text-slate-800">{result.return_number}</span>
        </p>
        <p className="text-3xl font-black text-rose-700 mt-2 tabular-nums">
          ₾{fmt(result.refund_amount)}
        </p>
      </div>

      {/* RS.GE status */}
      <div className={`rounded-xl p-4 border ${
        rsgeStatus === 'sent'  ? 'bg-emerald-50 border-emerald-200' :
        rsgeStatus === 'failed'? 'bg-rose-50 border-rose-200' :
                                  'bg-blue-50 border-blue-200'}`}>
        {rsgeStatus === 'sent' ? (
          <div className="flex items-center gap-2 justify-center">
            <BadgeCheck size={18} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">RS.GE კრედიტ ნოტი გაგზავნილია</span>
          </div>
        ) : rsgeStatus === 'failed' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <XCircle size={18} className="text-rose-600" />
              <span className="text-sm font-semibold text-rose-700">RS.GE გაგზავნა ვერ მოხერხდა</span>
            </div>
            <button onClick={onRsge} disabled={rsgeLoading}
              className="text-xs font-semibold text-rose-700 border border-rose-300 rounded-lg
                px-3 py-1.5 hover:bg-rose-100 transition-colors">
              ხელახლა გაგზავნა
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center">
            {rsgeLoading
              ? <><Loader2 size={16} className="animate-spin text-blue-600" /><span className="text-sm text-blue-700">RS.GE-ზე გაგზავნა...</span></>
              : <><AlertCircle size={16} className="text-blue-600" /><span className="text-sm text-blue-700">RS.GE კრედიტ ნოტი ელის</span></>}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => window.print()}
          className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-semibold
            text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
          <Receipt size={15} />
          ქვითარი
        </button>
        <button
          onClick={onNewReturn}
          className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold
            hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all">
          <RotateCcw size={15} />
          ახალი დაბრუნება
        </button>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────

export default function RefundPage() {
  const activeTenantId = useAuthStore(s => s.activeTenantId);
  const { drawers }  = useDrawers()
  const drawerId     = drawers[0]?.id ?? ''

  const { result: txResult, search, clear } = useTransactionSearch()
  const { session: drawerSession }          = useActiveSession(drawerId)
  const { createReturn, busy }              = useCreateReturn(activeTenantId || '')
  const { sendCreditNote, sending }         = useRsgeRefund()

  const [step, setStep]               = useState<Step>('search')
  const [lines, setLines]             = useState<ReturnLineInput[]>([])
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('cash')
  const [reason, setReason]           = useState('')
  const [notes, setNotes]             = useState('')
  const [doneResult, setDoneResult]   = useState<CreateReturnResult | null>(null)
  const [rsgeStatus, setRsgeStatus]   = useState<'idle' | 'sent' | 'failed'>('idle')

  const cashAvailable = drawerSession?.status === 'open'

  // Prepare lines from tx result
  const handleFound = () => {
    if (!txResult) return
    setLines(
      txResult.items
        .filter(i => i.returnable_qty > 0)
        .map(i => ({
          original_item_id: i.id,
          product_id:       i.product_id,
          product_name:     i.product_name,
          original_qty:     i.returnable_qty,
          unit_price:       i.unit_price,
          discount_amount:  i.discount_amount,
          returned_qty:     0,
          line_total:       0,
        }))
    )
    if (!cashAvailable) setRefundMethod('card')
    setStep('select')
  }

  const handleConfirm = async () => {
    if (!txResult || !activeTenantId) return
    const res = await createReturn(
      {
        original_tx_id: txResult.id,
        lines,
        refund_method: refundMethod,
        reason,
        notes,
      },
      refundMethod === 'cash' ? drawerSession?.id ?? null : null,
      refundMethod === 'cash' ? drawerId : null,
    )
    if (!res) return

    setDoneResult(res)
    setStep('done')

    // Auto-send RS.GE credit note
    if (refundMethod !== 'store_credit') {
      const ok = await sendCreditNote(res.return_id)
      setRsgeStatus(ok ? 'sent' : 'failed')
    } else {
      setRsgeStatus('sent') // not needed, mark done
    }
  }

  const reset = () => {
    clear()
    setStep('search')
    setLines([])
    setReason('')
    setNotes('')
    setDoneResult(null)
    setRsgeStatus('idle')
    setRefundMethod('cash')
  }

  return (
    <div className="max-w-lg mx-auto p-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shadow-sm">
          <RotateCcw size={20} className="text-rose-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">დაბრუნება / Refund</h1>
          <p className="text-xs text-slate-400">POS · Returns Module</p>
        </div>
      </div>

      <StepBar current={step} />

      {step === 'search' && (
        <SearchStep onFound={handleFound} />
      )}

      {step === 'select' && txResult && (
        <SelectStep
          lines={lines}
          setLines={setLines}
          refundMethod={refundMethod}
          setRefundMethod={setRefundMethod}
          reason={reason}
          setReason={setReason}
          onBack={() => setStep('search')}
          onNext={() => setStep('confirm')}
          cashAvailable={cashAvailable}
        />
      )}

      {step === 'confirm' && (
        <ConfirmStep
          lines={lines}
          refundMethod={refundMethod}
          reason={reason}
          onBack={() => setStep('select')}
          onConfirm={handleConfirm}
          busy={busy}
        />
      )}

      {step === 'done' && doneResult && (
        <DoneStep
          result={doneResult}
          onRsge={async () => {
            const ok = await sendCreditNote(doneResult.return_id)
            setRsgeStatus(ok ? 'sent' : 'failed')
          }}
          rsgeLoading={sending}
          rsgeStatus={rsgeStatus}
          onNewReturn={reset}
        />
      )}
    </div>
  )
}
