// src/hooks/useCashDrawer.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  CashDrawer,
  CashDrawerSession,
  CashDrawerTransaction,
  SessionSummary,
  TransactionType,
} from '@/types/cashDrawer';
import { toast } from 'sonner';

// ─── Active session ────────────────────────────────────────────────────────────

export function useActiveSession(drawerId: string) {
  const [session, setSession] = useState<CashDrawerSession | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!drawerId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from('cash_drawer_sessions')
      .select('*, drawer:cash_drawers(name, location)')
      .eq('drawer_id', drawerId)
      .eq('status', 'open')
      .maybeSingle();

    if (error) console.error(error);
    setSession(data as any);
    setLoading(false);
  }, [drawerId]);

  useEffect(() => {
    fetch();

    if (!drawerId) return;

    // Realtime subscription
    const sub = supabase
      .channel(`session:${drawerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cash_drawer_sessions',
        filter: `drawer_id=eq.${drawerId}`,
      }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [drawerId, fetch]);

  return { session, loading, refetch: fetch };
}

// ─── Session transactions ───────────────────────────────────────────────────────

export function useSessionTransactions(sessionId: string | null) {
  const [transactions, setTransactions] = useState<CashDrawerTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cash_drawer_transactions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    setTransactions((data as any) ?? []);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetch();

    if (!sessionId) return;
    const sub = supabase
      .channel(`tx:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cash_drawer_transactions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setTransactions(prev => [...prev, payload.new as CashDrawerTransaction]);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [sessionId, fetch]);

  return { transactions, loading, refetch: fetch };
}

// ─── Session summary computed from transactions ─────────────────────────────────

export function useSessionSummary(
  transactions: CashDrawerTransaction[],
  declaredCash?: number | null
): SessionSummary {
  const sum = (types: TransactionType[]) =>
    transactions
      .filter(t => types.includes(t.type as TransactionType))
      .reduce((acc, t) => acc + Number(t.amount), 0);

  const opening_float = sum(['opening_float']);
  const total_sales = sum(['sale']);
  const total_refunds = sum(['refund']);
  const total_cash_in = sum(['cash_in']);
  const total_cash_out = sum(['cash_out']);
  const expected_cash = opening_float + total_sales - total_refunds + total_cash_in - total_cash_out;

  return {
    opening_float,
    total_sales,
    total_refunds,
    total_cash_in,
    total_cash_out,
    expected_cash,
    declared_cash: declaredCash ?? null,
    variance: declaredCash != null ? declaredCash - expected_cash : null,
  };
}

// ─── Actions ────────────────────────────────────────────────────────────────────

export function useCashDrawerActions(tenantId: string) {
  const user = useAuthStore(s => s.user);
  const [busy, setBusy] = useState(false);

  // Open a new session
  const openSession = useCallback(async (
    drawerId: string,
    openingFloat: number,
    notes?: string
  ): Promise<CashDrawerSession | null> => {
    setBusy(true);
    try {
      if (!user) throw new Error('მომხმარებელი არ მოიძებნა');
      
      // Create session
      const { data: session, error: se } = await supabase
        .from('cash_drawer_sessions')
        .insert({
          tenant_id: tenantId,
          drawer_id: drawerId,
          opened_by: user.id,
          opening_float: openingFloat,
          opening_notes: notes ?? null,
          status: 'open',
        })
        .select()
        .single();

      if (se) throw se;

      // Record opening float transaction
      const { error: te } = await supabase
        .from('cash_drawer_transactions')
        .insert({
          tenant_id: tenantId,
          session_id: session.id,
          drawer_id: drawerId,
          type: 'opening_float',
          amount: openingFloat,
          performed_by: user.id,
          note: notes ?? null,
        });

      if (te) throw te;

      toast.success('სალარო გახსნილია');
      return session as any;
    } catch (err: any) {
      toast.error(err.message ?? 'შეცდომა სალაროს გახსნისას');
      return null;
    } finally {
      setBusy(false);
    }
  }, [tenantId, user]);

  // Add a manual cash movement (cash_in / cash_out)
  const addManualTransaction = useCallback(async (
    sessionId: string,
    drawerId: string,
    type: 'cash_in' | 'cash_out',
    amount: number,
    note: string
  ): Promise<boolean> => {
    setBusy(true);
    try {
      if (!user) throw new Error('User not found');
      const { error } = await supabase
        .from('cash_drawer_transactions')
        .insert({
          tenant_id: tenantId,
          session_id: sessionId,
          drawer_id: drawerId,
          type,
          amount,
          performed_by: user.id,
          note,
        });

      if (error) throw error;
      toast.success(type === 'cash_in' ? 'ნაღდი დამატებულია' : 'ნაღდი ამოღებულია');
      return true;
    } catch (err: any) {
      toast.error(err.message ?? 'შეცდომა');
      return false;
    } finally {
      setBusy(false);
    }
  }, [tenantId, user]);

  // Record a sale (called from POS on cash payment)
  const recordSale = useCallback(async (
    sessionId: string,
    drawerId: string,
    amount: number,
    referenceId?: string
  ): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from('cash_drawer_transactions')
      .insert({
        tenant_id: tenantId,
        session_id: sessionId,
        drawer_id: drawerId,
        type: 'sale',
        amount,
        reference_id: referenceId ?? null,
        performed_by: user.id,
      });
    if (error) { console.error(error); return false; }
    return true;
  }, [tenantId, user]);

  // Record a refund
  const recordRefund = useCallback(async (
    sessionId: string,
    drawerId: string,
    amount: number,
    referenceId?: string
  ): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from('cash_drawer_transactions')
      .insert({
        tenant_id: tenantId,
        session_id: sessionId,
        drawer_id: drawerId,
        type: 'refund',
        amount,
        reference_id: referenceId ?? null,
        performed_by: user.id,
      });
    if (error) { console.error(error); return false; }
    return true;
  }, [tenantId, user]);

  // Close session via RPC
  const closeSession = useCallback(async (
    sessionId: string,
    declaredAmount: number,
    notes?: string
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('close_cash_drawer_session', {
        p_session_id: sessionId,
        p_declared_amount: declaredAmount,
        p_closing_notes: notes ?? null,
      });
      if (error) throw error;
      toast.success('სალარო დახურულია');
      return true;
    } catch (err: any) {
      toast.error(err.message ?? 'შეცდომა სალაროს დახურვისას');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { openSession, addManualTransaction, recordSale, recordRefund, closeSession, busy };
}

// ─── Session history ────────────────────────────────────────────────────────────

export function useSessionHistory(drawerId: string, limit = 20) {
  const [sessions, setSessions] = useState<CashDrawerSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!drawerId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    supabase
      .from('cash_drawer_sessions')
      .select('*')
      .eq('drawer_id', drawerId)
      .order('opened_at', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (error) console.error(error);
        setSessions((data as any) ?? []);
        setLoading(false);
      });
  }, [drawerId, limit]);

  return { sessions, loading };
}

// ─── Drawers list ───────────────────────────────────────────────────────────────

export function useDrawers() {
  const [drawers, setDrawers] = useState<CashDrawer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('cash_drawers')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (error) console.error(error);
        setDrawers((data as any) ?? []);
        setLoading(false);
      });
  }, []);

  return { drawers, loading };
}
