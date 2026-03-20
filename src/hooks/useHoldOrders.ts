// src/hooks/useHoldOrders.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { HeldOrder, HoldCartInput } from '@/types/holdOrder';
import { toast } from 'sonner';

export function useHoldOrders(drawerId?: string) {
  const { activeTenantId: tenantId, user } = useAuthStore();
  const [orders, setOrders] = useState<HeldOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // ── Load active held orders ───────────────────────────────
  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase
      .from('held_orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'held')
      .order('held_at', { ascending: true });

    if (drawerId) q = q.eq('drawer_id', drawerId);

    const { data } = await q;
    setOrders((data ?? []) as HeldOrder[]);
    setLoading(false);
  }, [tenantId, drawerId]);

  // ── Realtime ──────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    load();
    const ch = supabase
      .channel('held_orders_rt')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public', 
        table: 'held_orders',
        filter: `tenant_id=eq.${tenantId}`,
      }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId, load]);

  // ── Hold current cart ─────────────────────────────────────
  const holdCart = useCallback(async (cart: HoldCartInput): Promise<HeldOrder | null> => {
    if (!tenantId || !user) return null;
    if (!cart.items.length) { toast.error('კალათა ცარიელია'); return null; }
    setBusy(true);
    const { data, error } = await supabase
      .from('held_orders')
      .insert({
        tenant_id:         tenantId,
        drawer_id:         drawerId ?? null,
        held_by:           user.id,
        label:             cart.label?.trim() || null,
        items:             cart.items as any, // Cast to any because JSONB
        subtotal:          cart.subtotal,
        discount_total:    cart.discount_total,
        tax_total:         cart.tax_total,
        total:             cart.total,
        client_id:         cart.client_id    ?? null,
        client_name:       cart.client_name  ?? null,
        discount_audit_id: cart.discount_audit_id ?? null,
        discount_amount:   cart.discount_amount   ?? null,
        notes:             cart.notes        ?? null,
        status:            'held',
      })
      .select()
      .single();

    setBusy(false);
    if (error) { toast.error(error.message); return null; }
    toast.success(`შეჩერებულია #${(data as HeldOrder).hold_number}`);
    return data as HeldOrder;
  }, [tenantId, drawerId, user]);

  // ── Resume (mark as resumed, return snapshot) ─────────────
  const resumeOrder = useCallback(async (id: string): Promise<HeldOrder | null> => {
    setBusy(true);
    const { data, error } = await supabase
      .from('held_orders')
      .update({ status: 'resumed', resumed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    setBusy(false);
    if (error) { toast.error(error.message); return null; }
    return data as HeldOrder;
  }, []);

  // ── Void ──────────────────────────────────────────────────
  const voidOrder = useCallback(async (id: string): Promise<boolean> => {
    setBusy(true);
    const { error } = await supabase
      .from('held_orders')
      .update({ status: 'voided', voided_at: new Date().toISOString() })
      .eq('id', id);

    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    toast.success('შეკვეთა გაუქმებულია');
    return true;
  }, []);

  return { orders, loading, busy, holdCart, resumeOrder, voidOrder };
}
