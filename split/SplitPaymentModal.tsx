// components/SplitPaymentModal.tsx
//
// Design: dark terminal / cashier-grade UI
// — high contrast, mono numbers, zero ambiguity under pressure
// — green = cash, blue = card, balanced state = white flash

import { useState, useRef, useEffect } from 'react'
import {
  Banknote, CreditCard, Wallet, Gift, Building2,
  X, Plus, Trash2, Loader2, CheckCircle2,
  ChevronDown, ChevronUp, Zap, ArrowRight,
  BadgeCheck, RotateCcw, Receipt,
} from 'lucide-react'
import { useSplitPaymentState, useFinalizePayment } from '@/hooks/useSplitPayment'
import {
  PaymentMethod, PaymentLeg, METHOD_META,
  QUICK_SPLITS, CARD_BRANDS, FinalizePaymentResult, CartItemInput,
} from '@/types/splitPayment'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// ─── Helpers ──────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const METHOD_ICONS: Record<PaymentMethod, React.ElementType> = {
  cash:          Banknote,
  card:          CreditCard,
  store_credit:  Wallet,
  gift_card:     Gift,
  bank_transfer: Building2,
}

// ─── Payment leg card ─────────────────────────────────────────

function LegCard({
  leg,
  total,
  remaining,
  onRemove,
  onSetAmount,
  onSetTendered,
  onSetCard,
  onFill,
  isOnly,
}: {
  leg:          PaymentLeg
  total:        number
  remaining:    number
  onRemove:     () => void
  onSetAmount:  (v: number) => void
  onSetTendered:(v: number) => void
  onSetCard:    (f: Partial<PaymentLeg>) => void
  onFill:       () => void
  isOnly:       boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const meta    = METHOD_META[leg.method]
  const Icon    = METHOD_ICONS[leg.method]
  const amtRef  = useRef<HTMLInputElement>(null)

  useEffect(() => { amtRef.current?.focus() }, [])

  const pct = total > 0 ? Math.min(100, (leg.amount / total) * 100) : 0

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all
      ${leg.method === 'cash'  ? 'border-emerald-500/40 bg-emerald-950/30' :
        leg.method === 'card'  ? 'border-blue-500/40 bg-blue-950/30' :
                                  'border-slate-600/40 bg-slate-800/30'}`}>

      {/* Header row */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
          ${leg.method === 'cash' ? 'bg-emerald-500/20' :
            leg.method === 'card' ? 'bg-blue-500/20' : 'bg-slate-600/20'}`}>
          <Icon size={18} className={
            leg.method === 'cash' ? 'text-emerald-400' :
            leg.method === 'card' ? 'text-blue-400'    : 'text-slate-300'} />
        </div>

        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {meta.label}
          </p>
          {/* Progress bar */}
          <div className="h-1 bg-slate-700 rounded-full mt-1 w-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300
                ${leg.method === 'cash' ? 'bg-emerald-500' :
                  leg.method === 'card' ? 'bg-blue-500'    : 'bg-slate-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Fill button */}
        {remaining > 0.005 && (
          <button
            onClick={onFill}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-700 text-slate-300
              hover:bg-slate-600 transition-colors whitespace-nowrap">
            +₾{fmt(remaining)}
          </button>
        )}

        {!isOnly && (
          <button onClick={onRemove}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-900/50 flex items-center
              justify-center transition-colors group">
            <Trash2 size={13} className="text-slate-500 group-hover:text-rose-400" />
          </button>
        )}
      </div>

      {/* Amount input */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-black
            ${leg.method === 'cash' ? 'text-emerald-400' :
              leg.method === 'card' ? 'text-blue-400'    : 'text-slate-300'}`}>₾</span>
          <input
            ref={amtRef}
            type="number"
            min="0"
            step="0.01"
            value={leg.amount || ''}
            onChange={e => onSetAmount(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-2xl font-black text-white tabular-nums
              focus:outline-none placeholder-slate-700 w-0"
          />
          <span className="text-xs text-slate-600 tabular-nums">
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Cash extra: tendered & change */}
      {leg.method === 'cash' && (
        <div className="border-t border-emerald-900/50 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 w-24 flex-shrink-0">მომხ. გადასცა</label>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-emerald-500 text-sm">₾</span>
              <input
                type="number"
                min={leg.amount}
                step="1"
                value={leg.cash_tendered || ''}
                onChange={e => onSetTendered(parseFloat(e.target.value) || 0)}
                placeholder={fmt(leg.amount)}
                className="bg-transparent text-sm font-bold text-emerald-300 focus:outline-none
                  tabular-nums w-full placeholder-slate-700"
              />
            </div>
            {/* Quick tender presets */}
            <div className="flex gap-1">
              {[Math.ceil(leg.amount / 10) * 10,
                Math.ceil(leg.amount / 50) * 50,
                Math.ceil(leg.amount / 100) * 100]
                .filter((v, i, a) => a.indexOf(v) === i && v >= leg.amount && v !== leg.amount)
                .slice(0, 2)
                .map(v => (
                  <button key={v} onClick={() => onSetTendered(v)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-900/50
                      text-emerald-400 hover:bg-emerald-800/60 transition-colors tabular-nums">
                    ₾{v}
                  </button>
                ))}
            </div>
          </div>

          {(leg.cash_change ?? 0) > 0 && (
            <div className="flex items-center gap-2 bg-emerald-900/40 rounded-xl px-3 py-2">
              <span className="text-xs text-emerald-400 font-bold">ხურდა</span>
              <span className="text-xl font-black text-emerald-300 tabular-nums ml-auto">
                ₾{fmt(leg.cash_change ?? 0)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card extra: last4, brand, approval */}
      {leg.method === 'card' && (
        <div className="border-t border-blue-900/50 px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            ბარათის დეტალები
          </button>
          {expanded && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-wider">ბოლო 4 ციფრი</label>
                <input
                  maxLength={4}
                  value={leg.card_last4 || ''}
                  onChange={e => onSetCard({ card_last4: e.target.value })}
                  placeholder="****"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                    text-sm text-white font-mono focus:outline-none focus:border-blue-500 mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-wider">ბრენდი</label>
                <select
                  value={leg.card_brand || ''}
                  onChange={e => onSetCard({ card_brand: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                    text-sm text-white focus:outline-none focus:border-blue-500 mt-0.5">
                  <option value="">—</option>
                  {CARD_BRANDS.map(b => <option key={b} value={b.toLowerCase()}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-wider">Authorization</label>
                <input
                  value={leg.approval_code || ''}
                  onChange={e => onSetCard({ approval_code: e.target.value })}
                  placeholder="123456"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                    text-sm text-white font-mono focus:outline-none focus:border-blue-500 mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-wider">Terminal Ref</label>
                <input
                  value={leg.terminal_ref || ''}
                  onChange={e => onSetCard({ terminal_ref: e.target.value })}
                  placeholder="TRM-001"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                    text-sm text-white font-mono focus:outline-none focus:border-blue-500 mt-0.5"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Done screen ──────────────────────────────────────────────

function DoneScreen({
  result,
  onClose,
  onNewSale,
  rsgeStatus,
}: {
  result:      FinalizePaymentResult
  onClose:     () => void
  onNewSale:   () => void
  rsgeStatus:  'pending' | 'sent' | 'failed'
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 space-y-6 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center
        ring-4 ring-emerald-500/30">
        <CheckCircle2 size={40} className="text-emerald-400" />
      </div>

      <div>
        <p className="text-slate-400 text-sm mb-1">გაყიდვა დასრულდა</p>
        <p className="text-white font-bold text-lg">{result.receipt_number}</p>
        <p className="text-4xl font-black text-white tabular-nums mt-2">
          ₾{fmt(result.total)}
        </p>
      </div>

      {/* Payment breakdown */}
      <div className="w-full space-y-2 max-w-xs">
        {result.cash_amount > 0 && (
          <div className="flex justify-between items-center bg-emerald-900/30 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <Banknote size={15} /><span className="text-sm font-semibold">ნაღდი</span>
            </div>
            <span className="text-emerald-300 font-black tabular-nums">
              ₾{fmt(result.cash_amount)}
            </span>
          </div>
        )}
        {result.card_amount > 0 && (
          <div className="flex justify-between items-center bg-blue-900/30 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2 text-blue-400">
              <CreditCard size={15} /><span className="text-sm font-semibold">ბარათი</span>
            </div>
            <span className="text-blue-300 font-black tabular-nums">
              ₾{fmt(result.card_amount)}
            </span>
          </div>
        )}
        {result.cash_change > 0 && (
          <div className="flex justify-between items-center bg-slate-800 rounded-xl px-4 py-2.5">
            <span className="text-slate-400 text-sm font-semibold">ხურდა</span>
            <span className="text-white font-black tabular-nums text-lg">
              ₾{fmt(result.cash_change)}
            </span>
          </div>
        )}
      </div>

      {/* RS.GE status */}
      <div className={`w-full max-w-xs rounded-xl px-4 py-3 flex items-center gap-2 justify-center
        ${rsgeStatus === 'sent'   ? 'bg-emerald-900/30 text-emerald-400' :
          rsgeStatus === 'failed' ? 'bg-rose-900/30 text-rose-400'       :
                                    'bg-slate-800 text-slate-400'}`}>
        {rsgeStatus === 'sent'   ? <><BadgeCheck size={15} /><span className="text-sm font-semibold">RS.GE ფისკ. ჩეკი გაგზავნილია</span></> :
         rsgeStatus === 'failed' ? <><RotateCcw size={15} /><span className="text-sm font-semibold">RS.GE გაგზავნა ვერ მოხერხდა</span></> :
                                   <><Loader2 size={15} className="animate-spin" /><span className="text-sm">RS.GE-ზე გაგზავნა...</span></>}
      </div>

      <div className="flex gap-3 w-full max-w-xs pt-2">
        <button onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-600
            rounded-xl text-slate-300 text-sm font-semibold hover:bg-slate-800 transition-colors">
          <Receipt size={15} />
          ბეჭდვა
        </button>
        <button onClick={onNewSale}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600
            rounded-xl text-white text-sm font-bold hover:bg-emerald-500 transition-colors">
          <ArrowRight size={15} />
          შემდეგი
        </button>
      </div>
    </div>
  )
}

// ─── MAIN MODAL ───────────────────────────────────────────────

interface SplitPaymentModalProps {
  total:       number
  cartItems:   CartItemInput[]
  totals:      { subtotal: number; discountTotal: number; taxTotal: number; total: number }
  clientId?:   string
  clientName?: string
  onClose:     () => void
  onSuccess:   (result: FinalizePaymentResult) => void
}

export default function SplitPaymentModal({
  total,
  cartItems,
  totals,
  clientId,
  clientName,
  onClose,
  onSuccess,
}: SplitPaymentModalProps) {
  const sp = useSplitPaymentState(total)
  const { finalize, busy, cashAvailable } = useFinalizePayment()

  const [done,       setDone]       = useState(false)
  const [doneResult, setDoneResult] = useState<FinalizePaymentResult | null>(null)
  const [rsgeStatus, setRsgeStatus] = useState<'pending' | 'sent' | 'failed'>('pending')

  const METHODS: PaymentMethod[] = ['cash', 'card', 'store_credit', 'gift_card']

  const handleFinalize = async () => {
    if (!sp.isBalanced) {
      toast.error(`გადაუხდელი: ₾${fmt(sp.remaining)}`)
      return
    }
    const result = await finalize(
      sp.legs, cartItems, totals,
      { clientId, clientName }
    )
    if (!result) return

    setDoneResult(result)
    setDone(true)
    onSuccess(result)

    // Fire RS.GE async
    supabase.functions
      .invoke('rsge-split-invoice', { body: { transaction_id: result.transaction_id } })
      .then(({ data, error }) => {
        setRsgeStatus(!error && data?.success ? 'sent' : 'failed')
      })
      .catch(() => setRsgeStatus('failed'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md bg-[#0d0f14] border border-slate-700/60 rounded-t-3xl
        sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {done && doneResult ? (
          <DoneScreen
            result={doneResult}
            rsgeStatus={rsgeStatus}
            onClose={onClose}
            onNewSale={onClose}
          />
        ) : (
          <>
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <div>
                <h2 className="text-white font-black text-lg tracking-tight">გადახდა</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {sp.legs.length > 1 ? `${sp.legs.length} მეთოდი` : 'გადახდის მეთოდი'}
                </p>
              </div>
              <button onClick={onClose}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center
                  justify-center transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* ── Total bar ── */}
            <div className="mx-5 mb-4 bg-slate-900 rounded-2xl px-4 py-3 flex-shrink-0">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-slate-500 text-xs uppercase tracking-widest">სულ</span>
                <span className="text-white text-3xl font-black tabular-nums">
                  ₾{fmt(total)}
                </span>
              </div>

              {/* Allocated breakdown bar */}
              {sp.legs.length > 0 && (
                <>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                    {sp.legs.map(l => (
                      <div
                        key={l.id}
                        className={`h-full transition-all duration-300 rounded-full
                          ${l.method === 'cash' ? 'bg-emerald-500' :
                            l.method === 'card' ? 'bg-blue-500'    : 'bg-slate-400'}`}
                        style={{ width: `${Math.min(100, (l.amount / total) * 100)}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-slate-500 tabular-nums">
                      გადახდილია ₾{fmt(sp.allocated)}
                    </span>
                    <span className={`text-xs font-bold tabular-nums
                      ${sp.isBalanced ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {sp.isBalanced
                        ? '✓ სრული'
                        : `რჩება ₾${fmt(sp.remaining)}`}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* ── Quick split presets ── */}
            {sp.legs.length === 0 && (
              <div className="px-5 mb-4 flex-shrink-0">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">
                  სწრაფი split
                </p>
                <div className="flex gap-2">
                  {QUICK_SPLITS.map(qs => (
                    <button key={qs.label}
                      onClick={() => sp.applyQuickSplit(qs.cash, qs.card)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800
                        border border-slate-700 hover:bg-slate-700 transition-colors">
                      <Zap size={11} className="text-amber-400" />
                      <span className="text-xs font-bold text-slate-300">{qs.label}</span>
                      <span className="text-[10px] text-slate-600">
                        ნაღდი/ბარათი
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Leg cards ── */}
            <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-3">
              {sp.legs.map(leg => (
                <LegCard
                  key={leg.id}
                  leg={leg}
                  total={total}
                  remaining={sp.remaining}
                  isOnly={sp.legs.length === 1}
                  onRemove={() => sp.removeLeg(leg.id)}
                  onSetAmount={v => sp.setAmount(leg.id, v)}
                  onSetTendered={v => sp.setCashTendered(leg.id, v)}
                  onSetCard={f => sp.setCardDetails(leg.id, f)}
                  onFill={() => sp.fillRemaining(leg.id)}
                />
              ))}

              {/* ── Add method buttons ── */}
              <div className="flex flex-wrap gap-2 pt-1">
                {METHODS
                  .filter(m => !(m === 'cash' && !cashAvailable))
                  .map(m => {
                    const Icon    = METHOD_ICONS[m]
                    const already = sp.legs.some(l => l.method === m)
                    return (
                      <button key={m} onClick={() => sp.addLeg(m)}
                        disabled={already}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                          border transition-all disabled:opacity-30
                          ${already
                            ? 'bg-slate-900 border-slate-700 text-slate-600'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500'}`}>
                        <Plus size={11} />
                        <Icon size={13} />
                        {METHOD_META[m].label}
                        {m === 'cash' && !cashAvailable && (
                          <span className="text-rose-500 text-[9px]">სალარო დახ.</span>
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>

            {/* ── Confirm button ── */}
            <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-slate-800">
              <button
                onClick={handleFinalize}
                disabled={busy || !sp.isBalanced || sp.legs.length === 0}
                className={`w-full py-4 rounded-2xl font-black text-base transition-all
                  flex items-center justify-center gap-3
                  ${sp.isBalanced && sp.legs.length > 0
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/50'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
                {busy ? (
                  <><Loader2 size={20} className="animate-spin" /> მუშავდება...</>
                ) : sp.isBalanced ? (
                  <><CheckCircle2 size={20} /> გადახდის დადასტურება · ₾{fmt(total)}</>
                ) : (
                  <>გადაუხდელია ₾{fmt(sp.remaining)}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
