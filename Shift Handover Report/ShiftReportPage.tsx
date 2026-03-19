// components/ShiftReportPage.tsx
// Design aesthetic: editorial / newspaper — dense information,
// tight typography, stark dividers, authoritative monospace numbers.

import { useState } from 'react'
import { format } from 'date-fns'
import { ka }     from 'date-fns/locale'
import {
  AlertTriangle, Banknote, BarChart3, ChevronRight,
  Clock, CreditCard, Download, FileText, Loader2,
  RefreshCw, ReceiptText, TrendingDown, TrendingUp,
  Users, X, Zap,
} from 'lucide-react'
import {
  useLiveShiftReport,
  useSavedShiftReport,
  useShiftHistory,
  useRegenerateReport,
} from '@/hooks/useShiftReport'
import { useActiveSession } from '@/hooks/useCashDrawer'
import { useDrawers }        from '@/hooks/useCashDrawer'
import { ShiftReport, ReportType, ShiftSaleRow } from '@/types/shiftReport'
import { exportShiftPDF } from '@/lib/exportShiftPDF'

// ─── Utils ────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) =>
  format(new Date(d), 'd MMM yyyy · HH:mm', { locale: ka })

const fmtHour = (d: string) =>
  format(new Date(d), 'HH:00')

// ─── Stat card ────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon,
  accent = 'slate',
}: {
  label:   string
  value:   string
  sub?:    string
  icon:    React.ElementType
  accent?: 'slate' | 'emerald' | 'rose' | 'blue' | 'amber'
}) {
  const colors = {
    slate:   'bg-slate-50   border-slate-200  text-slate-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rose:    'bg-rose-50    border-rose-200   text-rose-700',
    blue:    'bg-blue-50    border-blue-200   text-blue-700',
    amber:   'bg-amber-50   border-amber-200  text-amber-700',
  }
  const iconColors = {
    slate:   'text-slate-400',
    emerald: 'text-emerald-500',
    rose:    'text-rose-500',
    blue:    'text-blue-500',
    amber:   'text-amber-500',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-60">{label}</span>
        <Icon size={15} className={iconColors[accent]} />
      </div>
      <p className="text-2xl font-black tabular-nums leading-none">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── KV Row ───────────────────────────────────────────────────
function KVRow({
  label, value, bold, highlight,
}: {
  label:      string
  value:      string
  bold?:      boolean
  highlight?: 'success' | 'danger' | 'warning'
}) {
  const hl = {
    success: 'bg-emerald-50 text-emerald-700',
    danger:  'bg-rose-50    text-rose-700',
    warning: 'bg-amber-50   text-amber-700',
  }
  return (
    <div className={`flex justify-between items-center py-2 border-b border-slate-50 last:border-0
      ${highlight ? hl[highlight] + ' -mx-5 px-5 rounded-none' : ''}`}>
      <span className={`text-sm ${bold ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
        {label}
      </span>
      <span className={`text-sm tabular-nums ${bold ? 'font-black text-slate-900' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Hourly bar chart ─────────────────────────────────────────
function HourlyChart({ data }: { data: ShiftReport['hourly_breakdown'] }) {
  if (!data?.length) return null
  const maxRev = Math.max(...data.map(h => Number(h.revenue)), 1)
  return (
    <div className="flex items-end gap-1 h-24 pt-2">
      {data.map((h, i) => {
        const pct = Number(h.revenue) / maxRev
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white
              text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100
              transition-opacity pointer-events-none z-10">
              ₾{fmt(Number(h.revenue))} · {h.tx_count} ტრ.
            </div>
            <div
              className="w-full bg-emerald-500 rounded-t-sm transition-all"
              style={{ height: `${Math.max(pct * 100, 4)}%`, opacity: 0.7 + pct * 0.3 }}
            />
            <span className="text-[9px] text-slate-400 tabular-nums">
              {fmtHour(h.hr)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Payment split bar ────────────────────────────────────────
function PaymentBar({ report }: { report: ShiftReport }) {
  const total = report.cash_sales + report.card_sales + report.other_sales || 1
  const cashPct  = (report.cash_sales  / total) * 100
  const cardPct  = (report.card_sales  / total) * 100
  const otherPct = (report.other_sales / total) * 100
  return (
    <div className="space-y-3">
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${cashPct}%` }} />
        <div className="bg-blue-500   h-full transition-all" style={{ width: `${cardPct}%` }} />
        {otherPct > 0 && (
          <div className="bg-violet-500 h-full transition-all" style={{ width: `${otherPct}%` }} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">ნაღდი</span>
              <span className="text-xs font-bold text-emerald-700">{cashPct.toFixed(0)}%</span>
            </div>
            <p className="text-sm font-black tabular-nums text-slate-800">₾{fmt(report.cash_sales)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">ბარათი</span>
              <span className="text-xs font-bold text-blue-700">{cardPct.toFixed(0)}%</span>
            </div>
            <p className="text-sm font-black tabular-nums text-slate-800">₾{fmt(report.card_sales)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Report body ──────────────────────────────────────────────
function ReportBody({
  report,
  reportType,
  drawerName,
  onExport,
  exporting,
}: {
  report:      ShiftReport
  reportType:  ReportType
  drawerName:  string
  onExport:    () => void
  exporting:   boolean
}) {
  const variance    = report.cash_variance ?? 0
  const hasVariance = report.declared_cash != null
  const varHighlight: 'success' | 'danger' | undefined = hasVariance
    ? Math.abs(variance) < 0.01 ? 'success' : 'danger'
    : undefined

  const duration = report.shift_start && report.shift_end
    ? Math.round((new Date(report.shift_end).getTime() - new Date(report.shift_start).getTime()) / 60000)
    : 0
  const hours   = Math.floor(duration / 60)
  const minutes = duration % 60

  return (
    <div className="space-y-4">
      {/* Report header strip */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                ${reportType === 'X'
                  ? 'bg-amber-400/20 text-amber-300'
                  : 'bg-emerald-400/20 text-emerald-300'}`}>
                {reportType}-ანგარიში
              </span>
              <span className="text-xs text-slate-400">{drawerName}</span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock size={11} />
              {fmtDate(report.shift_start)} — {format(new Date(report.shift_end), 'HH:mm')}
              <span className="text-slate-600 mx-1">·</span>
              {hours > 0 && `${hours} სთ `}{minutes > 0 && `${minutes} წთ`}
            </p>
          </div>
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white
              text-xs font-bold px-3 py-2 rounded-xl transition-colors"
          >
            {exporting
              ? <Loader2 size={13} className="animate-spin" />
              : <Download size={13} />}
            PDF
          </button>
        </div>

        {/* Net sales hero */}
        <p className="text-4xl font-black tabular-nums">₾{fmt(report.net_sales)}</p>
        <p className="text-xs text-slate-400 mt-1">წმინდა გაყიდვები</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="გაყიდვები"   value={String(report.total_transactions)}
          sub={`${report.refund_transactions} დაბრუნება`}
          icon={ReceiptText} accent="slate" />
        <StatCard label="ფასდაკლება" value={`₾${fmt(report.total_discounts)}`}
          icon={TrendingDown} accent="rose" />
        <StatCard label="ნაღდი"       value={`₾${fmt(report.cash_sales)}`}
          icon={Banknote}    accent="emerald" />
        <StatCard label="ბარათი"      value={`₾${fmt(report.card_sales)}`}
          icon={CreditCard}  accent="blue" />
      </div>

      {/* Revenue detail */}
      <Section title="გაყიდვების სტრუქტურა">
        <KVRow label="მთლიანი (brutto)"     value={`₾${fmt(report.gross_sales)}`} />
        <KVRow label="ფასდაკლებები"         value={`− ₾${fmt(report.total_discounts)}`} />
        <KVRow label="დაბრუნებები"          value={`− ₾${fmt(report.total_refunds)}`} />
        <KVRow label="წმინდა (netto)"       value={`₾${fmt(report.net_sales)}`}   bold />
        <KVRow label="დღგ 18%"              value={`₾${fmt(report.total_tax)}`} />
        <div className="pt-2 mt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
          {[
            { l: 'სულ',        v: report.total_transactions },
            { l: 'ანულირ.',    v: report.voided_transactions },
            { l: 'დაბრ.',      v: report.refund_transactions },
          ].map(({ l, v }) => (
            <div key={l}>
              <p className="text-xl font-black text-slate-900">{v}</p>
              <p className="text-xs text-slate-400">{l}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Payment split */}
      <Section title="გადახდის მეთოდები">
        <PaymentBar report={report} />
      </Section>

      {/* Cash drawer */}
      <Section title="სალაროს ბალანსი">
        <KVRow label="საწყისი ნაშთი"   value={`₾${fmt(report.opening_float)}`} />
        <KVRow label="ნაღდი შემოსვლა"  value={`+ ₾${fmt(report.cash_in)}`} />
        <KVRow label="ნაღდი გასვლა"    value={`− ₾${fmt(report.cash_out)}`} />
        <KVRow label="ნაღდი გაყიდვ."   value={`+ ₾${fmt(report.cash_sales)}`} />
        <KVRow label="ნაღდი დაბრ."     value={`− ₾${fmt(report.total_refunds)}`} />
        <KVRow label="მოსალოდნელი"     value={`₾${fmt(report.expected_cash)}`} bold />
        {hasVariance && (
          <>
            <KVRow label="რეალური (დათვლ.)" value={`₾${fmt(report.declared_cash!)}`} bold />
            <KVRow
              label="სხვაობა"
              value={Math.abs(variance) < 0.01
                ? '✓ ზუსტი'
                : `${variance >= 0 ? '+' : ''}₾${fmt(variance)}`}
              bold
              highlight={varHighlight}
            />
          </>
        )}
      </Section>

      {/* Cashier breakdown */}
      {report.cashier_breakdown?.length > 0 && (
        <Section title="კასიერების ანგარიში">
          <div className="space-y-2">
            {report.cashier_breakdown.map((c, i) => (
              <div key={c.cashier_id ?? i}
                className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center
                  text-xs font-bold text-slate-600 flex-shrink-0">
                  {(c.cashier_name ?? '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {c.cashier_name ?? 'უცნობი'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {c.tx_count} ტრ. · ფასდ. ₾{fmt(c.discounts)}
                  </p>
                </div>
                <p className="text-sm font-black tabular-nums text-slate-900">
                  ₾{fmt(c.revenue)}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Top products */}
      {report.top_products?.length > 0 && (
        <Section title="ტოპ 10 პროდუქტი">
          <div className="space-y-1.5">
            {report.top_products.map((p, i) => (
              <div key={p.product_id}
                className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-xs font-bold text-slate-300 w-5 text-right flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 flex-1 truncate">{p.product_name}</p>
                <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
                  ×{fmt(p.total_qty)}
                </span>
                <p className="text-sm font-bold tabular-nums text-slate-900 flex-shrink-0">
                  ₾{fmt(p.total_revenue)}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Hourly chart */}
      {report.hourly_breakdown?.length > 0 && (
        <Section title="საათობრივი აქტიურობა">
          <HourlyChart data={report.hourly_breakdown} />
        </Section>
      )}
    </div>
  )
}

// ─── History row ──────────────────────────────────────────────
function HistoryRow({
  shift,
  onOpen,
}: {
  shift:  ShiftSaleRow
  onOpen: () => void
}) {
  const var_ = shift.cash_variance
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors
        border-b border-slate-50 last:border-0 text-left"
    >
      <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">
          {fmtDate(shift.shift_start)}
        </p>
        <p className="text-xs text-slate-400">
          {shift.drawer?.name ?? '—'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold tabular-nums text-slate-900">
          ₾{fmt(shift.net_sales)}
        </p>
        {var_ != null && Math.abs(var_) > 0.01 && (
          <p className={`text-xs font-semibold tabular-nums ${var_ >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
            {var_ >= 0 ? '+' : ''}₾{fmt(var_)}
          </p>
        )}
      </div>
      <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
    </button>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────

export default function ShiftReportPage() {
  const { drawers }     = useDrawers()
  const drawerId        = drawers[0]?.id ?? ''
  const { session }     = useActiveSession(drawerId)
  const drawerName      = drawers[0]?.name ?? 'სალარო'

  const { report: liveReport, loading: liveLoading, refetch } = useLiveShiftReport(session?.id ?? null)
  const { shifts, loading: histLoading }                       = useShiftHistory(drawerId)
  const { regenerate, busy: regenBusy }                        = useRegenerateReport()

  const [tab,            setTab]            = useState<'live' | 'history'>('live')
  const [selectedShift,  setSelectedShift]  = useState<string | null>(null)
  const [reportType,     setReportType]     = useState<ReportType>('X')
  const [exporting,      setExporting]      = useState(false)

  const { report: savedReport, loading: savedLoading } = useSavedShiftReport(selectedShift)
  const activeReport = selectedShift ? savedReport : liveReport

  const handleExport = async () => {
    if (!activeReport) return
    setExporting(true)
    try {
      await exportShiftPDF(activeReport, reportType, drawerName)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black text-slate-900">სმენის ანგარიში</h1>
          <p className="text-xs text-slate-400 mt-0.5">Shift Handover Report</p>
        </div>
        <div className="flex items-center gap-2">
          {/* X / Z toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(['X','Z'] as ReportType[]).map(t => (
              <button key={t} onClick={() => setReportType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
                  ${reportType === t
                    ? t === 'X' ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700'}`}>
                {t}
              </button>
            ))}
          </div>
          {/* Refresh */}
          <button onClick={refetch}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center
              hover:bg-slate-200 transition-colors">
            <RefreshCw size={15} className={`text-slate-500 ${liveLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
        {([
          { key: 'live',    label: 'მიმდინარე', icon: Zap },
          { key: 'history', label: 'ისტორია',   icon: BarChart3 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); setSelectedShift(null) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
              text-sm font-semibold transition-colors
              ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Live report */}
      {tab === 'live' && (
        <>
          {liveLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : !session ? (
            <div className="text-center py-16">
              <FileText size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">სმენა გახსნილი არ არის</p>
              <p className="text-slate-300 text-sm mt-1">გახსენით სალარო ანგარიშის სანახავად</p>
            </div>
          ) : liveReport ? (
            <ReportBody
              report={liveReport}
              reportType={reportType}
              drawerName={drawerName}
              onExport={handleExport}
              exporting={exporting}
            />
          ) : null}
        </>
      )}

      {/* History */}
      {tab === 'history' && (
        <>
          {selectedShift ? (
            <div>
              <button
                onClick={() => setSelectedShift(null)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800
                  mb-4 transition-colors">
                ← უკან
              </button>
              {savedLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
              ) : savedReport ? (
                <ReportBody
                  report={savedReport}
                  reportType="Z"
                  drawerName={drawerName}
                  onExport={handleExport}
                  exporting={exporting}
                />
              ) : (
                <div className="text-center py-10">
                  <AlertTriangle size={28} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">ანგარიში ვერ მოიძებნა</p>
                  <button
                    onClick={async () => {
                      const r = await regenerate(selectedShift)
                      if (r) setSelectedShift(selectedShift)
                    }}
                    disabled={regenBusy}
                    className="mt-3 text-xs font-semibold text-slate-600 border border-slate-200
                      rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                    ხელახლა გენერირება
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {histLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : !shifts.length ? (
                <div className="text-center py-10">
                  <p className="text-slate-300 text-sm">სმენების ისტორია ცარიელია</p>
                </div>
              ) : shifts.map(s => (
                <HistoryRow
                  key={s.id}
                  shift={s}
                  onOpen={() => setSelectedShift(s.session_id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
