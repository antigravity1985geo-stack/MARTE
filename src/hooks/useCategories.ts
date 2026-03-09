import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { offlineQueue } from '@/lib/offlineQueue';

export interface SupabaseCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface SupabaseSubcategory {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  created_at: string;
}

export function useCategories() {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await offlineQueue.getCachedCategories();
        if (cached.length > 0) return cached as SupabaseCategory[];
      }

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        const cached = await offlineQueue.getCachedCategories();
        if (cached.length > 0) return cached as SupabaseCategory[];
        throw error;
      }

      if (data) {
        await offlineQueue.cacheCategories(data);
      }

      return data as SupabaseCategory[];
    },
  });

  const subcategoriesQuery = useQuery({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as SupabaseSubcategory[];
    },
  });

  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { error } = await supabase.from('categories').insert({ name, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('categories').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const addSubcategory = useMutation({
    mutationFn: async ({ name, categoryId }: { name: string; categoryId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { error } = await supabase.from('subcategories').insert({ name, category_id: categoryId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subcategories'] }),
  });

  const deleteSubcategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subcategories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subcategories'] }),
  });

  const updateSubcategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('subcategories').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subcategories'] }),
  });

  return {
    categories: categoriesQuery.data || [],
    subcategories: subcategoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  };
}
