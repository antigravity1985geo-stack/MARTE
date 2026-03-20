// components/POSDiscountIntegration.tsx
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Percent, Tag, X } from 'lucide-react'
import { supabase }  from '@/lib/supabase'
import { useTenant } from '@/hooks/useTenant'
import toast from 'react-hot-toast'

// ─── Types (self-contained — no external type imports needed) ─

type DiscountType = 'percentage' | 'fixed'

export interface ApprovedDiscount {
  audit_id:         string
  discount_type:    DiscountType
  discount_value:   number
  discount_amount:  number
  approver_name:    string | null
  is_self_approved: boolean
}

interface DiscountPolicy {
  id:             string
  tenant_id:      string
  role:           string
  discount_type:  DiscountType
  self_limit:     number
  override_limit: number
  requires_pin:   boolean
  is_active:      boolean
}

// ─── Utils ────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

// ─── 1. Discount button for POS toolbar ──────────────────────

interface DiscountButtonProps {
  cartTotal:    number
  hasDiscount:  boolean
  discountAmt?: number
  onPress:      () => void
  onRemove?:    () => void
}

export function DiscountButton({
  cartTotal, hasDiscount, discountAmt, onPress, onRemove,
}: DiscountButtonProps) {
  if (hasDiscount && discountAmt != null) {
    return (
      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200
        rounded-xl px-3 py-2">
        <Percent size={13} className="text-amber-600" />
        <span className="text-xs font-bold text-amber-700 tabular-nums">
          −₾{fmt(discountAmt)}
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-0.5 w-4 h-4 rounded-full bg-amber-200 flex items-center
              justify-center hover:bg-amber-300 transition-colors"
          >
            <X size={9} className="text-amber-700" />
          </button>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={onPress}
      disabled={cartTotal <= 0}
      className="flex items-center gap-2 px-3 py-2 border border-slate-200
        rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300
        transition-colors disabled:opacity-30"
    >
      <Tag size={15} />
      <span className="text-sm font-semibold">ფასდ.</span>
    </button>
  )
}

// ─── 2. Cart discount line ────────────────────────────────────

export function CartDiscountLine({
  discount,
}: {
  discount: ApprovedDiscount
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100">
      <div className="flex items-center gap-2">
        <Percent size={13} className="text-amber-500" />
        <div>
          <p className="text-sm text-amber-700 font-semibold">
            ფასდაკლება{' '}
            {discount.discount_type === 'percentage'
              ? `(${discount.discount_value}%)`
              : '(ფიქს.)'}
          </p>
          {discount.approver_name && (
            <p className="text-xs text-slate-400">
              დადასტ: {discount.approver_name}
            </p>
          )}
          {discount.is_self_approved && (
            <p className="text-xs text-blue-400">ავტო-დადასტ.</p>
          )}
        </div>
      </div>
      <span className="text-sm font-bold text-amber-600 tabular-nums">
        −₾{fmt(discount.discount_amount)}
      </span>
    </div>
  )
}

// ─── 3. Admin: discount policies table ───────────────────────

const ROLES: string[]         = ['cashier', 'supervisor', 'manager', 'admin']
const TYPES: DiscountType[]   = ['percentage', 'fixed']

export function DiscountPoliciesAdmin() {
  const { tenantId }              = useTenant()
  const [policies, setPolicies]   = useState<DiscountPolicy[]>([])
  const [loading,  setLoading]    = useState(true)
  const [saving,   setSaving]     = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('discount_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .then(({ data }) => {
        setPolicies((data ?? []) as DiscountPolicy[])
        setLoading(false)
      })
  }, [tenantId])

  const getPolicy = useCallback(
    (role: string, type: DiscountType) =>
      policies.find(p => p.role === role && p.discount_type === type) ?? null,
    [policies]
  )

  const updateField = useCallback(async (
    role:  string,
    type:  DiscountType,
    field: string,
    value: number | boolean,
  ) => {
    const existing = getPolicy(role, type)
    const key      = `${role}-${type}`
    setSaving(key)

    if (existing) {
      const { error } = await supabase
        .from('discount_policies')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (!error) {
        setPolicies(prev =>
          prev.map(p => p.id === existing.id ? { ...p, [field]: value } : p)
        )
      }
    } else {
      const base = {
        tenant_id:       tenantId,
        role,
        discount_type:   type,
        self_limit:      0,
        override_limit:  0,
        requires_pin:    true,
        requires_reason: true,
        is_active:       true,
        [field]:         value,
      }
      const { data, error } = await supabase
        .from('discount_policies')
        .insert(base)
        .select()
        .single()

      if (!error && data) setPolicies(prev => [...prev, data as DiscountPolicy])
    }

    setSaving(null)
    toast.success('შენახულია')
  }, [tenantId, getPolicy])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">ფასდაკლების ლიმიტები</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          თვით-ლიმიტი = PIN-ის გარეშე · მაქს = PIN-ით
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 text-xs text-slate-500 font-semibold">
                როლი / ტიპი
              </th>
              <th className="text-center px-3 py-2.5 text-xs text-slate-500 font-semibold">
                თვითლიმ.
              </th>
              <th className="text-center px-3 py-2.5 text-xs text-slate-500 font-semibold">
                მაქს (PIN)
              </th>
              <th className="text-center px-3 py-2.5 text-xs text-slate-500 font-semibold">
                PIN?
              </th>
            </tr>
          </thead>
          <tbody>
            {ROLES.flatMap(role =>
              TYPES.map(type => {
                const p   = getPolicy(role, type)
                const key = `${role}-${type}`
                return (
                  <tr key={key} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-slate-700 capitalize">{role}</span>
                      <span className="ml-2 text-[10px] text-slate-400 bg-slate-100
                        px-1.5 py-0.5 rounded-full">
                        {type === 'percentage' ? '%' : '₾'}
                      </span>
                      {saving === key && (
                        <Loader2 size={10} className="inline ml-2 animate-spin text-slate-400" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={p?.self_limit ?? 0}
                        onBlur={e =>
                          updateField(role, type, 'self_limit', parseFloat(e.target.value) || 0)
                        }
                        className="w-16 border border-slate-200 rounded-lg px-2 py-1
                          text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={p?.override_limit ?? 0}
                        onBlur={e =>
                          updateField(role, type, 'override_limit', parseFloat(e.target.value) || 0)
                        }
                        className="w-16 border border-slate-200 rounded-lg px-2 py-1
                          text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        defaultChecked={p?.requires_pin ?? true}
                        onChange={e =>
                          updateField(role, type, 'requires_pin', e.target.checked)
                        }
                        className="w-4 h-4 accent-slate-800"
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── 4. Usage example (comments only) ────────────────────────
//
// In POSPage.tsx:
//
//   import DiscountAuthModal, { ApprovedDiscount } from './DiscountAuthModal'
//   import { DiscountButton, CartDiscountLine }     from './POSDiscountIntegration'
//
//   const [discount,     setDiscount]     = useState<ApprovedDiscount | null>(null)
//   const [showDiscount, setShowDiscount] = useState(false)
//
//   // Toolbar:
//   <DiscountButton
//     cartTotal={cartTotal}
//     hasDiscount={!!discount}
//     discountAmt={discount?.discount_amount}
//     onPress={() => setShowDiscount(true)}
//     onRemove={() => setDiscount(null)}
//   />
//
//   // Cart summary:
//   {discount && <CartDiscountLine discount={discount} />}
//   const finalTotal = cartTotal - (discount?.discount_amount ?? 0)
//
//   // Modal:
//   {showDiscount && (
//     <DiscountAuthModal
//       cartTotal={cartTotal}
//       sessionId={drawerSession?.id ?? null}
//       cashierRole={userRole}
//       onApply={(r) => { setDiscount(r); setShowDiscount(false) }}
//       onClose={() => setShowDiscount(false)}
//     />
//   )}
//
//   // After transaction saved:
//   if (discount) {
//     await supabase.from('discount_audit_logs')
//       .update({ transaction_id: savedTx.id })
//       .eq('id', discount.audit_id)
//     setDiscount(null)
//   }
