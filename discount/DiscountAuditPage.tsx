// components/DiscountAuditPage.tsx
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ka }     from 'date-fns/locale'
import {
  BadgeCheck, Ban, Clock, Filter, KeyRound,
  Loader2, Percent, Search, ShieldCheck, Tag,
  TriangleAlert,
} from 'lucide-react'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────

type DiscountStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'self_approved'
type DiscountType   = 'percentage' | 'fixed'
type TabKey         = 'logs' | 'pin'
type FilterKey      = DiscountStatus | 'all'

interface DiscountAuditLog {
  id:              string
  discount_type:   DiscountType
  discount_value:  number
  discount_amount: number
  cart_total:      number
  reason:          string | null
  status:          DiscountStatus
  requested_role:  string
  approver_name:   string | null
  denial_reason:   string | null
  pin_attempts:    number
  requested_at:    string
  resolved_at:     string | null
  created_at:      string
}

// ─── Utils ────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const fmtDate = (d: string) =>
  format(new Date(d), 'd MMM · HH:mm', { locale: ka })

// ─── Status badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: DiscountStatus }) {
  const cfg: Record<DiscountStatus, {
    label: string
    cls:   string
    Icon:  React.ElementType
  }> = {
    approved:      { label: 'დადასტ.',    cls: 'bg-emerald-100 text-emerald-700', Icon: BadgeCheck    },
    self_approved: { label: 'ავტო',       cls: 'bg-blue-100   text-blue-700',    Icon: ShieldCheck   },
    pending:       { label: 'ელოდება',    cls: 'bg-amber-100  text-amber-700',   Icon: Clock         },
    denied:        { label: 'უარყოფ.',    cls: 'bg-rose-100   text-rose-700',    Icon: Ban           },
    expired:       { label: 'ვადა გასვ.', cls: 'bg-slate-100  text-slate-500',   Icon: TriangleAlert },
  }
  const { label, cls, Icon } = cfg[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold
      px-2 py-0.5 rounded-full ${cls}`}>
      <Icon size={9} />{label}
    </span>
  )
}

// ─── Log row ──────────────────────────────────────────────────

function LogRow({ log }: { log: DiscountAuditLog }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50
          transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
          ${log.discount_type === 'percentage' ? 'bg-violet-100' : 'bg-amber-100'}`}>
          {log.discount_type === 'percentage'
            ? <Percent size={14} className="text-violet-600" />
            : <Tag     size={14} className="text-amber-600" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {log.discount_type === 'percentage'
                ? `${log.discount_value}%`
                : `₾${fmt(log.discount_value)}`}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              −₾{fmt(log.discount_amount)}
            </span>
            <StatusBadge status={log.status} />
          </div>
          <p className="text-xs text-slate-400 truncate">
            {log.reason ?? '—'} · {fmtDate(log.created_at)}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          {log.approver_name && (
            <p className="text-xs text-slate-500 font-medium">{log.approver_name}</p>
          )}
          {log.status === 'self_approved' && !log.approver_name && (
            <p className="text-xs text-blue-500">self</p>
          )}
          {log.pin_attempts > 0 && (
            <p className="text-[10px] text-slate-400">{log.pin_attempts} მცდ.</p>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3 bg-slate-50">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {([
              ['როლი',      log.requested_role],
              ['კალათა',    `₾${fmt(log.cart_total)}`],
              ['ფასდ. ₾',   `₾${fmt(log.discount_amount)}`],
              ['PIN მცდ.',  String(log.pin_attempts)],
              ['მოთხ. დრო', fmtDate(log.requested_at)],
              ['გადაწყვ.',  log.resolved_at ? fmtDate(log.resolved_at) : '—'],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="bg-white rounded-lg p-2 border border-slate-100">
                <p className="text-slate-400 text-[10px] mb-0.5">{l}</p>
                <p className="font-semibold text-slate-700">{v}</p>
              </div>
            ))}
          </div>
          {log.denial_reason && (
            <div className="mt-2 flex items-start gap-2 text-xs text-rose-600
              bg-rose-50 rounded-lg p-2">
              <Ban size={11} className="mt-0.5 flex-shrink-0" />
              <span>{log.denial_reason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Set PIN panel ────────────────────────────────────────────

function SetPinPanel() {
  const { tenantId } = useTenant()
  const { user }     = useAuth()
  const [pin,  setP] = useState('')
  const [conf, setC] = useState('')
  const [lbl,  setL] = useState('')
  const [busy, setBusy] = useState(false)

  const mismatch = pin.length > 0 && conf.length > 0 && pin !== conf
  const valid    = pin.length >= 4 && pin === conf

  const save = async () => {
    if (!user) return
    setBusy(true)
    const { error } = await supabase.rpc('set_manager_pin', {
      p_tenant_id: tenantId,
      p_user_id:   user.id,
      p_pin:       pin,
      p_label:     lbl || null,
    })
    setBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success('PIN განახლდა')
    setP(''); setC(''); setL('')
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={16} className="text-slate-500" />
        <h3 className="text-sm font-bold text-slate-800">ჩემი PIN კოდი</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            ახალი PIN (4–8 ციფრი)
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={e => setP(e.target.value.replace(/\D/g, ''))}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">
            PIN დადასტურება
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={conf}
            onChange={e => setC(e.target.value.replace(/\D/g, ''))}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm font-mono
              tracking-[0.3em] focus:outline-none focus:ring-2 transition-colors
              ${mismatch
                ? 'border-rose-300 focus:ring-rose-300'
                : 'border-slate-200 focus:ring-slate-400'}`}
          />
          {mismatch && (
            <p className="text-xs text-rose-500 mt-1">PIN-ები არ ემთხვევა</p>
          )}
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">
            ეტიკეტი (სურვ.)
          </label>
          <input
            value={lbl}
            onChange={e => setL(e.target.value)}
            placeholder="მაგ. მთავარი მენეჯერი"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <button
          onClick={save}
          disabled={!valid || busy}
          className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl
            disabled:opacity-40 hover:bg-slate-700 transition-colors
            flex items-center justify-center gap-2"
        >
          {busy
            ? <Loader2 size={14} className="animate-spin" />
            : <ShieldCheck size={14} />}
          PIN შენახვა
        </button>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────

export default function DiscountAuditPage() {
  const { tenantId } = useTenant()
  const [logs,   setLogs]   = useState<DiscountAuditLog[]>([])
  const [loading,setLoading]= useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [tab,    setTab]    = useState<TabKey>('logs')

  useEffect(() => {
    supabase
      .from('discount_audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLogs((data ?? []) as DiscountAuditLog[])
        setLoading(false)
      })
  }, [tenantId])

  const filtered = logs.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (l.reason ?? '').toLowerCase().includes(q) ||
        (l.approver_name ?? '').toLowerCase().includes(q) ||
        l.requested_role.toLowerCase().includes(q)
      )
    }
    return true
  })

  const approved = logs.filter(l =>
    l.status === 'approved' || l.status === 'self_approved'
  ).length
  const denied     = logs.filter(l => l.status === 'denied').length
  const totalSaved = logs
    .filter(l => l.status === 'approved' || l.status === 'self_approved')
    .reduce((s, l) => s + Number(l.discount_amount), 0)

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-900">ფასდაკლების ჟურნალი</h1>
        <p className="text-xs text-slate-400 mt-0.5">Discount Authorization Audit</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'სულ',     v: logs.length, cls: 'text-slate-900'  },
          { l: 'დადასტ.', v: approved,   cls: 'text-emerald-700' },
          { l: 'უარყოფ.', v: denied,     cls: 'text-rose-700'   },
        ].map(({ l, v, cls }) => (
          <div key={l} className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center">
            <p className={`text-2xl font-black ${cls}`}>{v}</p>
            <p className="text-xs text-slate-400">{l}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-slate-400 text-xs">სულ ფასდაკლება</span>
        <span className="text-amber-400 text-xl font-black tabular-nums">
          −₾{fmt(totalSaved)}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { k: 'logs', l: 'ჟურნალი' },
          { k: 'pin',  l: 'ჩემი PIN' },
        ] as { k: TabKey; l: string }[]).map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
              ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'pin' && <SetPinPanel />}

      {tab === 'logs' && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ძებნა..."
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as FilterKey)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm
                text-slate-600 focus:outline-none bg-white"
            >
              <option value="all">ყველა</option>
              <option value="approved">დადასტ.</option>
              <option value="self_approved">ავტო</option>
              <option value="denied">უარყ.</option>
              <option value="expired">ვადა</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10">
                <Filter size={24} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">ჩანაწერები ვერ მოიძებნა</p>
              </div>
            ) : (
              filtered.map(l => <LogRow key={l.id} log={l} />)
            )}
          </div>
        </>
      )}
    </div>
  )
}
