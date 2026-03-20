// src/hooks/useDiscountAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  DiscountPolicy,
  DiscountAuditLog,
  PinVerifyResult,
  DiscountRequest,
  DiscountResult,
  computeDiscountAmount,
  needsOverride,
  exceedsHardLimit,
} from '@/types/discount';
import { toast } from 'sonner';

// ─── Load policy for current user's role ─────────────────────

export function useMyDiscountPolicy() {
  const { user, activeTenantId, tenants } = useAuthStore();
  const [policy, setPolicy] = useState<DiscountPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current user's role in this tenant from the store
  const myRole = tenants.find(t => t.id === activeTenantId)?.role || 'cashier';

  useEffect(() => {
    if (!user || !activeTenantId) return;
    
    setLoading(true);
    supabase
      .from('discount_policies')
      .select('*')
      .eq('tenant_id', activeTenantId)
      .eq('role_name', myRole)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        setPolicy(data as DiscountPolicy | null);
        setLoading(false);
      });
  }, [user?.id, activeTenantId, myRole]);

  return { policy, myRole, loading };
}

// ─── PIN verification ─────────────────────────────────────────

export function usePinVerification() {
  const { activeTenantId } = useAuthStore();
  const [verifying, setVerifying] = useState(false);

  const verifyPin = useCallback(async (pin: string): Promise<PinVerifyResult | null> => {
    if (!activeTenantId) return null;
    setVerifying(true);
    try {
      const { data, error } = await supabase
        .rpc('verify_manager_pin', { p_tenant_id: activeTenantId, p_pin: pin });
      if (error) throw error;
      return data as PinVerifyResult | null;
    } catch (e: any) {
      console.error('PIN verification failed', e);
      return null;
    } finally {
      setVerifying(false);
    }
  }, [activeTenantId]);

  return { verifyPin, verifying };
}

// ─── Set manager PIN ──────────────────────────────────────────

export function useSetManagerPin() {
  const [busy, setBusy] = useState(false);

  const setPin = useCallback(async (pin: string, role = 'manager'): Promise<boolean> => {
    if (!/^\d{4,6}$/.test(pin)) {
      toast.error('PIN უნდა იყოს 4-6 ციფრი');
      return false;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .rpc('set_manager_pin', { p_pin: pin, p_role: role });
      if (error) throw error;
      toast.success('PIN წარმატებით შეინახა');
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { setPin, busy };
}

// ─── Main authorization flow ──────────────────────────────────

export function useDiscountAuthorization() {
  const { activeTenantId } = useAuthStore();
  const { policy, myRole } = useMyDiscountPolicy();
  const { verifyPin } = usePinVerification();
  const [busy, setBusy] = useState(false);

  const authorize = useCallback(async (
    request: DiscountRequest,
    overridePin?: string
  ): Promise<DiscountResult> => {
    setBusy(true);
    try {
      const discountAmt = computeDiscountAmount(
        request.type, request.value, request.originalAmount
      );
      const finalAmount = request.originalAmount - discountAmt;
      const override = needsOverride(policy, request.type, request.value);
      const hardBlock = exceedsHardLimit(policy, request.type, request.value);

      if (hardBlock) {
        toast.error('ფასდაკლება აჭარბებს დაშვებულ მაქსიმუმს');
        return { approved: false, discountAmount: 0, finalAmount: request.originalAmount, overrideRequired: false };
      }

      let authorizer: PinVerifyResult | undefined;

      if (override) {
        if (!overridePin) {
          return {
            approved: false,
            discountAmount: discountAmt,
            finalAmount,
            overrideRequired: true,
          };
        }
        
        const result = await verifyPin(overridePin);
        if (!result) {
          toast.error('არასწორი PIN');
          return { approved: false, discountAmount: 0, finalAmount: request.originalAmount, overrideRequired: true };
        }
        authorizer = result;
      }

      // Log to audit (even if not saving transaction yet)
      const { data: logId } = await supabase.rpc('log_discount', {
        p_tenant_id: activeTenantId,
        p_scope: request.scope,
        p_discount_type: request.type,
        p_discount_value: request.value,
        p_discount_amount: discountAmt,
        p_original_amount: request.originalAmount,
        p_override_required: override,
        p_override_by: authorizer?.user_id ?? null,
        p_override_role: authorizer?.role ?? null,
        p_product_id: request.productId ?? null,
        p_product_name: request.productName ?? null,
      });

      return {
        approved: true,
        discountAmount: discountAmt,
        finalAmount,
        overrideRequired: override,
        authorizer,
        logId: logId as string || undefined,
      };
    } finally {
      setBusy(false);
    }
  }, [policy, myRole, activeTenantId, verifyPin]);

  return { authorize, policy, myRole, busy };
}
