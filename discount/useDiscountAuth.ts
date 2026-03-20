// hooks/useDiscountAuth.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth }  from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import {
  DiscountPolicy,
  DiscountAuditLog,
  PinVerifyResult,
  DiscountRequest,
  DiscountResult,
  computeDiscountAmount,
  needsOverride,
  exceedsHardLimit,
} from '@/types/discountAuth'
import toast from 'react-hot-toast'

// ─── Load policy for current user's role ─────────────────────

export function useMyDiscountPolicy() {
  const { user }         = useAuth()
  const { tenantId }     = useTenant()
  const [policy,  setPolicy]  = useState<DiscountPolicy | null>(null)
  const [myRole,  setMyRole]  = useState<string>('cashier')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !tenantId) return
    ;(async () => {
      // Get user role
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      const role = roleRow?.role ?? 'cashier'
      setMyRole(role)

      // Get policy for that role
      const { data } = await supabase
        .from('discount_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role_name', role)
        .eq('is_active', true)
        .maybeSingle()

      setPolicy(data ?? null)
      setLoading(false)
    })()
  }, [user, tenantId])

  return { policy, myRole, loading }
}

// ─── Load all policies (for admin settings) ──────────────────

export function useAllDiscountPolicies() {
  const { tenantId }        = useTenant()
  const [policies, setPolicies] = useState<DiscountPolicy[]>([])
  const [loading,  setLoading]  = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('discount_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('role_name')
    setPolicies(data ?? [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  const upsertPolicy = useCallback(async (p: Partial<DiscountPolicy> & { role_name: string }) => {
    const { error } = await supabase
      .from('discount_policies')
      .upsert({ ...p, tenant_id: tenantId }, { onConflict: 'tenant_id,role_name' })
    if (error) { toast.error(error.message); return false }
    toast.success('პოლიტიკა შენახულია')
    await fetch()
    return true
  }, [tenantId, fetch])

  return { policies, loading, upsertPolicy, refetch: fetch }
}

// ─── PIN verification ─────────────────────────────────────────

export function usePinVerification() {
  const { tenantId } = useTenant()
  const [verifying, setVerifying] = useState(false)

  const verifyPin = useCallback(async (pin: string): Promise<PinVerifyResult | null> => {
    setVerifying(true)
    try {
      const { data, error } = await supabase
        .rpc('verify_manager_pin', { p_tenant_id: tenantId, p_pin: pin })
      if (error) throw error
      return data as PinVerifyResult | null
    } catch (e: any) {
      return null
    } finally {
      setVerifying(false)
    }
  }, [tenantId])

  return { verifyPin, verifying }
}

// ─── Set my own PIN ───────────────────────────────────────────

export function useSetMyPin() {
  const [busy, setBusy] = useState(false)

  const setPin = useCallback(async (pin: string, role = 'manager'): Promise<boolean> => {
    if (!/^\d{4,6}$/.test(pin)) {
      toast.error('PIN უნდა იყოს 4-6 ციფრი')
      return false
    }
    setBusy(true)
    try {
      const { data, error } = await supabase
        .rpc('set_manager_pin', { p_pin: pin, p_role: role })
      if (error) throw error
      toast.success('PIN შეიცვალა')
      return true
    } catch (e: any) {
      toast.error(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  return { setPin, busy }
}

// ─── Main authorization flow ──────────────────────────────────
// Call this from POS when user tries to apply a discount.
// Returns approved/rejected + logId for attaching to transaction.

export function useDiscountAuthorization() {
  const { tenantId } = useTenant()
  const { policy, myRole } = useMyDiscountPolicy()
  const { verifyPin }      = usePinVerification()
  const [busy, setBusy]    = useState(false)

  const authorize = useCallback(async (
    request: DiscountRequest,
    overridePin?: string         // provided when modal returns PIN
  ): Promise<DiscountResult> => {
    setBusy(true)
    try {
      const discountAmt = computeDiscountAmount(
        request.type, request.value, request.originalAmount
      )
      const finalAmount = request.originalAmount - discountAmt
      const override    = needsOverride(policy, request.type, request.value)
      const hardBlock   = exceedsHardLimit(policy, request.type, request.value)

      // Hard limit — reject even with PIN
      if (hardBlock) {
        return { approved: false, discountAmount: 0, finalAmount: request.originalAmount, overrideRequired: false }
      }

      let authorizer: PinVerifyResult | undefined

      // Needs override
      if (override) {
        if (!overridePin) {
          // Signal to UI: show PIN modal
          return {
            approved:         false,
            discountAmount:   discountAmt,
            finalAmount,
            overrideRequired: true,
          }
        }
        const result = await verifyPin(overridePin)
        if (!result) {
          toast.error('არასწორი PIN')
          return { approved: false, discountAmount: 0, finalAmount: request.originalAmount, overrideRequired: true }
        }
        authorizer = result
      }

      // Log to audit
      const { data: logId } = await supabase.rpc('log_discount', {
        p_tenant_id:         tenantId,
        p_scope:             request.scope,
        p_discount_type:     request.type,
        p_discount_value:    request.value,
        p_discount_amount:   discountAmt,
        p_original_amount:   request.originalAmount,
        p_override_required: override,
        p_override_by:       authorizer?.user_id ?? null,
        p_override_role:     authorizer?.role     ?? null,
        p_product_id:        request.productId    ?? null,
        p_product_name:      request.productName  ?? null,
      })

      return {
        approved:         true,
        discountAmount:   discountAmt,
        finalAmount,
        overrideRequired: override,
        authorizer,
        logId:            logId ?? undefined,
      }
    } finally {
      setBusy(false)
    }
  }, [policy, myRole, tenantId, verifyPin])

  return { authorize, policy, myRole, busy }
}

// ─── Audit log viewer ─────────────────────────────────────────

export function useDiscountAuditLog(limit = 50) {
  const { tenantId } = useTenant()
  const [logs,    setLogs]    = useState<DiscountAuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('discount_audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => { setLogs(data ?? []); setLoading(false) })
  }, [tenantId, limit])

  return { logs, loading }
}
