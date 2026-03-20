// components/QueueManagementPanel.tsx
// Receptionist view: issue tickets, call next, manage counter.
// Design: compact operator UI — dark sidebar + white work area.

import { useState, useCallback, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  BadgeCheck, Bell, ChevronRight, Clock,
  Loader2, PhoneCall, Plus, RefreshCw,
  RotateCcw, SkipForward, Star, Ticket,
  ToggleLeft, ToggleRight, Trash2, TrendingUp, X,
} from 'lucide-react'
import {
  useQueueCounters, useCounterTickets,
  useIssueTicket, useCounterActions,
  useQueueStats, useQueueSound,
} from '@/hooks/useQueueSystem'
import { useTenant } from '@/hooks/useTenant'
import {
  QueueCounter, QueueTicket, TicketStatus,
  ServiceType, TicketPriority,
  SERVICE_META, STATUS_META, PRIORITY_META, estimateWait,
} from '@/types/queueSystem'

const fmtTime = (d: string) => format(parseISO(d), 'HH:mm', { locale: ka })

// ─── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold
      px-2 py-0.5 rounded-full ${m.color} ${m.text}`}>
      {m.label}
    </span>
  )
}

// ─── Ticket row ───────────────────────────────────────────────
function TicketRow({
  ticket,
  avgServiceMin,
  position,
  onRecall,
  onStatus,
  onCancel,
  busy,
}: {
  ticket:       QueueTicket
  avgServiceMin:number
  position:     number
  onRecall:     (id: string) => void
  onStatus:     (id: string, s: TicketStatus) => void
  onCancel:     (id: string) => void
  busy:         boolean
}) {
  const isActive = ticket.status === 'called' || ticket.status === 'serving'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100
      last:border-0 transition-colors
      ${ticket.status === 'called' ? 'bg-amber-50' :
        ticket.status === 'serving' ? 'bg-teal-50/60' : ''}`}>

      {/* Ticket number */}
      <div className={`text-center flex-shrink-0 w-14`}>
        <p className={`text-lg font-black tabular-nums leading-none
          ${ticket.status === 'called'  ? 'text-amber-600' :
            ticket.status === 'serving' ? 'text-teal-700'  :
            ticket.status === 'waiting' ? 'text-slate-800' : 'text-slate-300'}`}>
          {ticket.ticket_number}
        </p>
        {ticket.priority > 0 && (
          <span className={`text-[9px] font-bold
            ${ticket.priority === 2 ? 'text-rose-600' : 'text-amber-600'}`}>
            {ticket.priority === 2 ? '⚡ სასწ.' : '★ პრიორ.'}
          </span>
        )}
      </div>

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {ticket.patient_name ?? 'სტუმარი'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <StatusBadge status={ticket.status} />
          {ticket.status === 'waiting' && (
            <span className="text-[10px] text-slate-400 tabular-nums">
              {estimateWait(position, avgServiceMin)}
            </span>
          )}
          {ticket.service_type && SERVICE_META[ticket.service_type] && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full
              ${SERVICE_META[ticket.service_type].color}`}>
              {SERVICE_META[ticket.service_type].label}
            </span>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="text-right flex-shrink-0 text-xs text-slate-400 tabular-nums">
        {fmtTime(ticket.issued_at)}
        {ticket.wait_minutes != null && (
          <p className="text-[10px] text-slate-300">{Math.round(ticket.wait_minutes)}წთ ლოდ.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        {ticket.status === 'called' && (
          <>
            <button onClick={() => onStatus(ticket.id, 'serving')}
              title="მომსახურება დაიწყო"
              className="w-7 h-7 bg-teal-100 hover:bg-teal-200 text-teal-700
                rounded-lg flex items-center justify-center transition-colors">
              <BadgeCheck size={14} />
            </button>
            <button onClick={() => onRecall(ticket.id)}
              title="ხელახლა გამოძახება"
              className="w-7 h-7 bg-amber-100 hover:bg-amber-200 text-amber-700
                rounded-lg flex items-center justify-center transition-colors">
              <PhoneCall size={13} />
            </button>
          </>
        )}
        {ticket.status === 'serving' && (
          <button onClick={() => onStatus(ticket.id, 'completed')}
            title="დასრულება"
            className="w-7 h-7 bg-emerald-100 hover:bg-emerald-200 text-emerald-700
              rounded-lg flex items-center justify-center transition-colors">
            <BadgeCheck size={14} />
          </button>
        )}
        {ticket.status === 'waiting' && (
          <button onClick={() => onCancel(ticket.id)} title="გაუქმება"
            className="w-7 h-7 hover:bg-rose-50 text-slate-300 hover:text-rose-500
              rounded-lg flex items-center justify-center transition-colors">
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Issue ticket modal ───────────────────────────────────────
function IssueTicketModal({
  counter,
  onIssue,
  onClose,
  busy,
}: {
  counter: QueueCounter
  onIssue: (opts: {
    patientName?: string
    serviceType?: ServiceType
    priority?: TicketPriority
    notes?: string
  }) => void
  onClose: () => void
  busy:    boolean
}) {
  const [name,     setName]     = useState('')
  const [service,  setService]  = useState<ServiceType>('consultation')
  const [priority, setPriority] = useState<TicketPriority>(0)
  const [notes,    setNotes]    = useState('')

  const SERVICES: ServiceType[] = ['consultation','treatment','xray','payment','other']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
              <Ticket size={18} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">ახალი ბილეთი</h2>
              <p className="text-xs text-slate-400">{counter.name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Patient name */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase
            tracking-wider block mb-1.5">
            პაციენტის სახელი (სურვ.)
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="სახელი გვარი…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-400"
            autoFocus
          />
        </div>

        {/* Service type */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase
            tracking-wider block mb-1.5">
            მომსახურება
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SERVICES.map(s => (
              <button key={s} onClick={() => setService(s)}
                className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors
                  ${service === s
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {SERVICE_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase
            tracking-wider block mb-1.5">
            პრიორიტეტი
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([0,1,2] as TicketPriority[]).map(p => (
              <button key={p} onClick={() => setPriority(p)}
                className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors
                  ${priority === p
                    ? p === 2 ? 'bg-rose-600 text-white border-rose-600'
                      : p === 1 ? 'bg-amber-500 text-white border-amber-500'
                      :           'bg-slate-900 text-white border-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {PRIORITY_META[p].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm
              font-semibold text-slate-600 hover:bg-slate-50">
            გაუქმება
          </button>
          <button
            onClick={() => onIssue({ patientName: name || undefined, serviceType: service, priority, notes: notes || undefined })}
            disabled={busy}
            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold
              rounded-xl text-sm disabled:opacity-40 transition-colors
              flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />}
            ბილეთის გაცემა
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Counter selector sidebar ─────────────────────────────────
function CounterSidebar({
  counters,
  selected,
  onSelect,
  onToggle,
}: {
  counters:  QueueCounter[]
  selected:  string | null
  onSelect:  (id: string) => void
  onToggle:  (id: string, open: boolean) => void
}) {
  return (
    <div className="w-52 flex-shrink-0 bg-slate-900 h-full flex flex-col">
      <div className="px-4 py-5 border-b border-white/10">
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
          სადგურები
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {counters.map(c => (
          <button key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors
              text-left
              ${selected === c.id
                ? 'bg-teal-600 text-white'
                : 'text-white/60 hover:bg-white/8 hover:text-white/90'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center
              font-black text-sm flex-shrink-0
              ${selected === c.id ? 'bg-white/20' : 'bg-white/10'}`}>
              {c.code}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{c.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full
                  ${c.is_open ? 'bg-emerald-400' : 'bg-white/20'}`} />
                <p className="text-[10px] font-medium opacity-60">
                  {c.is_open ? 'ღიაა' : 'დახ.'}
                </p>
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onToggle(c.id, !c.is_open) }}
              className={`flex-shrink-0 mt-0.5 transition-colors
                ${c.is_open ? 'text-emerald-400' : 'text-white/20 hover:text-white/40'}`}>
              {c.is_open
                ? <ToggleRight size={20} />
                : <ToggleLeft  size={20} />}
            </button>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN PANEL ───────────────────────────────────────────────
export default function QueueManagementPanel() {
  const { tenantId } = useTenant()
  const { counters, loading: cl, toggleCounter } = useQueueCounters()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showIssue,  setShowIssue]  = useState(false)

  const counter = counters.find(c => c.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId && counters.length > 0) setSelectedId(counters[0].id)
  }, [counters, selectedId])

  const {
    tickets, waiting, called, serving, completed, avgServiceMin, refetch,
  } = useCounterTickets(selectedId)

  const { issue, busy: issueBusy }                     = useIssueTicket()
  const { callNext, recall, updateStatus, cancelTicket, busy: actionBusy } = useCounterActions()
  const stats = useQueueStats(selectedId)
  const { playCall, playBeep } = useQueueSound()

  const handleCallNext = useCallback(async () => {
    if (!selectedId) return
    const result = await callNext(selectedId)
    if (result && result.ticket_number) {
      playBeep()
      setTimeout(() => playCall(result.ticket_number), 400)
    }
  }, [selectedId, callNext, playBeep, playCall])

  const handleIssue = async (opts: any) => {
    if (!selectedId) return
    const t = await issue(selectedId, opts)
    if (t) { setShowIssue(false) }
  }

  return (
    <div className="flex h-full overflow-hidden bg-slate-50" style={{ minHeight: '100vh' }}>

      {/* Sidebar */}
      {!cl && (
        <CounterSidebar
          counters={counters}
          selected={selectedId}
          onSelect={setSelectedId}
          onToggle={toggleCounter}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-slate-100 px-5 py-4 flex-shrink-0
          flex items-center justify-between gap-4">
          <div>
            {counter ? (
              <>
                <h1 className="text-lg font-black text-slate-900">{counter.name}</h1>
                <p className="text-xs text-slate-400">
                  კაბ. {counter.room_number ?? '—'} · {waiting.length} ელოდება
                </p>
              </>
            ) : (
              <h1 className="text-lg font-black text-slate-900">სადგური</h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Stats strip */}
            {[
              { l: 'სულ', v: stats.total_tickets },
              { l: 'დასრ.', v: stats.completed    },
              { l: 'ლოდ. (%)', v: stats.avg_wait_min != null ? `${Math.round(stats.avg_wait_min)}წთ` : '—' },
            ].map(({ l, v }) => (
              <div key={l} className="hidden sm:block text-center px-3 py-1.5
                bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-base font-black text-slate-900">{v}</p>
                <p className="text-[10px] text-slate-400">{l}</p>
              </div>
            ))}

            <button onClick={refetch}
              className="w-9 h-9 border border-slate-200 rounded-xl flex items-center
                justify-center hover:bg-slate-50 transition-colors">
              <RefreshCw size={13} className="text-slate-500" />
            </button>

            <button onClick={() => setShowIssue(true)} disabled={!counter}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700
                text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-30">
              <Plus size={15} />
              ბილეთი
            </button>

            <button
              onClick={handleCallNext}
              disabled={!selectedId || !counter?.is_open || waiting.length === 0 || actionBusy}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700
                text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-30"
            >
              {actionBusy
                ? <Loader2 size={15} className="animate-spin" />
                : <SkipForward size={15} />}
              შემდეგი
            </button>
          </div>
        </div>

        {/* Currently serving / called */}
        {(called || serving) && (
          <div className={`mx-5 mt-4 rounded-2xl border-2 p-4
            ${called
              ? 'bg-amber-50 border-amber-300'
              : 'bg-teal-50 border-teal-300'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
                  font-black text-xl
                  ${called ? 'bg-amber-200 text-amber-800' : 'bg-teal-200 text-teal-800'}`}>
                  {(called ?? serving)!.ticket_number.split('-')[1]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-slate-900">
                      {(called ?? serving)!.ticket_number}
                    </p>
                    <StatusBadge status={(called ?? serving)!.status} />
                  </div>
                  <p className="text-sm text-slate-600">
                    {(called ?? serving)!.patient_name ?? 'სტუმარი'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {called && (
                  <>
                    <button onClick={() => recall(called.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-200
                        text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-300">
                      <PhoneCall size={13} />
                      ხელახლა
                    </button>
                    <button onClick={() => updateStatus(called.id, 'serving')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-teal-600
                        text-white rounded-xl text-xs font-bold hover:bg-teal-700">
                      <BadgeCheck size={13} />
                      მომსახ. დაიწყო
                    </button>
                  </>
                )}
                {serving && (
                  <button onClick={() => updateStatus(serving.id, 'completed')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600
                      text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                    <BadgeCheck size={13} />
                    დასრულება
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs: Waiting / Completed */}
        <div className="flex-1 overflow-hidden flex flex-col mx-5 mt-4">
          <div className="bg-white rounded-2xl border border-slate-100 flex-1
            overflow-hidden flex flex-col">
            {/* Section: waiting */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center
              justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                ელოდება ({waiting.length})
              </p>
              {waiting.length > 0 && (
                <p className="text-xs text-slate-400">
                  სავარ. ლოდ.: {estimateWait(1, avgServiceMin)} — {estimateWait(waiting.length, avgServiceMin)}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {waiting.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-300 text-sm">რიგი ცარიელია</p>
                </div>
              ) : (
                waiting.map((t, i) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    avgServiceMin={avgServiceMin}
                    position={i + 1}
                    onRecall={recall}
                    onStatus={updateStatus}
                    onCancel={cancelTicket}
                    busy={actionBusy}
                  />
                ))
              )}

              {/* Completed (collapsed) */}
              {completed.length > 0 && (
                <details className="border-t border-slate-100">
                  <summary className="px-4 py-2.5 text-xs font-bold text-slate-400
                    uppercase tracking-wider cursor-pointer hover:bg-slate-50
                    flex items-center gap-2 list-none">
                    <TrendingUp size={12} />
                    დასრულებული ({completed.length})
                  </summary>
                  {completed.slice(-10).reverse().map(t => (
                    <TicketRow
                      key={t.id}
                      ticket={t}
                      avgServiceMin={avgServiceMin}
                      position={0}
                      onRecall={() => {}}
                      onStatus={() => {}}
                      onCancel={() => {}}
                      busy={false}
                    />
                  ))}
                </details>
              )}
            </div>
          </div>
        </div>
        <div className="h-5 flex-shrink-0" />
      </div>

      {showIssue && counter && (
        <IssueTicketModal
          counter={counter}
          onIssue={handleIssue}
          onClose={() => setShowIssue(false)}
          busy={issueBusy}
        />
      )}
    </div>
  )
}
