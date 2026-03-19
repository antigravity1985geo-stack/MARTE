import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import { offlineQueue } from '@/lib/offlineQueue';

export interface SupabaseProduct {
  id: string;
  name: string;
  barcode: string;
  buy_price: number;
  sell_price: number;
  category_id: string | null;
  unit: string;
  stock: number;
  min_stock: number;
  images: string[];
  warehouse_id: string | null;
  user_id: string;
  created_at: string;
  description?: string;
  name_en?: string;
  name_ru?: string;
  name_az?: string;
  description_en?: string;
  description_ru?: string;
  description_az?: string;
  type?: 'product' | 'service';
}

export type ProductInsert = Omit<SupabaseProduct, 'id' | 'created_at' | 'user_id'>;
export type ProductUpdate = Partial<ProductInsert>;

export function useProducts() {
  const queryClient = useQueryClient();
  const { log } = useActivityLog();

  const query = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await offlineQueue.getCachedProducts();
        if (cached.length > 0) return cached as SupabaseProduct[];
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const cached = await offlineQueue.getCachedProducts();
        if (cached.length > 0) return cached as SupabaseProduct[];
        throw error;
      }

      if (data) {
        await offlineQueue.cacheProducts(data);
      }

      return data as SupabaseProduct[];
    },
  });

  const addProduct = useMutation({
    mutationFn: async (product: ProductInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      log({ action: 'create', entityType: 'product', entityId: data?.id, entityName: data?.name });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProductUpdate }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      log({ action: 'update', entityType: 'product', entityId: data?.id, entityName: data?.name });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      log({ action: 'delete', entityType: 'product', entityId: id });
    },
  });

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
