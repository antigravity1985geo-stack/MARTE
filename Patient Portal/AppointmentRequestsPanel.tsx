// components/AppointmentRequestsPanel.tsx
// Clinic-side panel — shows incoming online booking requests in realtime.
// Drop into clinic dashboard / sidebar as a widget.

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  BadgeCheck, Ban, Bell, Calendar,
  ChevronRight, Clock, Loader2, Phone, RefreshCw, X,
} from 'lucide-react'
import { useAppointmentRequests } from '@/hooks/usePatientPortal'
import { AppointmentRequest, REQUEST_STATUS_META } from '@/types/patientPortal'

const fmtDate = (d: string) => format(parseISO(d), 'd MMM yyyy', { locale: ka })

function RequestCard({
  req,
  onConfirm,
  onReject,
  busy,
}: {
  req:       AppointmentRequest
  onConfirm: (id: string) => void
  onReject:  (id: string, reason: string) => void
  busy:      boolean
}) {
  const [showReject,    setShowReject]    = useState(false)
  const [rejectReason,  setRejectReason]  = useState('')
  const meta = REQUEST_STATUS_META[req.status]
  const isPending = req.status === 'pending'

  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-3
      ${isPending ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'}`}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">{req.patient_name}</p>
          <a href={`tel:${req.patient_phone}`}
            className="text-xs text-teal-600 font-semibold flex items-center gap-1 mt-0.5">
            <Phone size={11} />
            {req.patient_phone}
          </a>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full
          ${meta.color} ${meta.text}`}>
          {meta.label}
        </span>
      </div>

      {/* Request details */}
      <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-slate-400" />
          <span className="text-slate-700 font-semibold">{fmtDate(req.preferred_date)}</span>
          {req.preferred_time && (
            <>
              <Clock size={13} className="text-slate-400 ml-1" />
              <span className="text-slate-700">{req.preferred_time}</span>
            </>
          )}
        </div>
        {req.service_name && (
          <p className="text-slate-600 text-xs pl-5">{req.service_name}</p>
        )}
        {req.notes && (
          <p className="text-slate-400 text-xs pl-5 italic">"{req.notes}"</p>
        )}
      </div>

      {req.rejection_reason && (
        <p className="text-xs text-rose-600 italic">
          მიზეზი: {req.rejection_reason}
        </p>
      )}

      <p className="text-[10px] text-slate-300">
        {format(parseISO(req.created_at), 'd MMM · HH:mm', { locale: ka })}
      </p>

      {/* Actions */}
      {isPending && !showReject && (
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(req.id)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5
              bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold
              rounded-xl transition-colors disabled:opacity-40"
          >
            <BadgeCheck size={13} />
            დადასტ.
          </button>
          <button
            onClick={() => setShowReject(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5
              border border-rose-200 text-rose-600 text-xs font-bold
              rounded-xl hover:bg-rose-50 transition-colors"
          >
            <Ban size={13} />
            უარყოფა
          </button>
        </div>
      )}

      {showReject && (
        <div className="space-y-2">
          <input
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="უარყოფის მიზეზი…"
            className="w-full border border-rose-200 rounded-xl px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowReject(false)}
              className="flex-1 py-2 border border-slate-200 rounded-xl text-xs
                font-semibold text-slate-500">
              გაუქმება
            </button>
            <button
              onClick={() => { onReject(req.id, rejectReason); setShowReject(false) }}
              disabled={busy}
              className="flex-1 py-2 bg-rose-600 text-white text-xs font-bold
                rounded-xl disabled:opacity-40">
              უარყოფა
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────

export default function AppointmentRequestsPanel() {
  const [statusF, setStatusF] = useState<'all' | 'pending'>('pending')
  const { requests, loading, refetch, confirm, reject } =
    useAppointmentRequests({ status: statusF === 'all' ? undefined : 'pending' })

  const pending = requests.filter(r => r.status === 'pending').length

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            ჯავშნის მოთხოვნები
            {pending > 0 && (
              <span className="ml-2 text-sm font-bold text-amber-600">
                ({pending} ახალი)
              </span>
            )}
          </h2>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(['pending','all'] as const).map(s => (
              <button key={s} onClick={() => setStatusF(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${statusF === s
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'}`}>
                {s === 'pending' ? 'ახალი' : 'ყველა'}
              </button>
            ))}
          </div>
          <button onClick={refetch}
            className="w-8 h-8 border border-slate-200 rounded-xl flex items-center
              justify-center hover:bg-slate-50 transition-colors">
            <RefreshCw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Bell size={32} className="text-slate-200 mx-auto" />
          <p className="text-slate-400 text-sm">
            {statusF === 'pending' ? 'ახალი მოთხოვნა არ არის' : 'მოთხოვნები ვერ მოიძებნა'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              onConfirm={confirm}
              onReject={reject}
              busy={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}
