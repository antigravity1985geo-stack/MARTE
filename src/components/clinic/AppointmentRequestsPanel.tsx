// src/components/clinic/AppointmentRequestsPanel.tsx
import { useState, useRef, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  BadgeCheck, Ban, Bell, Calendar,
  Clock, Loader2, Phone, RefreshCw
} from 'lucide-react'
import { useAppointmentRequests } from '@/hooks/usePatientPortal'
import { AppointmentRequest } from '@/types/patientPortal'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

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
  const isPending = req.status === 'pending'

  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-3 transition-all duration-300
      ${isPending ? 'border-amber-200 ring-1 ring-amber-100 shadow-lg shadow-amber-500/5' : 'border-slate-100'}`}>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">{req.patient_name}</p>
          <a href={`tel:${req.patient_phone}`}
            className="text-xs text-teal-600 font-bold flex items-center gap-1 mt-0.5 hover:underline">
            <Phone size={11} strokeWidth={3} />
            {req.patient_phone}
          </a>
        </div>
        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-tighter">
          {req.status === 'pending' ? 'ახალი' : req.status}
        </Badge>
      </div>

      <div className="bg-slate-50/50 rounded-xl p-3 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-slate-400" />
          <span className="text-slate-700 font-bold">{fmtDate(req.preferred_date)}</span>
          {req.preferred_time && (
            <>
              <Clock size={13} className="text-slate-400 ml-1" />
              <span className="text-slate-700 font-medium">{req.preferred_time}</span>
            </>
          )}
        </div>
        {req.service_name && (
          <p className="text-slate-600 text-xs pl-5 font-medium">{req.service_name}</p>
        )}
        {req.notes && (
          <p className="text-slate-400 text-xs pl-5 italic font-medium">"{req.notes}"</p>
        )}
      </div>

      {req.rejection_reason && (
        <p className="text-[10px] text-rose-500 font-bold italic px-1">
          მიზეზი: {req.rejection_reason}
        </p>
      )}

      {isPending && !showReject && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => onConfirm(req.id)}
            disabled={busy}
            className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-black"
          >
            <BadgeCheck size={14} className="mr-1.5" /> დადასტ.
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReject(true)}
            className="flex-1 h-9 border-rose-200 text-rose-600 font-black hover:bg-rose-50"
          >
            <Ban size={14} className="mr-1.5" /> უარყოფა
          </Button>
        </div>
      )}

      {showReject && (
        <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
          <input
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="უარყოფის მიზეზი…"
            className="w-full border border-rose-100 rounded-xl px-3 py-2 text-xs font-bold
              focus:outline-none focus:ring-2 focus:ring-rose-200 bg-rose-50/30"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowReject(false)} className="flex-1 h-8 text-xs font-bold">
              გაუქმება
            </Button>
            <Button
              size="sm"
              onClick={() => { onReject(req.id, rejectReason); setShowReject(false) }}
              disabled={busy}
              className="flex-1 h-8 bg-rose-600 text-white font-black hover:bg-rose-700"
            >
              უარყოფა
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AppointmentRequestsPanel() {
  const { tenantId } = useTenant()
  const [statusF, setStatusF] = useState<'all' | 'pending'>('pending')
  const { requests, loading, refetch, confirm, reject } =
    useAppointmentRequests(tenantId, { status: statusF === 'all' ? undefined : 'pending' })

  const pending = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">ჯავშნის მოთხოვნები</h2>
          {pending > 0 && (
            <Badge variant="secondary" className="animate-pulse font-black px-1.5 py-0">
               {pending} ახალი
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100/50 rounded-xl p-0.5">
            {(['pending','all'] as const).map(s => (
              <button key={s} onClick={() => setStatusF(s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all duration-300
                  ${statusF === s
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'}`}>
                {s === 'pending' ? 'ახალი' : 'ყველა'}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={refetch} className="h-8 w-8 rounded-xl bg-slate-50">
            <RefreshCw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent shadow-lg shadow-teal-500/20"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">მოთხოვნები იტვირთება...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <Bell size={32} className="text-slate-300 mx-auto mb-3 opacity-50" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            {statusF === 'pending' ? 'ახალი მოთხოვნა არ არის' : 'მოთხოვნები ვერ მოიძებნა'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
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
