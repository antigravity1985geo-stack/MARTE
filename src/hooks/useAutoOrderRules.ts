import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { create } from 'zustand';

// Global enabled state (session-only, no DB needed)
interface AutoOrderGlobalState {
  globalEnabled: boolean;
  setGlobalEnabled: (v: boolean) => void;
}
export const useAutoOrderGlobal = create<AutoOrderGlobalState>((set) => ({
  globalEnabled: true,
  setGlobalEnabled: (v) => set({ globalEnabled: v }),
}));

export interface AutoOrderRule {
  id: string;
  user_id: string;
  product_id: string;
  supplier_id: string;
  order_quantity: number;
  enabled: boolean;
  created_at: string;
}

export interface AutoOrderHistoryEntry {
  id: string;
  user_id: string;
  rule_id: string | null;
  product_id: string | null;
  product_name: string;
  supplier_id: string | null;
  supplier_name: string;
  quantity: number;
  total_amount: number;
  order_id: string | null;
  date: string;
}

export function useAutoOrderRules() {
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ['auto_order_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('auto_order_rules').select('*').order('created_at');
      if (error) throw error;
      return (data || []) as AutoOrderRule[];
    },
  });

  const historyQuery = useQuery({
    queryKey: ['auto_order_history'],
    queryFn: async () => {
      const { data, error } = await supabase.from('auto_order_history').select('*').order('date', { ascending: false }).limit(100);
      if (error) throw error;
      return (data || []) as AutoOrderHistoryEntry[];
    },
  });

  const addRule = useMutation({
    mutationFn: async (rule: { product_id: string; supplier_id: string; order_quantity: number; enabled?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { data, error } = await supabase.from('auto_order_rules').insert({ ...rule, user_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auto_order_rules'] }),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AutoOrderRule> }) => {
      const { error } = await supabase.from('auto_order_rules').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auto_order_rules'] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('auto_order_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auto_order_rules'] }),
  });

  const addHistoryEntry = useMutation({
    mutationFn: async (entry: { rule_id?: string; product_id: string; product_name: string; supplier_id: string; supplier_name: string; quantity: number; total_amount: number; order_id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { data, error } = await supabase.from('auto_order_history').insert({ ...entry, user_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auto_order_history'] }),
  });

  return {
    rules: (rulesQuery.data || []).map(r => ({
      id: r.id,
      productId: r.product_id,
      supplierId: r.supplier_id,
      orderQuantity: r.order_quantity,
      enabled: r.enabled,
    })),
    history: (historyQuery.data || []).map(h => ({
      id: h.id,
      ruleId: h.rule_id || '',
      productId: h.product_id || '',
      productName: h.product_name,
      supplierId: h.supplier_id || '',
      supplierName: h.supplier_name,
      quantity: h.quantity,
      totalAmount: h.total_amount,
      date: h.date,
      orderId: h.order_id || '',
    })),
    isLoading: rulesQuery.isLoading,
    addRule,
    updateRule,
    deleteRule,
    addHistoryEntry,
  };
}
