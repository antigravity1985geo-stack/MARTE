// components/CashDrawerPage.tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeDollarSign,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Landmark,
  Loader2,
  Lock,
  LockOpen,
  Minus,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import {
  useDrawers,
  useActiveSession,
  useSessionTransactions,
  useSessionSummary,
  useCashDrawerActions,
  useSessionHistory,
} from '@/hooks/useCashDrawer'
import { useTenant } from '@/hooks/useTenant'
import { TX_LABELS, TX_SIGN, CashDrawerTransaction } from '@/types/cashDrawer'

// ─── Formatters ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) =>
  format(new Date(d), 'd MMM yyyy, HH:mm', { locale: ka })

// ─── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'neutral',
}: {
  label: string
  value: number
  icon: React.ElementType
  variant?: 'neutral' | 'positive' | 'negative' | 'warning'
}) {
  const colors = {
    neutral:  'bg-slate-50 text-slate-700 border-slate-200',
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    negative: 'bg-rose-50 text-rose-700 border-rose-200',
    warning:  'bg-amber-50 text-amber-700 border-amber-200',
  }
  const iconColors = {
    neutral:  'text-slate-400',
    positive: 'text-emerald-500',
    negative: 'text-rose-500',
    warning:  'text-amber-500',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</span>
        <Icon size={16} className={iconColors[variant]} />
      </div>
      <p className="text-xl font-bold tabular-nums">₾{fmt(value)}</p>
    </div>
  )
}

function TransactionRow({ tx }: { tx: CashDrawerTransaction }) {
  const sign   = TX_SIGN[tx.type as keyof typeof TX_SIGN]
  const isPos  = sign === 1
  const skip   = tx.type === 'opening_float' || tx.type === 'closing_count'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
        ${skip ? 'bg-slate-100' : isPos ? 'bg-emerald-100' : 'bg-rose-100'}`}>
        {skip
          ? <Wallet size={13} className="text-slate-500" />
          : isPos
            ? <Plus size={13} className="text-emerald-600" />
            : <Minus size={13} className="text-rose-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {TX_LABELS[tx.type as keyof typeof TX_LABELS]}
        </p>
        {tx.note && (
          <p className="text-xs text-slate-400 truncate">{tx.note}</p>
        )}
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold tabular-nums
          ${skip ? 'text-slate-600' : isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isPos ? '+' : '−'}₾{fmt(tx.amount)}
        </p>
        <p className="text-[10px] text-slate-400">
          {format(new Date(tx.created_at), 'HH:mm')}
        </p>
      </div>
    </div>
  )
}

// ─── Open Drawer Modal ───────────────────────────────────────────────────────────

function OpenDrawerModal({
  drawerId,
  drawerName,
  onOpen,
  onClose,
  busy,
}: {
  drawerId: string
  drawerName: string
  onOpen: (float: number, notes: string) => void
  onClose: () => void
  busy: boolean
}) {
  const [float, setFloat]   = useState('')
  const [notes, setNotes]   = useState('')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
            <LockOpen size={22} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">სალაროს გახსნა</h2>
          <p className="text-sm text-slate-500 mb-5">{drawerName}</p>

          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            საწყისი ნაშთი (₾)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={float}
            onChange={e => setFloat(e.target.value)}
            placeholder="0.00"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-lg font-bold
              text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 mb-4"
          />

          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            შენიშვნა (სურვილისამებრ)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="სმენა, კომენტარი..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700
              focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none mb-5"
          />

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium
                text-slate-600 hover:bg-slate-50 transition-colors"
            >
              გაუქმება
            </button>
            <button
              onClick={() => onOpen(parseFloat(float) || 0, notes)}
              disabled={busy}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold
                hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <LockOpen size={15} />}
              გახსნა
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Manual Transaction Modal ────────────────────────────────────────────────────

function ManualTxModal({
  type,
  sessionId,
  drawerId,
  onAdd,
  onClose,
  busy,
}: {
  type: 'cash_in' | 'cash_out'
  sessionId: string
  drawerId: string
  onAdd: (amount: number, note: string) => void
  onClose: () => void
  busy: boolean
}) {
  const [amount, setAmount] = useState('')
  const [note, setNote]     = useState('')
  const isIn = type === 'cash_in'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4
            ${isIn ? 'bg-emerald-100' : 'bg-rose-100'}`}>
            {isIn
              ? <ArrowDownLeft size={22} className="text-emerald-600" />
              : <ArrowUpRight size={22} className="text-rose-600" />}
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isIn ? 'ნაღდი შემოსვლა' : 'ნაღდი გასვლა'}
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            {isIn ? 'სალაროში ნაღდი ფულის დამატება' : 'სალაროდან ნაღდი ფულის ამოღება'}
          </p>

          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            თანხა (₾)
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-lg font-bold
              text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
            autoFocus
          />

          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            მიზეზი / შენიშვნა *
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder={isIn ? 'მაგ: პეტი ქეში შევსება' : 'მაგ: Safe drop, ხარჯი'}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700
              focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-5"
          />

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium
                text-slate-600 hover:bg-slate-50 transition-colors">
              გაუქმება
            </button>
            <button
              onClick={() => onAdd(parseFloat(amount) || 0, note)}
              disabled={busy || !amount || !note}
              className={`flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition-colors
                flex items-center justify-center gap-2 disabled:opacity-50
                ${isIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : null}
              {isIn ? 'დამატება' : 'ამოღება'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Close Session Modal ─────────────────────────────────────────────────────────

function CloseSessionModal({
  expectedCash,
  onClose,
  onConfirm,
  busy,
}: {
  expectedCash: number
  onClose: () => void
  onConfirm: (declared: number, notes: string) => void
  busy: boolean
}) {
  const [declared, setDeclared] = useState('')
  const [notes, setNotes]       = useState('')
  const declaredNum = parseFloat(declared) || 0
  const variance    = declared ? declaredNum - expectedCash : null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
            <Lock size={22} className="text-slate-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">სალაროს დახურვა</h2>
          <p className="text-sm text-slate-500 mb-4">ჩათვალეთ სალაროში არსებული ნაღდი ფული</p>

          {/* Expected */}
          <div className="bg-slate-50 rounded-xl p-3 mb-4 flex justify-between items-center">
            <span className="text-sm text-slate-600">მოსალოდნელი</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              ₾{fmt(expectedCash)}
            </span>
          </div>

          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            რეალური ნაშთი (₾)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={declared}
            onChange={e => setDeclared(e.target.value)}
            placeholder="0.00"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-xl font-bold
              text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3"
            autoFocus
          />

          {/* Variance indicator */}
          {variance !== null && (
            <div className={`rounded-lg p-3 mb-4 flex items-center gap-2
              ${Math.abs(variance) < 0.01
                ? 'bg-emerald-50 text-emerald-700'
                : variance > 0
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-rose-50 text-rose-700'}`}>
              {Math.abs(variance) < 0.01
                ? <TrendingUp size={15} />
                : variance > 0
                  ? <TrendingUp size={15} />
                  : <TrendingDown size={15} />}
              <span className="text-sm font-semibold">
                სხვაობა: {variance >= 0 ? '+' : ''}₾{fmt(variance)}
                {Math.abs(variance) < 0.01 && ' — ზუსტი!'}
              </span>
            </div>
          )}

          {variance !== null && Math.abs(variance) >= 0.01 && (
            <>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                სხვაობის მიზეზი *
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="ახსენით სხვაობა..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-4"
              />
            </>
          )}

          <div className="flex gap-3 mt-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium
                text-slate-600 hover:bg-slate-50 transition-colors">
              გაუქმება
            </button>
            <button
              onClick={() => onConfirm(declaredNum, notes)}
              disabled={busy || !declared || (Math.abs(variance ?? 0) >= 0.01 && !notes)}
              className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold
                hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              დახურვა
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Session History Panel ───────────────────────────────────────────────────────

function SessionHistoryPanel({ drawerId }: { drawerId: string }) {
  const { sessions, loading } = useSessionHistory(drawerId)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 size={20} className="animate-spin text-slate-400" />
    </div>
  )

  if (!sessions.length) return (
    <p className="text-center text-sm text-slate-400 py-8">ისტორია ცარიელია</p>
  )

  return (
    <div className="space-y-2">
      {sessions.map(s => {
        const isExp   = expandedId === s.id
        const hasVar  = s.variance != null && Math.abs(s.variance) > 0.01
        return (
          <div key={s.id}
            className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
              onClick={() => setExpandedId(isExp ? null : s.id)}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0
                ${s.status === 'open' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {fmtDate(s.opened_at)}
                </p>
                <p className="text-xs text-slate-400">
                  {s.status === 'open'
                    ? 'მიმდინარე სმენა'
                    : s.closed_at ? `დახურვა: ${fmtDate(s.closed_at)}` : 'დახურული'}
                </p>
              </div>
              <div className="text-right mr-2">
                <p className="text-sm font-bold text-slate-900 tabular-nums">
                  ₾{fmt(s.expected_cash ?? s.opening_float)}
                </p>
                {hasVar && (
                  <p className={`text-xs font-semibold ${(s.variance ?? 0) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    {(s.variance ?? 0) >= 0 ? '+' : ''}₾{fmt(s.variance!)}
                  </p>
                )}
              </div>
              {isExp ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>

            {isExp && (
              <div className="border-t border-slate-100 p-3 bg-slate-50">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['საწყისი ნაშთი', `₾${fmt(s.opening_float)}`],
                    ['მოსალოდნელი', `₾${fmt(s.expected_cash ?? 0)}`],
                    ['რეალური', s.closing_declared != null ? `₾${fmt(s.closing_declared)}` : '—'],
                    ['სხვაობა', s.variance != null ? `${s.variance >= 0 ? '+' : ''}₾${fmt(s.variance)}` : '—'],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-white rounded-lg p-2">
                      <p className="text-slate-400 mb-0.5">{l}</p>
                      <p className="font-semibold text-slate-800">{v}</p>
                    </div>
                  ))}
                </div>
                {s.closing_notes && (
                  <p className="mt-2 text-xs text-slate-500 italic">"{s.closing_notes}"</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────────

export default function CashDrawerPage() {
  const { tenantId } = useTenant()
  const { drawers, loading: drawersLoading } = useDrawers()

  const [selectedDrawerId, setSelectedDrawerId] = useState<string>('')
  const activeDrawerId = selectedDrawerId || drawers[0]?.id || ''

  const { session, loading: sessionLoading, refetch } = useActiveSession(activeDrawerId)
  const { transactions } = useSessionTransactions(session?.id ?? null)
  const summary = useSessionSummary(transactions, session?.closing_declared)
  const actions = useCashDrawerActions(tenantId)

  const [modal, setModal] = useState<null | 'open' | 'cash_in' | 'cash_out' | 'close' | 'history'>(null)
  const [tab, setTab]     = useState<'live' | 'history'>('live')

  const selectedDrawer = drawers.find(d => d.id === activeDrawerId)
  const isOpen         = session?.status === 'open'

  if (drawersLoading || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (!drawers.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Archive size={36} className="text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">სალარო არ არის კონფიგურირებული</p>
        <p className="text-slate-400 text-sm mt-1">დაამატეთ სალარო ადმინ პანელში</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">სალარო</h1>
          <p className="text-sm text-slate-400">ნაღდი ფულის მართვა</p>
        </div>

        {/* Drawer selector */}
        {drawers.length > 1 && (
          <select
            value={activeDrawerId}
            onChange={e => setSelectedDrawerId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700
              focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {drawers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Status Card ── */}
      <div className={`rounded-2xl p-5 border-2 ${isOpen
        ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
        : 'border-slate-200 bg-gradient-to-br from-slate-50 to-white'}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className={`text-sm font-bold ${isOpen ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isOpen ? 'გახსნილია' : 'დახურულია'}
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums">
              ₾{fmt(summary.expected_cash)}
            </p>
            {isOpen && session && (
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock size={11} />
                გახსნა: {fmtDate(session.opened_at)}
              </p>
            )}
          </div>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center
            ${isOpen ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <Landmark size={26} className={isOpen ? 'text-emerald-600' : 'text-slate-400'} />
          </div>
        </div>

        {/* Action buttons */}
        {isOpen ? (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setModal('cash_in')}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border
                border-emerald-200 hover:bg-emerald-50 transition-colors">
              <ArrowDownLeft size={18} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">შემოსვლა</span>
            </button>
            <button
              onClick={() => setModal('cash_out')}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border
                border-rose-200 hover:bg-rose-50 transition-colors">
              <ArrowUpRight size={18} className="text-rose-600" />
              <span className="text-xs font-semibold text-rose-700">გასვლა</span>
            </button>
            <button
              onClick={() => setModal('close')}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-slate-900
                hover:bg-slate-700 transition-colors">
              <Lock size={18} className="text-white" />
              <span className="text-xs font-semibold text-white">დახურვა</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setModal('open')}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white
              font-bold text-sm transition-colors flex items-center justify-center gap-2">
            <LockOpen size={16} />
            სალაროს გახსნა
          </button>
        )}
      </div>

      {/* ── Stats Grid (only when open) ── */}
      {isOpen && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="გაყიდვები"   value={summary.total_sales}   icon={TrendingUp}   variant="positive" />
          <StatCard label="დაბრუნებები" value={summary.total_refunds} icon={TrendingDown} variant="negative" />
          <StatCard label="ნაღდი შემო"  value={summary.total_cash_in} icon={ArrowDownLeft} variant="positive" />
          <StatCard label="ნაღდი გასვ"  value={summary.total_cash_out} icon={ArrowUpRight} variant="negative" />
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(['live', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
              ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'live'
              ? <span className="flex items-center justify-center gap-1.5">
                  <ReceiptText size={13} /> მიმდინარე
                </span>
              : <span className="flex items-center justify-center gap-1.5">
                  <History size={13} /> ისტორია
                </span>}
          </button>
        ))}
      </div>

      {/* ── Transactions / History ── */}
      {tab === 'live' ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            {isOpen ? 'სმენის ტრანზაქციები' : 'ბოლო სმენა'}
          </h3>
          {transactions.length === 0 ? (
            <p className="text-center text-sm text-slate-300 py-8">ტრანზაქციები არ არის</p>
          ) : (
            <div>
              {transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">სმენების ისტორია</h3>
          <SessionHistoryPanel drawerId={activeDrawerId} />
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'open' && selectedDrawer && (
        <OpenDrawerModal
          drawerId={activeDrawerId}
          drawerName={selectedDrawer.name}
          onClose={() => setModal(null)}
          onOpen={async (float, notes) => {
            await actions.openSession(activeDrawerId, float, notes)
            setModal(null)
            refetch()
          }}
          busy={actions.busy}
        />
      )}

      {(modal === 'cash_in' || modal === 'cash_out') && session && (
        <ManualTxModal
          type={modal}
          sessionId={session.id}
          drawerId={activeDrawerId}
          onClose={() => setModal(null)}
          onAdd={async (amount, note) => {
            await actions.addManualTransaction(session.id, activeDrawerId, modal, amount, note)
            setModal(null)
          }}
          busy={actions.busy}
        />
      )}

      {modal === 'close' && session && (
        <CloseSessionModal
          expectedCash={summary.expected_cash}
          onClose={() => setModal(null)}
          onConfirm={async (declared, notes) => {
            await actions.closeSession(session.id, declared, notes)
            setModal(null)
            refetch()
          }}
          busy={actions.busy}
        />
      )}
    </div>
  )
}
