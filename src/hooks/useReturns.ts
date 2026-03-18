import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';

export interface ReturnRecord {
  id: string;
  type: 'supplier' | 'customer';
  date: string;
  product_id: string;
  product_name: string;
  quantity: number;
  total?: number;
  counterparty_id: string;
  counterparty_name: string;
  reason: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  created_at: string;
}

export function useReturns() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const query = useQuery({
    queryKey: ['product_returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_returns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReturnRecord[];
    },
    enabled: !!user,
  });

  const addReturn = useMutation({
    mutationFn: async (params: {
      type: 'supplier' | 'customer';
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      counterpartyId: string;
      counterpartyName: string;
      reason: string;
    }) => {
      // Step 1: Insert the return Record (Status Pending)
      const { data, error } = await supabase
        .from('product_returns')
        .insert({
          type: params.type,
          product_id: params.productId,
          product_name: params.productName,
          quantity: params.quantity,
          counterparty_id: params.counterpartyId,
          counterparty_name: params.counterpartyName,
          reason: params.reason,
          status: 'pending',
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_returns'] });
      toast.success('დაბრუნება წარმატებით დაემატა');
    },
  });

  const processReturnMutation = useMutation({
    mutationFn: async (params: {
        returnId: string;
        type: 'supplier' | 'customer';
        productId: string;
        quantity: number;
        price: number;
        counterpartyId: string;
        counterpartyName: string;
        reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { data, error } = await supabase.rpc('process_return', {
        p_return_id: params.returnId,
        p_type: params.type,
        p_product_id: params.productId,
        p_quantity: params.quantity,
        p_price: params.price,
        p_counterparty_id: params.counterpartyId,
        p_counterparty_name: params.counterpartyName,
        p_reason: params.reason,
        p_user_id: user.id,
        p_tenant_id: (user as any).active_tenant_id // This might need adjustment based on how tenant_id is stored
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'დაბრუნების პროცესი ვერ დასრულდა');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_returns'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('დაბრუნების პროცესი დასრულდა და ბალანსი განახლდა');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: ReturnRecord['status'] }) => {
      const { error } = await supabase
        .from('product_returns')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_returns'] });
      toast.success('სტატუსი განახლდა');
    },
  });

  return {
    returns: query.data || [],
    isLoading: query.isLoading,
    addReturn,
    processReturn: processReturnMutation,
    updateStatus,
  };
}
