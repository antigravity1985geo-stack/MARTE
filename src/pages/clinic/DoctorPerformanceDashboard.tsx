import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  Activity, BarChart3, ChevronDown, ChevronUp,
  Clock, Loader2, RefreshCw, Star, TrendingDown,
  TrendingUp, User, Users,
} from 'lucide-react'
import {
  useDoctors, useDateRange, useDoctorSummaries,
  useDoctorDailyStats, useDoctorRevenueStats,
  useDoctorRetention, useChairUtilization,
  useDoctorProcedures,
} from '@/hooks/useDoctorPerformance'
import {
  DateRange, DoctorSummaryCard,
} from '@/types/doctorPerformance'
import { Badge } from '@/components/ui/badge'

// ─── Utils ────────────────────────────────────────────────────
const fmt   = (n: number, d = 2) => new Intl.NumberFormat('ka-GE', {
  minimumFractionDigits: d, maximumFractionDigits: d,
}).format(n)
const fmtK  = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(Math.round(n))
const fmtDate = (d: string) => format(parseISO(d), 'd MMM', { locale: ka })

// ─── Range selector ───────────────────────────────────────────
const RANGES: { key: DateRange; label: string }[] = [
  { key: '7d',  label: '7 დღე'  },
  { key: '30d', label: '30 დღე' },
  { key: '90d', label: '3 თვე'  },
  { key: '6m',  label: '6 თვე'  },
  { key: '1y',  label: '1 წელი' },
]

function RangeBar({ value, onChange }: {
  value: DateRange; onChange: (r: DateRange) => void
}) {
  return (
    <div className="flex bg-muted rounded-xl p-1 gap-0.5">
      {RANGES.map(r => (
        <button key={r.key} onClick={() => onChange(r.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
            ${value === r.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'}`}>
          {r.label}
        </button>
      ))}
    </div>
  )
}

// ─── Sparkline (inline SVG) ───────────────────────────────────
function Sparkline({ values, color = '#0f6e56' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const max  = Math.max(...values, 1)
  const min  = Math.min(...values, 0)
  const range = max - min || 1
  const W = 80, H = 28
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Mini bar chart ───────────────────────────────────────────
function MiniBar({ values, labels, color = '#1D9E75' }: {
  values: number[]
  labels: string[]
  color?: string
}) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1 h-20">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900
            text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap
            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {fmt(v, 0)}
          </div>
          <div className="w-full rounded-t-sm"
            style={{
              height: `${Math.max((v / max) * 100, 4)}%`,
              backgroundColor: color,
              opacity: 0.5 + (v / max) * 0.5,
            }} />
          <span className="text-[9px] text-muted-foreground tabular-nums">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Gauge (chair utilization) ────────────────────────────────
function GaugePct({ pct, label }: { pct: number; label: string }) {
  const capped  = Math.min(pct, 100)
  const R       = 28
  const circ    = 2 * Math.PI * R
  const stroke  = circ * (capped / 100)
  const color   = capped >= 80 ? '#10B981' : capped >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative">
        <svg width="80" height="80" viewBox="0 0 80 80" className="drop-shadow-sm transition-transform duration-500 group-hover:scale-110">
          <circle cx="40" cy="40" r={R} fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="6" />
          <circle cx="40" cy="40" r={R} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${stroke} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            transform="rotate(-90 40 40)" />
          <text x="40" y="45" textAnchor="middle" fontSize="14"
            fontWeight="900" fill={color} className="tabular-nums">
            {Math.round(pct)}%
          </text>
        </svg>
      </div>
      <p className="text-[11px] font-bold text-muted-foreground text-center leading-tight uppercase tracking-wide group-hover:text-foreground transition-colors">
        {label}
      </p>
    </div>
  )
}

// ─── Doctor summary card ──────────────────────────────────────
function DoctorCard({
  doc,
  selected,
  onClick,
}: {
  doc:      DoctorSummaryCard
  selected: boolean
  onClick:  () => void
}) {
  const retGood = doc.retention_rate >= 60
  const compGood= doc.completion_rate >= 85

  return (
    <div onClick={onClick}
      className={`group rounded-3xl border cursor-pointer transition-all duration-300 p-5 space-y-4 relative overflow-hidden
        ${selected
          ? 'border-primary bg-primary/[0.03] ring-1 ring-primary/20 shadow-xl shadow-primary/5 -translate-y-1'
          : 'border-border bg-card hover:border-primary/40 hover:shadow-lg hover:-translate-y-1'}`}>
      
      {/* Decorative background element */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl transition-opacity duration-500
        ${selected ? 'bg-primary/20 opacity-100' : 'bg-primary/10 opacity-0 group-hover:opacity-100'}`} />

      {/* Doctor name + rank */}
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-sm
          ${retGood ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
          {doc.doctor_name.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {doc.doctor_name}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
            <User size={10} /> სტომატოლოგი
          </p>
        </div>
        {selected && (
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        )}
      </div>

      {/* Revenue hero */}
      <div className={`rounded-2xl px-4 py-3 transition-colors ${selected ? 'bg-primary/10' : 'bg-muted/50'}`}>
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">
          შემოსავალი
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-foreground tabular-nums leading-none">
            ₾{fmtK(doc.total_revenue)}
          </span>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            / {doc.total_appointments} ვიზიტი
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            l: 'ვიზიტები',
            v: String(doc.total_appointments),
            sub: `${doc.procedures_per_day}/დღ`,
            ok: true,
          },
          {
            l: 'შეს. %',
            v: `${doc.completion_rate}%`,
            sub: `${doc.no_show_rate}% no-show`,
            ok: compGood,
          },
          {
            l: 'პაციენტები',
            v: String(doc.unique_patients),
            sub: null,
            ok: true,
          },
          {
            l: 'Retention',
            v: `${doc.retention_rate}%`,
            sub: null,
            ok: retGood,
          },
        ].map(({ l, v, sub, ok }) => (
          <div key={l} className="bg-muted/30 hover:bg-muted/50 transition-colors rounded-xl p-2.5 border border-transparent hover:border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-tighter">{l}</p>
            <p className={`text-base font-black tabular-nums ${ok ? 'text-foreground' : 'text-amber-500'}`}>
              {v}
            </p>
            {sub && <p className="text-[10px] font-medium text-muted-foreground/80 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Revenue per hour */}
      <div className="flex items-center justify-between border-t border-border pt-2.5">
        <span className="text-xs text-muted-foreground">Rev / სთ</span>
        <span className="text-sm font-bold text-primary tabular-nums">
          ₾{fmt(doc.revenue_per_hour, 0)}
        </span>
      </div>
    </div>
  )
}

// ─── Detail pane for selected doctor ─────────────────────────
function DoctorDetailPane({
  doctorId,
  from,
  to,
}: {
  doctorId: string
  from:     string
  to:       string
}) {
  const { data: daily   } = useDoctorDailyStats(doctorId, from, to)
  const { data: retention } = useDoctorRetention(doctorId, from, to)
  const { data: procs   } = useDoctorProcedures(doctorId, from, to)
  const ret = retention[0]

  // Chart data — daily revenue sum (approx from appointments)
  const dailyAppts = daily.slice(-14).map(d => ({
    label: fmtDate(d.day),
    value: d.completed,
  }))

  // Procedure chart
  const topProcs = procs.slice(0, 6)
  const maxRev   = Math.max(...topProcs.map(p => p.total_revenue), 1)

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">

      {/* Appointment activity chart */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          ყოველდღიური ვიზიტები (14 დღე)
        </p>
        {dailyAppts.length > 0 ? (
          <MiniBar
            values={dailyAppts.map(d => d.value)}
            labels={dailyAppts.map(d => d.label.split(' ')[0])}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-6">მონაცემი არ არის</p>
        )}
      </div>

      {/* Retention breakdown */}
      {ret && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            პაციენტების ანალიზი
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { l: 'სულ',       v: ret.total_patients,     color: 'text-foreground' },
              { l: 'ახალი',     v: ret.new_patients,       color: 'text-blue-500' },
              { l: 'დამბრუნ.', v: ret.returning_patients, color: 'text-primary' },
            ].map(({ l, v, color }) => (
              <div key={l} className="bg-muted rounded-xl p-3">
                <p className={`text-2xl font-black ${color}`}>{v}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          {/* Retention bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Retention rate</span>
              <span className="font-bold text-primary">{ret.retention_rate}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${ret.retention_rate}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0%</span>
              <span className="text-amber-500">სამიზნე: 65%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

      {/* Top procedures */}
      {topProcs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            ტოპ პროცედურები
          </p>
          <div className="space-y-2.5">
            {topProcs.map((p, i) => (
              <div key={p.procedure_name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-muted w-4 flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-xs text-foreground font-medium truncate">
                      {p.procedure_name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      ₾{fmtK(p.total_revenue)}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">×{p.count}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(p.total_revenue / maxRev) * 100}%`,
                      opacity: 0.4 + (p.total_revenue / maxRev) * 0.6,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Chair utilization section ────────────────────────────────
function ChairSection({ from, to }: { from: string; to: string }) {
  const { data, loading } = useChairUtilization(from, to)

  // Average per chair
  const byChair = useMemo(() => {
    const m: Record<string, { name: string; room: string | null; pcts: number[]; bookings: number[] }> = {}
    for (const d of data) {
      if (!m[d.chair_id]) m[d.chair_id] = { name: d.chair_name, room: d.room, pcts: [], bookings: [] }
      m[d.chair_id].pcts.push(Number(d.utilization_pct))
      m[d.chair_id].bookings.push(d.appointments)
    }
    return Object.entries(m).map(([id, v]) => ({
      id,
      name:     v.name,
      room:     v.room,
      avg_pct:  Math.round(v.pcts.reduce((s, x) => s + x, 0) / (v.pcts.length || 1)),
      total_appts: v.bookings.reduce((s, x) => s + x, 0),
    }))
  }, [data])

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-[2.5rem] p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
          სავარძლების დატვირთვა
        </p>
        <div className="h-[1px] flex-1 bg-border/40 mx-6" />
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={18} className="animate-spin text-muted" />
        </div>
      ) : byChair.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">მონაცემი არ არის</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {byChair.map(c => (
            <div key={c.id} className="flex flex-col items-center">
              <GaugePct pct={c.avg_pct} label={c.name} />
              <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                {c.total_appts} ვიზ.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────
export default function DoctorPerformanceDashboard() {
  const [range,      setRange]      = useState<DateRange>('30d')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { from, to }                = useDateRange(range)
  const { doctors }                 = useDoctors()
  const { summaries, loading }      = useDoctorSummaries(from, to)

  const selected = summaries.find(s => s.doctor_id === selectedId) ?? null

  // Totals
  const totalRev  = summaries.reduce((s, d) => s + d.total_revenue, 0)
  const totalAppt = summaries.reduce((s, d) => s + d.total_appointments, 0)
  const avgRetent = summaries.length
    ? Math.round(summaries.reduce((s, d) => s + d.retention_rate, 0) / summaries.length)
    : 0
  const avgComp   = summaries.length
    ? Math.round(summaries.reduce((s, d) => s + d.completion_rate, 0) / summaries.length)
    : 0

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-5">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">ექიმების ანალიტიკა</h1>
          <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">Doctor Performance</p>
        </div>
        <RangeBar value={range} onChange={r => { setRange(r); setSelectedId(null) }} />
      </div>

      {/* Clinic-wide KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { l: 'სულ შემოსავალი',  v: `₾${fmtK(totalRev)}`,  icon: TrendingUp,  grad: 'from-indigo-600 to-violet-700' },
          { l: 'ვიზიტების ჯამი', v: String(totalAppt),       icon: Activity,    grad: 'from-emerald-500 to-teal-600' },
          { l: 'Retention საშუალო', v: `${avgRetent}%`,        icon: Users,       grad: 'from-amber-500 to-orange-600' },
          { l: 'შესრულება %',   v: `${avgComp}%`,          icon: Star,        grad: 'from-rose-500 to-pink-600' },
        ].map(({ l, v, icon: Icon, grad }) => {
          return (
            <div key={l} className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-black/5 group`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-90 group-hover:scale-110 transition-transform duration-500`} />
              <div className="relative flex flex-col h-full justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{l}</span>
                </div>
                <p className="text-3xl font-black tabular-nums tracking-tight">{v}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* Doctor cards grid */}
        <div className={`grid gap-4 flex-1 w-full
          ${selectedId ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-2xl
                border border-border animate-pulse" />
            ))
          ) : summaries.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-card rounded-2xl border border-border">
              <BarChart3 size={36} className="text-muted mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">მონაცემი არ არის</p>
            </div>
          ) : summaries.map(doc => (
            <DoctorCard
              key={doc.doctor_id}
              doc={doc}
              selected={selectedId === doc.doctor_id}
              onClick={() => setSelectedId(
                selectedId === doc.doctor_id ? null : doc.doctor_id
              )}
            />
          ))}
        </div>

        {/* Detail pane */}
        {selectedId && (
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4 lg:sticky lg:top-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                {selected?.doctor_name}
              </p>
              <button onClick={() => setSelectedId(null)}
                className="text-xs text-muted-foreground hover:text-foreground underline
                  underline-offset-2 transition-colors">
                დახურვა
              </button>
            </div>
            <DoctorDetailPane
              doctorId={selectedId}
              from={from}
              to={to}
            />
          </div>
        )}
      </div>

      {/* Chair utilization */}
      <ChairSection from={from} to={to} />
    </div>
  )
}
