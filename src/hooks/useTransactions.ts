import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupabaseTransaction {
  id: string;
  user_id: string;
  type: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number;
  price: number;
  total: number;
  client_id: string | null;
  client_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  date: string;
  payment_method: string;
  status: string;
  cashier_id: string | null;
  coupon_discount: number;
  loyalty_discount: number;
  created_at: string;
}

export interface SupabaseTransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface TransactionWithItems extends SupabaseTransaction {
  items: SupabaseTransactionItem[];
}

export function useTransactions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        items: t.transaction_items || [],
      })) as TransactionWithItems[];
    },
  });

  const addTransaction = useMutation({
    mutationFn: async (tx: {
      type: string;
      total: number;
      date: string;
      payment_method?: string;
      status?: string;
      cashier_id?: string;
      client_id?: string;
      client_name?: string;
      supplier_id?: string;
      supplier_name?: string;
      product_id?: string;
      product_name?: string;
      quantity?: number;
      price?: number;
      coupon_discount?: number;
      loyalty_discount?: number;
      items?: { product_id: string; name: string; price: number; quantity: number }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');

      const { items, ...txData } = tx;
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...txData,
          user_id: user.id,
          payment_method: tx.payment_method || 'cash',
          status: tx.status || 'completed',
          quantity: tx.quantity || 0,
          price: tx.price || 0,
          coupon_discount: tx.coupon_discount || 0,
          loyalty_discount: tx.loyalty_discount || 0,
        })
        .select()
        .single();
      if (error) throw error;

      if (items && items.length > 0) {
        const { error: itemsError } = await supabase
          .from('transaction_items')
          .insert(items.map((item) => ({ ...item, transaction_id: data.id })));
        if (itemsError) throw itemsError;
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SupabaseTransaction> }) => {
      const { error } = await supabase.from('transactions').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });

  return {
    transactions: query.data || [],
    isLoading: query.isLoading,
    addTransaction,
    updateTransaction,
  };
}
