import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupabaseInvoice {
  id: string;
  user_id: string;
  invoice_number: string;
  transaction_id: string | null;
  client_id: string | null;
  client_name: string;
  total: number;
  status: string;
  payment_method: string;
  notes: string;
  issued_date: string;
  created_at: string;
}

export function useInvoices() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('issued_date', { ascending: false });
      if (error) throw error;
      return data as SupabaseInvoice[];
    },
  });

  const addInvoice = useMutation({
    mutationFn: async (invoice: {
      invoice_number: string;
      transaction_id?: string;
      client_id?: string;
      client_name?: string;
      total: number;
      status?: string;
      payment_method?: string;
      notes?: string;
      issued_date?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { data, error } = await supabase
        .from('invoices')
        .insert({ ...invoice, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as SupabaseInvoice;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SupabaseInvoice> }) => {
      const { error } = await supabase.from('invoices').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const getNextInvoiceNumber = (): string => {
    const invoices = query.data || [];
    const now = new Date();
    const prefix = `INV-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const existing = invoices
      .filter(inv => inv.invoice_number.startsWith(prefix))
      .map(inv => parseInt(inv.invoice_number.split('-').pop() || '0'))
      .filter(n => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}-${next.toString().padStart(4, '0')}`;
  };

  return {
    invoices: query.data || [],
    isLoading: query.isLoading,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    getNextInvoiceNumber,
  };
}
