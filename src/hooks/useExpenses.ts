import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';

export interface SupabaseExpense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
}

export function useExpenses() {
  const queryClient = useQueryClient();
  const { log } = useActivityLog();

  const query = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as SupabaseExpense[];
    },
  });

  const addExpense = useMutation({
    mutationFn: async (expense: { description: string; amount: number; category: string; date: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { error } = await supabase.from('expenses').insert({ ...expense, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      log({ action: 'create', entityType: 'expense' });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      log({ action: 'delete', entityType: 'expense', entityId: id });
    },
  });

  return {
    expenses: query.data || [],
    isLoading: query.isLoading,
    addExpense,
    deleteExpense,
  };
}
