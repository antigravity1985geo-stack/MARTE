// src/pages/portal/PatientPortal.tsx
import { useState, useCallback, useRef } from 'react'
import { format, parseISO, isFuture, isToday } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  Bell, Calendar, CalendarPlus, CheckCircle2,
  ChevronRight, Clock, Download, FileText,
  History, Home, Loader2, LogOut, Phone,
  RefreshCw, Search, Shield, User, X,
  ClipboardList, Pill, PenTool
} from 'lucide-react'

import {
  usePortalAuth, usePortalAppointments,
  usePortalDocuments, usePortalNotifications,
  useBookingRequest, usePortalClinical
} from '@/hooks/usePatientPortal'
import {
  PortalAppointment, PatientDocument, PortalNotification,
  DOC_CATEGORY_META, REQUEST_STATUS_META, TIME_SLOTS
} from '@/types/patientPortal'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PortalSignaturePad } from '../portal/PortalConsentForms' // Reusing the signature pad

// ─── Config ───────────────────────────────────────────────
const CLINIC_NAME  = 'მარტე კლინიკა'
const CLINIC_PHONE = '+995 555 123 456'

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
  const [patientId,   setPatientId]   = useState('')
  const [looked,      setLooked]      = useState(false)
  const [lookLoading, setLookLoading] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const lookupPatient = async () => {
    if (!phone.trim()) return
    setLookLoading(true)
    const { data } = await import('@/integrations/supabase/client').then(m =>
      m.supabase.from('clinic_patients').select('id, full_name')
        .eq('phone', phone.trim()).maybeSingle()
    )
    setLookLoading(true); // Small delay feel
    setTimeout(() => {
      setLookLoading(false)
      if (data) {
        setPatientId(data.id)
        setPatientName(data.full_name)
        setLooked(true)
      } else {
        setLooked(true)
      }
    }, 600);
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  ტელეფონის ნომერი
                </label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookupPatient()}
                  type="tel"
                  placeholder="+995 5xx xxx xxx"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <Button onClick={lookupPatient} disabled={!phone.trim() || lookLoading} className="w-full py-6 bg-teal-600 hover:bg-teal-700">
                {lookLoading ? <Loader2 size={18} className="animate-spin" /> : <Phone size={18} />}
                გაგრძელება
              </Button>
            </>
          ) : !patientId ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <User size={22} className="text-amber-600" />
              </div>
              <p className="font-bold text-slate-800">პაციენტი ვერ მოიძებნა</p>
              <Button onClick={() => setLooked(false)} variant="ghost" className="text-xs">← სხვა ნომრით ცდა</Button>
            </div>
          ) : !otpSent ? (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
                <p className="text-sm font-bold text-teal-800">{patientName}</p>
                <p className="text-xs text-teal-600 mt-0.5">{phone}</p>
              </div>
              <Button onClick={handleSendOtp} disabled={loading} className="w-full py-6 bg-teal-600 hover:bg-teal-700">
                OTP კოდის გაგზავნა
              </Button>
              <Button onClick={() => setLooked(false)} variant="ghost" className="w-full text-xs">← უკან</Button>
            </div>
          ) : (
            <div className="space-y-5">
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
                    className="w-11 h-14 border-2 border-slate-200 rounded-xl text-center text-2xl font-black text-slate-900 focus:outline-none focus:border-teal-400"
                  />
                ))}
              </div>
              <Button onClick={handleVerify} disabled={otp.length < 6 || loading} className="w-full py-6 bg-teal-600 hover:bg-teal-700">
                შესვლა
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Appointment card ─────────────────────────────────────────
function AppointmentCard({ appt }: { appt: PortalAppointment }) {
  const date = parseISO(appt.start_time)
  const today = isToday(date)
  
  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-3 ${today ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">{fmtDate(appt.start_time)}</p>
          <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
            <Clock size={12} strokeWidth={3} />
            <span className="text-xs font-bold">{fmtTime(appt.start_time)}</span>
          </div>
        </div>
                <Badge variant="secondary" className="rounded-full text-[10px] uppercase font-black px-2.5">
                  {appt.status}
                </Badge>
      </div>
      {appt.doctor_name && (
        <div className="flex items-center gap-2 pt-1">
          <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-[10px] font-black text-teal-700">
            {appt.doctor_name[0].toUpperCase()}
          </div>
          <p className="text-xs font-bold text-slate-600">{appt.doctor_name}</p>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PORTAL ──────────────────────────────────────────────
export default function PatientPortal() {
  const { session, logout } = usePortalAuth()
  const [tab, setTab] = useState<'home' | 'records' | 'prescriptions' | 'documents' | 'appointments' | 'booking' | 'consents'>('home')
  
  const pid = session?.patient_id ?? null
  const { upcoming, past, loading: apptLoading } = usePortalAppointments(pid)
  const { documents, loading: docsLoading } = usePortalDocuments(pid)
  const { records, prescriptions, consentForms, loading: clinicalLoading } = usePortalClinical(pid)
  const { unread } = usePortalNotifications(pid)

  if (!session) return <LoginScreen tenantId={session?.tenant_id || ''} />

  const NavItem = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button onClick={() => setTab(id)} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${tab === id ? 'text-teal-600' : 'text-slate-400 opacity-60'}`}>
      <div className={`p-2 rounded-2xl transition-all ${tab === id ? 'bg-teal-50 scale-110' : ''}`}>
        <Icon size={20} strokeWidth={tab === id ? 3 : 2} />
      </div>
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-[#f8f7f4] pb-24">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-teal-500/20">
            {session.patient_name[0]}
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 leading-tight">{session.patient_name}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{CLINIC_NAME}</p>
          </div>
        </div>
        <button onClick={logout} className="p-2.5 rounded-2xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all duration-300">
           <LogOut size={18} />
        </button>
      </div>

      <div className="max-w-lg mx-auto p-5 space-y-6">
        {/* HOME */}
        {tab === 'home' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">გამარჯობა, {session.patient_name.split(' ')[0]}!</h2>
              <p className="text-sm text-slate-400 font-medium">თქვენი ციფრული სამედიცინო კაბინეტი</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card onClick={() => setTab('records')} className="group cursor-pointer rounded-3xl border-none shadow-sm hover:shadow-xl transition-all duration-500">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                    <ClipboardList size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">ისტორია</span>
                  <span className="text-lg font-black mt-1">{records?.length || 0}</span>
                </CardContent>
              </Card>
              <Card onClick={() => setTab('prescriptions')} className="group cursor-pointer rounded-3xl border-none shadow-sm hover:shadow-xl transition-all duration-500">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="p-3.5 bg-blue-50 text-blue-500 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                    <Pill size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">რეცეპტები</span>
                  <span className="text-lg font-black mt-1">{prescriptions?.length || 0}</span>
                </CardContent>
              </Card>
            </div>

            {upcoming.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">შემდეგი ვიზიტი</p>
                <AppointmentCard appt={upcoming[0]} />
              </div>
            )}

            <Button onClick={() => setTab('booking')} className="w-full py-7 bg-teal-600 hover:bg-teal-700 rounded-2xl shadow-lg shadow-teal-500/20 text-base font-black">
              <CalendarPlus className="mr-2" size={20} /> ვიზიტის დაჯავშნა
            </Button>
          </div>
        )}

        {/* RECORDS TAB */}
        {tab === 'records' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">სამედიცინო ჩანაწერები</h2>
            {clinicalLoading ? <Loader2 className="animate-spin mx-auto mt-10" /> : 
              records?.map((r: any) => (
                <Card key={r.id} className="rounded-3xl border-none shadow-sm p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[10px] font-black">{fmtDate(r.created_at)}</Badge>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ექიმი: {r.employees?.full_name}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl">{r.clinical_notes}</p>
                </Card>
              ))
            }
          </div>
        )}

        {/* PRESCRIPTIONS TAB */}
        {tab === 'prescriptions' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">რეცეპტები</h2>
            {prescriptions?.map((p: any) => (
              <Card key={p.id} className="rounded-3xl border-none shadow-sm p-5 border-l-4 border-l-blue-500">
                <div className="flex justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Pill size={16} className="text-blue-500" />
                    <span className="text-sm font-black">{p.medication_name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">{fmtDate(p.created_at)}</span>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">დანიშნულება</p>
                  <p className="text-sm font-medium text-slate-700">{p.dosage} - {p.frequency}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* CONSENTS TAB */}
        {tab === 'consents' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">თანხმობის ფორმები</h2>
            {consentForms?.map((f: any) => (
              <Card key={f.id} className="rounded-3xl border-none shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{f.template?.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{fmtDate(f.created_at)}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {f.status === 'signed' ? 'მოწერილია' : 'საჭიროებს ხელმოწერას'}
                  </Badge>
                </div>
                {f.status !== 'signed' && (
                   <Button onClick={() => setTab('booking')} className="w-full mt-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-black py-5">ხელის მოწერა</Button>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* APPOINTMENTS */}
        {tab === 'appointments' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">ვიზიტები</h2>
            <div className="space-y-3">
              {upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
              {past.map(a => <AppointmentCard key={a.id} appt={a} />)}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/90 backdrop-blur-xl border border-white p-3 rounded-[2.5rem] shadow-2xl flex items-center justify-around z-50">
        <NavItem id="home" icon={Home} label="მთავარი" />
        <NavItem id="records" icon={ClipboardList} label="ისტორია" />
        <NavItem id="prescriptions" icon={Pill} label="რეცეპტი" />
        <NavItem id="consents" icon={PenTool} label="თანხმობა" />
        <NavItem id="appointments" icon={Calendar} label="ვიზიტები" />
      </div>
    </div>
  )
}
