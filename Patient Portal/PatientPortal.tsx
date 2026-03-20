// pages/PatientPortal.tsx
// ─────────────────────────────────────────────────────────────
// Route: /portal  (public — no clinic auth required)
// Patients log in via OTP sent to their phone.
// Design: warm minimal — off-white, soft teal, generous space.
// Feels like a health app, not a clinical admin tool.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react'
import { format, parseISO, isFuture, isToday } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  Bell, Calendar, CalendarPlus, CheckCircle2,
  ChevronRight, Clock, Download, FileText,
  History, Home, Loader2, LogOut, Phone,
  RefreshCw, Search, Shield, User, X,
} from 'lucide-react'

import {
  usePortalAuth, usePortalAppointments,
  usePortalDocuments, usePortalNotifications,
  useBookingRequest,
} from '@/hooks/usePatientPortal'
import {
  PortalAppointment, PatientDocument, PortalNotification,
  DOC_CATEGORY_META, REQUEST_STATUS_META, TIME_SLOTS,
} from '@/types/patientPortal'

// ─── Config (inject from env / route params) ──────────────────
const TENANT_ID    = import.meta.env.VITE_TENANT_ID    ?? ''
const CLINIC_NAME  = import.meta.env.VITE_CLINIC_NAME  ?? 'კლინიკა'
const CLINIC_PHONE = import.meta.env.VITE_CLINIC_PHONE ?? ''

// ─── Utils ────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  format(parseISO(d), 'd MMMM yyyy', { locale: ka })
const fmtTime = (d: string) =>
  format(parseISO(d), 'HH:mm')
const fmtDateTime = (d: string) =>
  format(parseISO(d), 'd MMM · HH:mm', { locale: ka })
const fileSize = (b: number | null) => {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// ─── OTP Login screen ─────────────────────────────────────────
function LoginScreen({ tenantId }: { tenantId: string }) {
  const { loading, otpSent, sendOtp, verifyOtp } = usePortalAuth()
  const [phone,       setPhone]       = useState('')
  const [otp,         setOtp]         = useState('')
  const [patientName, setPatientName] = useState('')
  const [patientId,   setPatientId]   = useState('')  // fetched after phone lookup
  const [looked,      setLooked]      = useState(false)
  const [lookLoading, setLookLoading] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Phone lookup → find patient in DB
  const lookupPatient = async () => {
    if (!phone.trim()) return
    setLookLoading(true)
    const { data } = await import('@/lib/supabase').then(m =>
      m.supabase.from('patients').select('id, full_name')
        .eq('phone', phone.trim()).eq('tenant_id', tenantId).maybeSingle()
    )
    setLookLoading(false)
    if (data) {
      setPatientId(data.id)
      setPatientName(data.full_name)
      setLooked(true)
    } else {
      // Allow anonymous booking request even without patient record
      setLooked(true)
    }
  }

  const handleSendOtp = async () => {
    if (!patientId) return
    await sendOtp(tenantId, patientId, phone)
  }

  const handleOtpInput = (i: number, v: string) => {
    const chars = v.replace(/\D/g, '').slice(0, 1)
    const next  = otp.split('')
    next[i]     = chars
    setOtp(next.join(''))
    if (chars && i < 5) otpRefs.current[i + 1]?.focus()
    if (!chars && i > 0) otpRefs.current[i - 1]?.focus()
  }

  const handleVerify = async () => {
    if (otp.length < 6) return
    await verifyOtp(tenantId, patientId, otp, patientName)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#f8f7f4' }}>
      <div className="w-full max-w-sm">

        {/* Clinic logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center
            justify-center mx-auto mb-4 shadow-lg shadow-teal-200">
            <Shield size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">{CLINIC_NAME}</h1>
          <p className="text-slate-400 text-sm mt-1">პაციენტის პირადი კაბინეტი</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">

          {!looked ? (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase
                  tracking-wider block mb-2">
                  ტელეფონის ნომერი
                </label>
                <div className="flex gap-2">
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && lookupPatient()}
                    type="tel"
                    placeholder="+995 5xx xxx xxx"
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-3
                      text-base focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>
              <button
                onClick={lookupPatient}
                disabled={!phone.trim() || lookLoading}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white
                  font-bold rounded-xl transition-colors disabled:opacity-40
                  flex items-center justify-center gap-2"
              >
                {lookLoading
                  ? <Loader2 size={18} className="animate-spin" />
                  : <Phone size={18} />}
                გაგრძელება
              </button>
            </>
          ) : !patientId ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center
                justify-center mx-auto">
                <User size={22} className="text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800">პაციენტი ვერ მოიძებნა</p>
                <p className="text-sm text-slate-400 mt-1">
                  ეს ნომერი ჩვენს ბაზაში არ არის.
                  პირველი ვიზიტისთვის დაგვიკავშირდით:
                </p>
                {CLINIC_PHONE && (
                  <a href={`tel:${CLINIC_PHONE}`}
                    className="text-teal-600 font-bold text-lg mt-2 block">
                    {CLINIC_PHONE}
                  </a>
                )}
              </div>
              <button onClick={() => { setLooked(false); setPhone('') }}
                className="text-sm text-slate-400 underline underline-offset-2">
                ← სხვა ნომრით ცდა
              </button>
            </div>
          ) : !otpSent ? (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
                <p className="text-sm font-bold text-teal-800">{patientName}</p>
                <p className="text-xs text-teal-600 mt-0.5">{phone}</p>
              </div>
              <button onClick={handleSendOtp} disabled={loading}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white
                  font-bold rounded-xl disabled:opacity-40 transition-colors
                  flex items-center justify-center gap-2">
                {loading
                  ? <Loader2 size={18} className="animate-spin" />
                  : <Phone size={18} />}
                OTP კოდის გაგზავნა
              </button>
              <button onClick={() => setLooked(false)}
                className="w-full text-sm text-slate-400 hover:text-slate-600
                  transition-colors">
                ← უკან
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  კოდი გაიგზავნა ნომერზე
                </p>
                <p className="text-teal-600 font-bold">{phone}</p>
              </div>

              {/* OTP input - 6 cells */}
              <div className="flex gap-2 justify-center">
                {[0,1,2,3,4,5].map(i => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[i] ?? ''}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !otp[i] && i > 0)
                        otpRefs.current[i - 1]?.focus()
                    }}
                    className="w-11 h-14 border-2 border-slate-200 rounded-xl
                      text-center text-2xl font-black text-slate-900
                      focus:outline-none focus:border-teal-400 transition-colors
                      caret-transparent"
                  />
                ))}
              </div>

              <button
                onClick={handleVerify}
                disabled={otp.length < 6 || loading}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white
                  font-bold rounded-xl disabled:opacity-40 transition-colors
                  flex items-center justify-center gap-2"
              >
                {loading
                  ? <Loader2 size={18} className="animate-spin" />
                  : <CheckCircle2 size={18} />}
                შესვლა
              </button>

              <button onClick={handleSendOtp} disabled={loading}
                className="w-full text-sm text-slate-400 hover:text-teal-600
                  transition-colors">
                კოდი არ მივიღე — ხელახლა გაგზავნა
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-300 mt-6">
          {CLINIC_NAME} · დაცული პაციენტის პორტალი
        </p>
      </div>
    </div>
  )
}

// ─── Appointment card ─────────────────────────────────────────
function AppointmentCard({
  appt,
  isPast = false,
}: {
  appt:   PortalAppointment
  isPast?: boolean
}) {
  const date    = parseISO(appt.start_time)
  const today   = isToday(date)
  const future  = isFuture(date)
  const statusColor =
    appt.status === 'completed' ? 'text-emerald-600' :
    appt.status === 'cancelled' ? 'text-rose-400' :
    today ? 'text-amber-600' : 'text-slate-500'

  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-3
      ${today ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {today && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700
                px-2 py-0.5 rounded-full">
                დღეს
              </span>
            )}
            <p className="text-sm font-black text-slate-900">
              {fmtDate(appt.start_time)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock size={12} />
            <span className="text-xs">{fmtTime(appt.start_time)}</span>
          </div>
        </div>
        <span className={`text-xs font-semibold ${statusColor}`}>
          {appt.status === 'completed' ? '✓ გამართული' :
           appt.status === 'cancelled' ? 'გაუქმდა' :
           today ? '● დღეს' : 'დაჯავშნილი'}
        </span>
      </div>

      {appt.doctor_name && (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center
            justify-center text-xs font-bold text-teal-700">
            {appt.doctor_name.slice(0, 1).toUpperCase()}
          </div>
          <p className="text-sm text-slate-700">{appt.doctor_name}</p>
        </div>
      )}

      {appt.service_name && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5">
          {appt.service_name}
        </p>
      )}

      {appt.invoice_total != null && (
        <div className="flex items-center justify-between border-t border-slate-50 pt-2">
          <span className="text-xs text-slate-400">ინვოისი</span>
          <span className={`text-xs font-bold
            ${appt.invoice_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
            ₾{appt.invoice_total.toFixed(2)}
            {appt.invoice_status === 'paid' ? ' ✓' : ' · გადასახდელი'}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Document row ─────────────────────────────────────────────
function DocumentRow({ doc }: { doc: PatientDocument }) {
  const meta = DOC_CATEGORY_META[doc.category]
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50
      last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
        text-base flex-shrink-0 ${meta.color.split(' ')[0]}`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{doc.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
            {meta.label}
          </span>
          {doc.file_size && (
            <span className="text-[10px] text-slate-400">{fileSize(doc.file_size)}</span>
          )}
          <span className="text-[10px] text-slate-300">{fmtDate(doc.created_at)}</span>
        </div>
      </div>
      <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white
          rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors flex-shrink-0">
        <Download size={13} />
        ჩამოტვ.
      </a>
    </div>
  )
}

// ─── Booking form ─────────────────────────────────────────────
function BookingForm({
  session,
  tenantId,
  onDone,
}: {
  session:  { patient_name: string; patient_phone: string | null; patient_id: string } | null
  tenantId: string
  onDone:   () => void
}) {
  const { submitRequest, busy } = useBookingRequest(tenantId)
  const [date,    setDate]    = useState('')
  const [time,    setTime]    = useState('')
  const [service, setService] = useState('')
  const [notes,   setNotes]   = useState('')
  const [done,    setDone]    = useState(false)

  const SERVICES = [
    'კბილის შემოწმება',
    'კბილის ამოღება',
    'კბილის ლეჩება',
    'კბილის გათეთრება',
    'ბრეკეტების კონსულტ.',
    'იმპლანტი',
    'Root Canal',
    'სხვა',
  ]

  const minDate = new Date().toISOString().split('T')[0]

  const handleSubmit = async () => {
    if (!date || !service) return
    const ok = await submitRequest({
      patientId:    session?.patient_id,
      patientName:  session?.patient_name ?? 'სტუმარი',
      patientPhone: session?.patient_phone ?? '',
      preferredDate: date,
      preferredTime: time,
      serviceName:  service,
      notes:        notes || undefined,
    })
    if (ok) setDone(true)
  }

  if (done) {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center
          justify-center mx-auto ring-4 ring-emerald-200">
          <CheckCircle2 size={30} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-lg font-black text-slate-900">მოთხოვნა გაგზავნილია!</p>
          <p className="text-sm text-slate-400 mt-1">
            კლინიკა 24 სთ-ში დაგიკავშირდება
          </p>
        </div>
        <button onClick={onDone}
          className="px-6 py-3 bg-teal-600 text-white font-bold rounded-xl
            hover:bg-teal-700 transition-colors">
          მთავარ გვერდზე
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Service */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase
          tracking-wider block mb-2">
          მომსახურება *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SERVICES.map(s => (
            <button key={s} onClick={() => setService(s)}
              className={`text-left px-3 py-2.5 rounded-xl border text-sm
                transition-colors font-medium
                ${service === s
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'border-slate-200 text-slate-700 hover:border-teal-300 hover:bg-teal-50'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase
          tracking-wider block mb-2">
          სასურველი თარიღი *
        </label>
        <input
          type="date"
          value={date}
          min={minDate}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm
            focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      {/* Time slots */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase
          tracking-wider block mb-2">
          სასურველი დრო
        </label>
        <div className="flex flex-wrap gap-2">
          {TIME_SLOTS.map(t => (
            <button key={t} onClick={() => setTime(t)}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold
                transition-colors
                ${time === t
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'border-slate-200 text-slate-600 hover:border-teal-300'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase
          tracking-wider block mb-2">
          კომენტარი (სურვ.)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="ტკივილის ისტ., კონკრეტული პრობლემა…"
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm
            resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={busy || !date || !service}
        className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black
          rounded-2xl text-base transition-colors disabled:opacity-40
          flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : <CalendarPlus size={20} />}
        მოთხოვნის გაგზავნა
      </button>
    </div>
  )
}

// ─── Notification item ────────────────────────────────────────
function NotifItem({
  n,
  onRead,
}: {
  n:      PortalNotification
  onRead: (id: string) => void
}) {
  const icons: Record<string, string> = {
    reminder: '⏰',
    result:   '🧪',
    invoice:  '🧾',
    system:   '⚙️',
    info:     'ℹ️',
  }

  return (
    <div
      onClick={() => !n.is_read && onRead(n.id)}
      className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer
        transition-colors
        ${n.is_read
          ? 'bg-white border-slate-100 opacity-60'
          : 'bg-teal-50 border-teal-200 hover:bg-teal-100'}`}>
      <span className="text-xl flex-shrink-0 mt-0.5">{icons[n.type] ?? 'ℹ️'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">{n.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
        <p className="text-[10px] text-slate-400 mt-1.5">{fmtDateTime(n.created_at)}</p>
      </div>
      {!n.is_read && (
        <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />
      )}
    </div>
  )
}

// ─── MAIN PORTAL ──────────────────────────────────────────────

type PortalTab = 'home' | 'appointments' | 'documents' | 'booking' | 'notifications'

export default function PatientPortal() {
  const { session, logout }                   = usePortalAuth()
  const [tab, setTab]                         = useState<PortalTab>('home')
  const [historyTab, setHistoryTab]           = useState<'upcoming' | 'past'>('upcoming')
  const [docSearch, setDocSearch]             = useState('')

  const pid = session?.patient_id ?? null
  const { upcoming, past, loading: apptLoading } = usePortalAppointments(pid)
  const { documents, loading: docsLoading }       = usePortalDocuments(pid)
  const { notifs, unread, markRead, markAllRead }  = usePortalNotifications(pid)

  if (!session) {
    return <LoginScreen tenantId={TENANT_ID} />
  }

  const filteredDocs = documents.filter(d =>
    !docSearch ||
    d.title.toLowerCase().includes(docSearch.toLowerCase()) ||
    DOC_CATEGORY_META[d.category].label.includes(docSearch)
  )

  return (
    <div className="min-h-screen" style={{ background: '#f8f7f4' }}>

      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-4 py-3
        flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center
            justify-center text-white font-black text-sm">
            {session.patient_name.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">
              {session.patient_name}
            </p>
            <p className="text-[10px] text-slate-400">{CLINIC_NAME}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('notifications')}
            className="relative w-9 h-9 flex items-center justify-center
              rounded-xl hover:bg-slate-100 transition-colors">
            <Bell size={18} className="text-slate-500" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500
                text-white text-[9px] font-black rounded-full flex items-center
                justify-center leading-none">
                {unread}
              </span>
            )}
          </button>
          <button onClick={logout}
            className="w-9 h-9 flex items-center justify-center rounded-xl
              hover:bg-slate-100 transition-colors">
            <LogOut size={16} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-5 pb-24">

        {/* HOME tab */}
        {tab === 'home' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                გამარჯობა, {session.patient_name.split(' ')[0]}!
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                თქვენი სამედიცინო კაბინეტი
              </p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: 'ვიზიტები',   v: past.length + upcoming.length, icon: Calendar },
                { l: 'დოკ.',       v: documents.length,               icon: FileText },
                { l: 'განახლება',  v: unread,                         icon: Bell     },
              ].map(({ l, v, icon: Icon }) => (
                <div key={l} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                  <p className="text-2xl font-black text-slate-900">{v}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {/* Next appointment */}
            {upcoming.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    შემდეგი ვიზიტი
                  </p>
                  <button onClick={() => setTab('appointments')}
                    className="text-xs text-teal-600 font-semibold hover:text-teal-800">
                    ყველა →
                  </button>
                </div>
                <AppointmentCard appt={upcoming[0]} />
              </div>
            )}

            {/* Quick actions */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                სწრაფი ქმედება
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'ვიზიტის ჯავშანი',  icon: CalendarPlus, tab: 'booking'       as PortalTab, color: 'bg-teal-600 text-white'  },
                  { l: 'დოკუმენტები',        icon: FileText,     tab: 'documents'     as PortalTab, color: 'bg-white border border-slate-200 text-slate-700' },
                  { l: 'ვიზიტების ისტ.',    icon: History,      tab: 'appointments'  as PortalTab, color: 'bg-white border border-slate-200 text-slate-700' },
                  { l: 'შეტყობინებები',     icon: Bell,         tab: 'notifications' as PortalTab, color: 'bg-white border border-slate-200 text-slate-700' },
                ].map(({ l, icon: Icon, tab: t, color }) => (
                  <button key={l} onClick={() => setTab(t)}
                    className={`flex items-center gap-2.5 px-4 py-3.5 rounded-2xl
                      font-semibold text-sm transition-colors ${color}`}>
                    <Icon size={17} />
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent docs */}
            {documents.slice(0, 2).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    ბოლო დოკუმენტები
                  </p>
                  <button onClick={() => setTab('documents')}
                    className="text-xs text-teal-600 font-semibold hover:text-teal-800">
                    ყველა →
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 px-4 py-2">
                  {documents.slice(0, 2).map(d => <DocumentRow key={d.id} doc={d} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS tab */}
        {tab === 'appointments' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">ვიზიტები</h2>

            {/* Upcoming / Past toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {(['upcoming','past'] as const).map(t => (
                <button key={t} onClick={() => setHistoryTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold
                    transition-colors
                    ${historyTab === t
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500'}`}>
                  {t === 'upcoming' ? `მოახლოებული (${upcoming.length})` : `ისტორია (${past.length})`}
                </button>
              ))}
            </div>

            {apptLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : historyTab === 'upcoming' ? (
              upcoming.length === 0 ? (
                <div className="text-center py-14 space-y-3">
                  <Calendar size={36} className="text-slate-200 mx-auto" />
                  <p className="text-slate-400 text-sm">დაჯავშნილი ვიზიტი არ არის</p>
                  <button onClick={() => setTab('booking')}
                    className="text-teal-600 text-sm font-semibold underline underline-offset-2">
                    ჯავშნის მოთხოვნა
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
                </div>
              )
            ) : (
              past.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-14">
                  ვიზიტების ისტორია ცარიელია
                </p>
              ) : (
                <div className="space-y-3">
                  {past.map(a => <AppointmentCard key={a.id} appt={a} isPast />)}
                </div>
              )
            )}
          </div>
        )}

        {/* DOCUMENTS tab */}
        {tab === 'documents' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">დოკუმენტები</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2
                text-slate-400" />
              <input
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                placeholder="ძებნა…"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl
                  text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              />
            </div>
            {docsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-14">
                <FileText size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">
                  {docSearch ? 'ვერ მოიძებნა' : 'დოკუმენტები ვერ მოიძებნა'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 px-4 py-2">
                {filteredDocs.map(d => <DocumentRow key={d.id} doc={d} />)}
              </div>
            )}
          </div>
        )}

        {/* BOOKING tab */}
        {tab === 'booking' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">ვიზიტის ჯავშანი</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                შეარჩიეთ სასურველი დრო — კლინიკა დაადასტურებს
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <BookingForm
                session={session}
                tenantId={TENANT_ID}
                onDone={() => setTab('home')}
              />
            </div>
          </div>
        )}

        {/* NOTIFICATIONS tab */}
        {tab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">შეტყობინებები</h2>
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="text-xs text-teal-600 font-semibold hover:text-teal-800">
                  ყველა წაკითხული
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <div className="text-center py-14">
                <Bell size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">შეტყობინება არ არის</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifs.map(n => (
                  <NotifItem key={n.id} n={n} onRead={markRead} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100
        safe-area-inset-bottom z-10">
        <div className="max-w-lg mx-auto flex">
          {([
            { k: 'home',          icon: Home,        l: 'მთავ.'     },
            { k: 'appointments',  icon: Calendar,    l: 'ვიზიტები'  },
            { k: 'booking',       icon: CalendarPlus,l: 'ჯავშანი'   },
            { k: 'documents',     icon: FileText,    l: 'დოკ.'      },
            { k: 'notifications', icon: Bell,        l: 'შეტყ.',
              badge: unread > 0 ? unread : undefined },
          ] as { k: PortalTab; icon: any; l: string; badge?: number }[]).map(
            ({ k, icon: Icon, l, badge }) => (
              <button key={k} onClick={() => setTab(k)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 relative
                  transition-colors
                  ${tab === k ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <div className="relative">
                  <Icon size={20} />
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500
                      text-white text-[8px] font-black rounded-full flex items-center
                      justify-center leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold">{l}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
