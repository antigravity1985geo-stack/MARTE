import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  type: 'payment' | 'debt';
  method: 'cash' | 'transfer' | 'card';
  description?: string;
  reference_number?: string;
  date: string;
  created_at?: string;
}

export interface SupplierBalance {
  supplier_id: string;
  supplier_name: string;
  total_debt: number;
  total_paid: number;
  balance: number;
}

export function useSupplierPayments() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const query = useQuery({
    queryKey: ['supplier_payments'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('supplier_payments')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      return data as SupplierPayment[];
    },
    enabled: !!user,
  });

  const addPaymentData = useMutation({
    mutationFn: async (payment: Omit<SupplierPayment, 'id' | 'created_at'>) => {
      const { error } = await supabase
        .from('supplier_payments')
        .insert({ 
          ...payment,
          user_id: user?.id
        });
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_payments'] });
    },
  });

  const deletePaymentData = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('supplier_payments')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_payments'] });
    },
  });

  // Calculate balances from the cached query data
  const payments = query.data || [];

  const addPayment = (payment: any) => addPaymentData.mutate({ ...payment, type: 'payment' });
  const addDebt = (debt: any) => addPaymentData.mutate({ ...debt, type: 'debt' });
  const deletePayment = (id: string) => deletePaymentData.mutate(id);

  const getBalance = (supplierId: string, totalReceived?: number) => {
    const paid = payments.filter(p => p.supplier_id === supplierId && p.type === 'payment').reduce((s, p) => s + Number(p.amount), 0);
    if (totalReceived !== undefined) return totalReceived - paid;
    const debt = payments.filter(p => p.supplier_id === supplierId && p.type === 'debt').reduce((s, p) => s + Number(p.amount), 0);
    return debt - paid;
  };

  const getSupplierBalance = (supplierId: string): SupplierBalance => {
    const supplierPayments = payments.filter(p => p.supplier_id === supplierId);
    const total_debt = supplierPayments.filter(p => p.type === 'debt').reduce((s, p) => s + Number(p.amount), 0);
    const total_paid = supplierPayments.filter(p => p.type === 'payment').reduce((s, p) => s + Number(p.amount), 0);
    const supplier_name = supplierPayments[0]?.supplier_name || '';
    return { supplier_id: supplierId, supplier_name, total_debt, total_paid, balance: total_debt - total_paid };
  };

  const getAllBalances = (): SupplierBalance[] => {
    const supplierIds = [...new Set(payments.map(p => p.supplier_id))];
    return supplierIds.map(id => getSupplierBalance(id));
  };

  const getPaymentHistory = (supplierId: string) => {
    return payments.filter(p => p.supplier_id === supplierId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return {
    payments,
    isLoading: query.isLoading,
    error: query.error,
    addPayment,
    addDebt,
    deletePayment,
    getBalance,
    getSupplierBalance,
    getAllBalances,
    getPaymentHistory,
  };
}
