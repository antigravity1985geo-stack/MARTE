import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';

export interface SupabaseSupplier {
  id: string;
  user_id: string;
  name: string;
  tin: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  total_orders: number;
  created_at: string;
}

export function useSuppliers() {
  const queryClient = useQueryClient();
  const { log } = useActivityLog();

  const query = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as SupabaseSupplier[];
    },
  });

  const addSupplier = useMutation({
    mutationFn: async (supplier: { name: string; tin: string; contact_person: string; phone: string; email: string; address: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { error } = await supabase.from('suppliers').insert({ ...supplier, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      log({ action: 'create', entityType: 'supplier' });
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SupabaseSupplier> }) => {
      const { error } = await supabase.from('suppliers').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      log({ action: 'update', entityType: 'supplier', entityId: vars.id });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      log({ action: 'delete', entityType: 'supplier', entityId: id });
    },
  });

  return {
    suppliers: query.data || [],
    isLoading: query.isLoading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
