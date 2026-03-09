import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Warehouse {
  id: string;
  user_id: string;
  name: string;
  address: string;
  location: string;
  is_default: boolean;
  created_at: string;
}

export interface WriteOff {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  reason: string;
  warehouse_id: string | null;
  date: string;
}

export interface Transfer {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  note: string;
  date: string;
}

export interface Currency {
  id: string;
  user_id: string;
  code: string;
  name: string;
  rate: number;
  symbol: string;
}

export function useWarehouses() {
  const queryClient = useQueryClient();

  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Warehouse[];
    },
  });

  const writeOffsQuery = useQuery({
    queryKey: ['write_offs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('write_offs').select('*').order('date', { ascending: false });
      if (error) throw error;
      return (data || []) as WriteOff[];
    },
  });

  const transfersQuery = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transfers').select('*').order('date', { ascending: false });
      if (error) throw error;
      return (data || []) as Transfer[];
    },
  });

  const currenciesQuery = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('currencies').select('*').order('code');
      if (error) throw error;
      if (data && data.length === 0) {
        // Insert defaults
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const defaults = [
            { user_id: user.id, code: 'GEL', name: 'ქართული ლარი', rate: 1, symbol: '₾' },
            { user_id: user.id, code: 'USD', name: 'აშშ დოლარი', rate: 2.72, symbol: '$' },
            { user_id: user.id, code: 'EUR', name: 'ევრო', rate: 2.95, symbol: '€' },
          ];
          const { data: inserted } = await supabase.from('currencies').insert(defaults).select();
          return (inserted || []) as Currency[];
        }
      }
      return (data || []) as Currency[];
    },
  });

  const addWarehouse = useMutation({
    mutationFn: async (wh: { name: string; location?: string; address?: string; is_default?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { data, error } = await supabase.from('warehouses').insert({ ...wh, user_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
  });

  const deleteWarehouse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
  });

  const addWriteOff = useMutation({
    mutationFn: async (wo: { product_id: string; product_name: string; quantity: number; reason: string; warehouse_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { data, error } = await supabase.from('write_offs').insert({ ...wo, user_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['write_offs'] }),
  });

  const addTransfer = useMutation({
    mutationFn: async (tr: { product_id: string; product_name: string; quantity: number; from_warehouse_id: string; to_warehouse_id: string; note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');

      // Use RPC for atomic stock movement
      const { data, error } = await supabase.rpc('process_transfer', {
        p_product_id: tr.product_id,
        p_from_warehouse_id: tr.from_warehouse_id,
        p_to_warehouse_id: tr.to_warehouse_id,
        p_quantity: tr.quantity,
        p_user_id: user.id
      });

      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateCurrency = useMutation({
    mutationFn: async ({ code, rate }: { code: string; rate: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { error } = await supabase.from('currencies').update({ rate }).eq('code', code).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currencies'] }),
  });

  return {
    warehouses: warehousesQuery.data || [],
    writeOffs: writeOffsQuery.data || [],
    transfers: transfersQuery.data || [],
    currencies: currenciesQuery.data || [],
    isLoading: warehousesQuery.isLoading,
    addWarehouse,
    deleteWarehouse,
    addWriteOff,
    addTransfer,
    updateCurrency,
  };
}
