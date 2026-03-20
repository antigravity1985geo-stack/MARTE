// components/DiscountAuthModal.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  BadgeCheck, Ban, ChevronDown, ChevronUp,
  Fingerprint, KeyRound, Loader2,
  Lock, LockOpen, Percent, ShieldAlert, Tag, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth }   from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────

type DiscountType   = 'percentage' | 'fixed'
type DiscountStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'self_approved'
type AuthFlowStep   = 'input' | 'pin' | 'approved' | 'denied'

export interface ApprovedDiscount {
  audit_id:         string
  discount_type:    DiscountType
  discount_value:   number
  discount_amount:  number
  approver_name:    string | null
  is_self_approved: boolean
}

interface DiscountPolicy {
  id:              string
  role:            string
  discount_type:   DiscountType
  self_limit:      number
  override_limit:  number
  requires_pin:    boolean
  requires_reason: boolean
}

interface DiscountRequest {
  discount_type:  DiscountType
  discount_value: number
  cart_total:     number
  reason:         string
}

const DISCOUNT_REASONS = [
  'VIP კლიენტი',
  'ფასდაკლების დღე',
  'დაზიანებული შეფუთვა',
  'ბოლო პარტია',
  'სარეკლამო',
  'ლოიალობის ბონუსი',
  'სხვა',
]

// ─── Utils ────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

// ─── Internal hooks ───────────────────────────────────────────

function useDiscountPolicy(tenantId: string, role: string) {
  const [policies, setPolicies] = useState<DiscountPolicy[]>([])

  useEffect(() => {
    if (!tenantId || !role) return
    supabase
      .from('discount_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('role', role)
      .eq('is_active', true)
      .then(({ data }) => setPolicies(data ?? []))
  }, [tenantId, role])

  const getPolicy = useCallback(
    (type: DiscountType) => policies.find(p => p.discount_type === type) ?? null,
    [policies]
  )
  return { getPolicy }
}

function useDiscountAuthFlow(
  cartTotal:   number,
  sessionId:   string | null,
  cashierRole: string,
  tenantId:    string,
  userId:      string,
) {
  const { getPolicy } = useDiscountPolicy(tenantId, cashierRole)

  const [step,     setStep]     = useState<AuthFlowStep>('input')
  const [auditId,  setAuditId]  = useState<string | null>(null)
  const [approved, setApproved] = useState<ApprovedDiscount | null>(null)
  const [busy,     setBusy]     = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  const submitRequest = useCallback(async (req: DiscountRequest): Promise<boolean> => {
    setBusy(true)
    const policy  = getPolicy(req.discount_type)
    const discAmt = req.discount_type === 'percentage'
      ? (cartTotal * req.discount_value) / 100
      : req.discount_value

    const ceiling = policy?.override_limit ?? 0
    const overMax = req.discount_type === 'percentage'
      ? req.discount_value > ceiling
      : discAmt > ceiling

    if (overMax) {
      toast.error(`მაქსიმალური ლიმიტი: ${ceiling}${req.discount_type === 'percentage' ? '%' : '₾'}`)
      setBusy(false)
      return false
    }

    const selfLimit = policy?.self_limit ?? 0
    const selfOk    = req.discount_type === 'percentage'
      ? req.discount_value <= selfLimit
      : discAmt <= selfLimit

    const { data, error } = await supabase
      .from('discount_audit_logs')
      .insert({
        tenant_id:       tenantId,
        session_id:      sessionId,
        requested_by:    userId,
        requested_role:  cashierRole,
        discount_type:   req.discount_type,
        discount_value:  req.discount_value,
        cart_total:      cartTotal,
        discount_amount: discAmt,
        reason:          req.reason || null,
        status:          selfOk ? 'self_approved' : 'pending',
        resolved_at:     selfOk ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    setBusy(false)
    if (error) { toast.error(error.message); return false }

    setAuditId(data.id)

    if (selfOk) {
      setApproved({
        audit_id:         data.id,
        discount_type:    req.discount_type,
        discount_value:   req.discount_value,
        discount_amount:  discAmt,
        approver_name:    null,
        is_self_approved: true,
      })
      setStep('approved')
    } else {
      setStep('pin')
    }
    return true
  }, [tenantId, userId, sessionId, cashierRole, cartTotal, getPolicy])

  const submitPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!auditId) return false
    setBusy(true)
    setPinError(null)

    const { data, error } = await supabase.rpc('approve_discount_with_pin', {
      p_tenant_id: tenantId,
      p_audit_id:  auditId,
      p_pin:       pin,
    })

    setBusy(false)

    if (error || !data?.ok) {
      const msg = data?.error ?? error?.message ?? 'PIN შეცდომა'
      setPinError(msg)
      setAttempts(a => a + 1)
      return false
    }

    const { data: audit } = await supabase
      .from('discount_audit_logs')
      .select('discount_type,discount_value,discount_amount')
      .eq('id', auditId)
      .single()

    if (audit) {
      setApproved({
        audit_id:         auditId,
        discount_type:    audit.discount_type,
        discount_value:   audit.discount_value,
        discount_amount:  audit.discount_amount,
        approver_name:    data.approver_name,
        is_self_approved: false,
      })
    }
    setStep('approved')
    return true
  }, [auditId, tenantId])

  const deny = useCallback(async (reason?: string) => {
    if (auditId) {
      await supabase.rpc('deny_discount', {
        p_audit_id: auditId,
        p_reason:   reason ?? null,
      })
    }
    setStep('denied')
  }, [auditId])

  const reset = useCallback(() => {
    setStep('input')
    setAuditId(null)
    setApproved(null)
    setBusy(false)
    setPinError(null)
    setAttempts(0)
  }, [])

  return { step, approved, busy, pinError, attempts, submitRequest, submitPin, deny, reset }
}

// ─── PIN Pad ──────────────────────────────────────────────────

function PinPad({
  onComplete, onCancel, error, busy, attempts, ttlSeconds = 120,
}: {
  onComplete:  (pin: string) => void
  onCancel:    () => void
  error:       string | null
  busy:        boolean
  attempts:    number
  ttlSeconds?: number
}) {
  const [digits,  setDigits]  = useState<string[]>([])
  const [shake,   setShake]   = useState(false)
  const [seconds, setSeconds] = useState(ttlSeconds)
  const MAX = 6

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!error) return
    setShake(true)
    setDigits([])
    const t = setTimeout(() => setShake(false), 500)
    return () => clearTimeout(t)
  }, [error, attempts])

  useEffect(() => {
    if (digits.length === MAX) onComplete(digits.join(''))
  }, [digits, onComplete])

  const press = (d: string) => {
    if (digits.length < MAX && !busy) setDigits(p => [...p, d])
  }
  const del = () => setDigits(p => p.slice(0, -1))

  const timerPct = (seconds / ttlSeconds) * 100
  const isLow    = seconds < 30
  const keys     = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3
          ${error ? 'bg-rose-500/20' : 'bg-amber-500/20'}`}>
          <Fingerprint size={32} className={error ? 'text-rose-400' : 'text-amber-400'} />
        </div>
        <p className="text-white font-black text-lg">მენეჯერის PIN</p>
        <p className="text-slate-400 text-xs mt-0.5">ფასდაკლების დასადასტურებლად</p>
      </div>

      {/* TTL bar */}
      <div className="w-full max-w-[240px]">
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000
              ${isLow ? 'bg-rose-500' : 'bg-amber-500'}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <p className={`text-[10px] text-right mt-1 tabular-nums
          ${isLow ? 'text-rose-400' : 'text-slate-500'}`}>
          {seconds}წმ
        </p>
      </div>

      {/* Dots */}
      <div className={shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}
        style={{ display: 'flex', gap: '12px' }}>
        {Array.from({ length: MAX }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150
            ${i < digits.length
              ? error
                ? 'bg-rose-500 border-rose-500'
                : 'bg-amber-400 border-amber-400 scale-110'
              : 'bg-transparent border-slate-600'}`} />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-900/40 border border-rose-700/50
          rounded-xl px-4 py-2.5 w-full max-w-[240px] justify-center">
          <ShieldAlert size={14} className="text-rose-400" />
          <span className="text-rose-300 text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
        {keys.map((k, i) => {
          if (k === '') return <div key={i} />
          if (k === '⌫') return (
            <button key={i} onClick={del}
              disabled={!digits.length || busy}
              className="h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center
                justify-center text-slate-400 hover:bg-slate-700 disabled:opacity-30
                active:scale-95 transition-all text-xl">
              ⌫
            </button>
          )
          return (
            <button key={i} onClick={() => press(k)}
              disabled={busy || seconds === 0}
              className="h-14 rounded-2xl bg-slate-800 border border-slate-700 text-white
                text-xl font-bold hover:bg-slate-700 hover:border-slate-500 active:scale-95
                active:bg-slate-600 disabled:opacity-30 transition-all select-none">
              {k}
            </button>
          )
        })}
      </div>

      {busy && (
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <Loader2 size={15} className="animate-spin" />
          <span>შემოწმება...</span>
        </div>
      )}

      <button onClick={onCancel}
        className="text-slate-500 hover:text-slate-300 text-sm transition-colors py-1">
        გაუქმება
      </button>

      {attempts >= 3 && (
        <p className="text-xs text-rose-400 text-center">
          {attempts} მცდელობა
        </p>
      )}
    </div>
  )
}

// ─── Input step ───────────────────────────────────────────────

function InputStep({
  cartTotal, cashierRole, tenantId, onSubmit, busy,
}: {
  cartTotal:   number
  cashierRole: string
  tenantId:    string
  onSubmit:    (req: DiscountRequest) => void
  busy:        boolean
}) {
  const [type,    setType]    = useState<DiscountType>('percentage')
  const [value,   setValue]   = useState('')
  const [reason,  setReason]  = useState('')
  const [showAll, setShowAll] = useState(false)
  const { getPolicy } = useDiscountPolicy(tenantId, cashierRole)

  const policy    = getPolicy(type)
  const numVal    = parseFloat(value) || 0
  const discAmt   = type === 'percentage' ? (cartTotal * numVal) / 100 : numVal
  const newTotal  = Math.max(0, cartTotal - discAmt)
  const selfLimit = policy?.self_limit     ?? 0
  const maxLimit  = policy?.override_limit ?? 0
  const needsPin  = numVal > selfLimit
  const overLimit = numVal > maxLimit

  const visibleReasons = showAll ? DISCOUNT_REASONS : DISCOUNT_REASONS.slice(0, 4)

  return (
    <div className="space-y-5">
      <div className="text-center pb-1">
        <div className="w-14 h-14 bg-amber-500/15 rounded-2xl flex items-center
          justify-center mx-auto mb-3">
          <Tag size={26} className="text-amber-400" />
        </div>
        <p className="text-white font-black text-lg">ფასდაკლების მოთხოვნა</p>
        <p className="text-slate-400 text-sm mt-0.5 tabular-nums">
          კალათა: ₾{fmt(cartTotal)}
        </p>
      </div>

      {policy && (
        <div className="bg-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Lock size={13} className="text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            <span className="text-slate-300 font-semibold">{cashierRole}</span>
            {' · '}თვით:{' '}
            <span className="text-amber-400 font-bold">
              {selfLimit}{type === 'percentage' ? '%' : '₾'}
            </span>
            {' · '}მაქს:{' '}
            <span className="text-slate-300 font-bold">
              {maxLimit}{type === 'percentage' ? '%' : '₾'}
            </span>
          </p>
        </div>
      )}

      {/* Type toggle */}
      <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
        {(['percentage', 'fixed'] as DiscountType[]).map(t => (
          <button key={t} onClick={() => { setType(t); setValue('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
              text-sm font-bold transition-all
              ${type === t ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-slate-200'}`}>
            {t === 'percentage' ? <Percent size={15} /> : <Tag size={15} />}
            {t === 'percentage' ? 'პროცენტი' : 'ფიქსირებული'}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className={`rounded-2xl border-2 p-4 transition-colors
        ${overLimit
          ? 'border-rose-500/50 bg-rose-950/20'
          : needsPin
            ? 'border-amber-500/40 bg-amber-950/20'
            : 'border-slate-700 bg-slate-800/50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-slate-600">
            {type === 'percentage' ? '%' : '₾'}
          </span>
          <input
            type="number" min="0" max={maxLimit}
            step={type === 'percentage' ? '0.5' : '0.01'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0"
            autoFocus
            className="flex-1 bg-transparent text-4xl font-black text-white tabular-nums
              focus:outline-none placeholder-slate-700 w-0 min-w-0"
          />
          {numVal > 0 && !overLimit && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-500">ფასდ.</p>
              <p className="text-lg font-black text-amber-400 tabular-nums">
                −₾{fmt(discAmt)}
              </p>
            </div>
          )}
        </div>

        {numVal > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center">
            <span className="text-xs text-slate-500">ახალი ჯამი</span>
            <span className="text-xl font-black text-white tabular-nums">
              ₾{fmt(newTotal)}
            </span>
          </div>
        )}

        {overLimit && numVal > 0 && (
          <div className="mt-2 flex items-center gap-2 text-rose-400 text-xs">
            <Ban size={12} />
            <span>ლიმიტი: მაქს {maxLimit}{type === 'percentage' ? '%' : '₾'}</span>
          </div>
        )}
        {needsPin && !overLimit && numVal > 0 && (
          <div className="mt-2 flex items-center gap-2 text-amber-400 text-xs">
            <KeyRound size={12} />
            <span>მენეჯერის PIN საჭიროა</span>
          </div>
        )}
        {!needsPin && numVal > 0 && !overLimit && (
          <div className="mt-2 flex items-center gap-2 text-emerald-400 text-xs">
            <LockOpen size={12} />
            <span>PIN-ის გარეშე — ლიმიტის ფარგლებში</span>
          </div>
        )}
      </div>

      {/* Reason */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">მიზეზი</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {visibleReasons.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all
                ${reason === r
                  ? 'bg-amber-500 text-black border-amber-500 font-bold'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'}`}>
              {r}
            </button>
          ))}
          <button onClick={() => setShowAll(s => !s)}
            className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1 px-2">
            {showAll ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {showAll ? 'ნაკლები' : 'მეტი'}
          </button>
        </div>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="ან მიუთითეთ სხვა..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5
            text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
        />
      </div>

      <button
        onClick={() => onSubmit({
          discount_type: type, discount_value: numVal,
          cart_total: cartTotal, reason,
        })}
        disabled={!numVal || overLimit || !reason || busy}
        className={`w-full py-4 rounded-2xl font-black text-base transition-all
          flex items-center justify-center gap-2 disabled:opacity-30
          ${needsPin
            ? 'bg-amber-500 hover:bg-amber-400 text-black'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
        {busy
          ? <Loader2 size={18} className="animate-spin" />
          : needsPin
            ? <><KeyRound size={18} /> PIN-ის მოთხოვნა</>
            : <><LockOpen size={18} /> ფასდაკლების გამოყენება</>}
      </button>
    </div>
  )
}

// ─── Approved screen ──────────────────────────────────────────

function ApprovedScreen({
  result, onApply,
}: {
  result:  ApprovedDiscount
  onApply: (r: ApprovedDiscount) => void
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/30
        flex items-center justify-center">
        <BadgeCheck size={40} className="text-emerald-400" />
      </div>
      <div>
        <p className="text-white font-black text-xl">დადასტურდა</p>
        <p className="text-slate-400 text-sm mt-1">
          {result.approver_name ? `${result.approver_name} · PIN ✓` : 'ავტო-დადასტურება'}
        </p>
      </div>
      <div className="bg-slate-800 rounded-2xl p-5 w-full">
        <p className="text-4xl font-black text-emerald-400 tabular-nums mb-1">
          {result.discount_type === 'percentage'
            ? `${result.discount_value}%`
            : `₾${fmt(result.discount_value)}`}
        </p>
        <p className="text-slate-500 text-sm">−₾{fmt(result.discount_amount)} კალათიდან</p>
      </div>
      <button onClick={() => onApply(result)}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black
          rounded-2xl transition-colors flex items-center justify-center gap-2">
        <BadgeCheck size={20} />
        კალათაზე გამოყენება
      </button>
    </div>
  )
}

// ─── Denied screen ────────────────────────────────────────────

function DeniedScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className="w-20 h-20 rounded-full bg-rose-500/20 ring-4 ring-rose-500/30
        flex items-center justify-center">
        <Ban size={40} className="text-rose-400" />
      </div>
      <div>
        <p className="text-white font-black text-xl">უარყოფილია</p>
        <p className="text-slate-400 text-sm mt-1">მენეჯერმა უარი თქვა</p>
      </div>
      <button onClick={onClose}
        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold
          rounded-2xl transition-colors">
        დახურვა
      </button>
    </div>
  )
}

// ─── MAIN MODAL ───────────────────────────────────────────────

interface DiscountAuthModalProps {
  cartTotal:   number
  sessionId:   string | null
  cashierRole: string
  onApply:     (result: ApprovedDiscount) => void
  onClose:     () => void
}

export default function DiscountAuthModal({
  cartTotal, sessionId, cashierRole, onApply, onClose,
}: DiscountAuthModalProps) {
  const { tenantId } = useTenant()
  const { user }     = useAuth()

  const flow = useDiscountAuthFlow(
    cartTotal, sessionId, cashierRole,
    tenantId, user?.id ?? '',
  )

  return (
    <>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.88)' }}>
        <div className="w-full max-w-sm bg-[#0c0e12] border border-slate-700/60
          rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                flow.step === 'approved' ? 'bg-emerald-500' :
                flow.step === 'denied'   ? 'bg-rose-500'    :
                flow.step === 'pin'      ? 'bg-amber-500 animate-pulse' :
                                           'bg-slate-600'}`} />
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {flow.step === 'input'    ? 'ფასდაკლება' :
                 flow.step === 'pin'      ? 'PIN ავტ.' :
                 flow.step === 'approved' ? 'დადასტ.' : 'უარყ.'}
              </span>
            </div>
            {flow.step !== 'approved' && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700
                  flex items-center justify-center transition-colors">
                <X size={15} className="text-slate-400" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3">
            {flow.step === 'input' && (
              <InputStep
                cartTotal={cartTotal}
                cashierRole={cashierRole}
                tenantId={tenantId}
                onSubmit={flow.submitRequest}
                busy={flow.busy}
              />
            )}
            {flow.step === 'pin' && (
              <PinPad
                onComplete={flow.submitPin}
                onCancel={() => flow.deny('კასიერმა გააუქმა')}
                error={flow.pinError}
                busy={flow.busy}
                attempts={flow.attempts}
              />
            )}
            {flow.step === 'approved' && flow.approved && (
              <ApprovedScreen
                result={flow.approved}
                onApply={(r) => { onApply(r); onClose() }}
              />
            )}
            {flow.step === 'denied' && (
              <DeniedScreen onClose={onClose} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
