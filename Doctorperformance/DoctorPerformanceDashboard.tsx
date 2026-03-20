// components/DoctorPerformanceDashboard.tsx
// Design: clean data journalism — tight typographic grid,
// monochrome base with single teal signal color, confident numbers.

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
    <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
      {RANGES.map(r => (
        <button key={r.key} onClick={() => onChange(r.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
            ${value === r.key
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'}`}>
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
          <span className="text-[9px] text-slate-400 tabular-nums">{labels[i]}</span>
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
  const color   = capped >= 80 ? '#0F6E56' : capped >= 50 ? '#BA7517' : '#E24B4A'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={R} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle cx="36" cy="36" r={R} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${stroke} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)" />
        <text x="36" y="40" textAnchor="middle" fontSize="13"
          fontWeight="700" fill={color} fontFamily="inherit">
          {Math.round(pct)}%
        </text>
      </svg>
      <p className="text-xs text-slate-500 text-center leading-tight">{label}</p>
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
      className={`rounded-2xl border cursor-pointer transition-all p-4 space-y-3
        ${selected
          ? 'border-teal-400 bg-teal-50/40 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'}`}>

      {/* Doctor name + rank */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center
          justify-center text-teal-700 font-black text-sm flex-shrink-0">
          {doc.doctor_name.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{doc.doctor_name}</p>
          <p className="text-xs text-slate-400">სტომატოლოგი</p>
        </div>
        {selected && (
          <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
        )}
      </div>

      {/* Revenue hero */}
      <div className="bg-slate-50 rounded-xl px-3 py-2.5">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
          შემოსავალი
        </p>
        <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">
          ₾{fmtK(doc.total_revenue)}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
          ₾{fmt(doc.avg_invoice, 0)} საშ. ინვ.
        </p>
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
          <div key={l} className="bg-slate-50 rounded-lg p-2">
            <p className="text-[10px] text-slate-400 mb-0.5">{l}</p>
            <p className={`text-sm font-bold ${ok ? 'text-slate-800' : 'text-amber-700'}`}>
              {v}
            </p>
            {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Revenue per hour */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
        <span className="text-xs text-slate-400">Rev / სთ</span>
        <span className="text-sm font-bold text-teal-700 tabular-nums">
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
    <div className="space-y-5">

      {/* Appointment activity chart */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          ყოველდღიური ვიზიტები (14 დღე)
        </p>
        {dailyAppts.length > 0 ? (
          <MiniBar
            values={dailyAppts.map(d => d.value)}
            labels={dailyAppts.map(d => d.label.split(' ')[0])}
          />
        ) : (
          <p className="text-center text-sm text-slate-300 py-6">მონაცემი არ არის</p>
        )}
      </div>

      {/* Retention breakdown */}
      {ret && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            პაციენტების ანალიზი
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { l: 'სულ',       v: ret.total_patients,     color: 'text-slate-900' },
              { l: 'ახალი',     v: ret.new_patients,       color: 'text-blue-700' },
              { l: 'დამბრუნ.', v: ret.returning_patients, color: 'text-teal-700' },
            ].map(({ l, v, color }) => (
              <div key={l} className="bg-slate-50 rounded-xl p-3">
                <p className={`text-2xl font-black ${color}`}>{v}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          {/* Retention bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Retention rate</span>
              <span className="font-bold text-teal-700">{ret.retention_rate}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-700"
                style={{ width: `${ret.retention_rate}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0%</span>
              <span className="text-amber-600">სამიზნე: 65%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

      {/* Top procedures */}
      {topProcs.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            ტოპ პროცედურები
          </p>
          <div className="space-y-2.5">
            {topProcs.map((p, i) => (
              <div key={p.procedure_name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-300 w-4 flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-xs text-slate-700 font-medium truncate">
                      {p.procedure_name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="text-xs font-bold text-slate-800 tabular-nums">
                      ₾{fmtK(p.total_revenue)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1.5">×{p.count}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500"
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
      avg_pct:  Math.round(v.pcts.reduce((s, x) => s + x, 0) / v.pcts.length),
      total_appts: v.bookings.reduce((s, x) => s + x, 0),
    }))
  }, [data])

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-5">
        სავარძლების დატვირთვა
      </p>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={18} className="animate-spin text-slate-300" />
        </div>
      ) : byChair.length === 0 ? (
        <p className="text-center text-sm text-slate-300 py-6">მონაცემი არ არის</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {byChair.map(c => (
            <div key={c.id} className="flex flex-col items-center">
              <GaugePct pct={c.avg_pct} label={c.name} />
              <p className="text-[10px] text-slate-400 mt-1 tabular-nums">
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
          <h1 className="text-2xl font-black text-slate-900">ექიმების ანალიტიკა</h1>
          <p className="text-xs text-slate-400 mt-0.5">Doctor Performance Dashboard</p>
        </div>
        <RangeBar value={range} onChange={r => { setRange(r); setSelectedId(null) }} />
      </div>

      {/* Clinic-wide KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'სულ შემოსავ.',  v: `₾${fmtK(totalRev)}`,  icon: TrendingUp,  accent: 'teal'  },
          { l: 'სულ ვიზიტები', v: String(totalAppt),       icon: Activity,    accent: 'blue'  },
          { l: 'Retention საშ.', v: `${avgRetent}%`,        icon: Users,       accent: 'teal'  },
          { l: 'შეს. % საშ.',   v: `${avgComp}%`,          icon: Star,        accent: 'amber' },
        ].map(({ l, v, icon: Icon, accent }) => {
          const colors: Record<string, string> = {
            teal:  'bg-teal-50 text-teal-700',
            blue:  'bg-blue-50 text-blue-700',
            amber: 'bg-amber-50 text-amber-700',
          }
          return (
            <div key={l} className={`rounded-2xl p-4 border border-slate-100 ${colors[accent]}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{l}</p>
                <Icon size={14} className="opacity-50" />
              </div>
              <p className="text-3xl font-black tabular-nums">{v}</p>
            </div>
          )
        })}
      </div>

      {/* Main layout */}
      <div className="flex gap-5 items-start">

        {/* Doctor cards grid */}
        <div className={`grid gap-4 flex-1 min-w-0
          ${selectedId ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 bg-slate-50 rounded-2xl
                border border-slate-100 animate-pulse" />
            ))
          ) : summaries.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <BarChart3 size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">მონაცემი არ არის</p>
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
          <div className="w-80 flex-shrink-0 space-y-4 sticky top-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">
                {selected?.doctor_name}
              </p>
              <button onClick={() => setSelectedId(null)}
                className="text-xs text-slate-400 hover:text-slate-600 underline
                  underline-offset-2">
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
