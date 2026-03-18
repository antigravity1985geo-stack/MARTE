import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EcommercePlatform {
  id: string;
  platform_slug: string;
  name: string;
  connected: boolean;
  api_key?: string;
  store_id?: string;
  auto_sync: boolean;
  sync_interval: number;
  last_sync?: string;
}

export interface EcommerceOrder {
  id: string;
  platform_slug: string;
  platform_order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  total: number;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  created_at: string;
  synced: boolean;
}

export interface EcommerceProductMapping {
  id: string;
  local_product_id: string;
  platform_slug: string;
  platform_product_id: string;
  platform_product_name: string;
  price_platform: number;
  auto_sync: boolean;
}

export function useEcommerce() {
  const queryClient = useQueryClient();

  // Platforms
  const platformsQuery = useQuery({
    queryKey: ['ecommerce_platforms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecommerce_platforms').select('*');
      if (error) throw error;
      return (data || []) as EcommercePlatform[];
    },
  });

  // Orders
  const ordersQuery = useQuery({
    queryKey: ['ecommerce_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecommerce_orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EcommerceOrder[];
    },
  });

  // Mappings
  const mappingsQuery = useQuery({
    queryKey: ['ecommerce_mappings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecommerce_product_mappings').select('*');
      if (error) throw error;
      return (data || []) as EcommerceProductMapping[];
    },
  });

  const connectPlatform = useMutation({
    mutationFn: async (platform: Partial<EcommercePlatform>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { data, error } = await supabase.from('ecommerce_platforms')
        .upsert({ ...platform, user_id: user.id }, { onConflict: 'platform_slug, user_id' })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ecommerce_platforms'] }),
  });

  const disconnectPlatform = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ecommerce_platforms').update({ connected: false, api_key: null, store_id: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ecommerce_platforms'] }),
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EcommerceOrder['status'] }) => {
      const { error } = await supabase.from('ecommerce_orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ecommerce_orders'] }),
  });

  const saveMapping = useMutation({
    mutationFn: async (mapping: Partial<EcommerceProductMapping>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');
      const { data, error } = await supabase.from('ecommerce_product_mappings').insert({ ...mapping, user_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ecommerce_mappings'] }),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ecommerce_product_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ecommerce_mappings'] }),
  });

  const simulateSync = useMutation({
    mutationFn: async (platformSlug: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      // Generate a fake order
      const fakeOrder = {
        platform_slug: platformSlug,
        platform_order_id: 'SIM-' + Math.floor(Math.random() * 100000),
        customer_name: 'Simulated Customer',
        customer_phone: '+995 5XX XX XX XX',
        customer_address: 'Tbilisi, Georgia (Simulated)',
        items: [{ name: 'Simulated Product', quantity: 1, price: 15 }],
        subtotal: 15,
        total: 15,
        status: 'new' as const,
        user_id: user.id
      };

      const { error } = await supabase.from('ecommerce_orders').insert(fakeOrder);
      if (error) throw error;

      await supabase.from('ecommerce_platforms').update({ last_sync: new Date().toISOString() }).eq('platform_slug', platformSlug).eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce_orders'] });
      queryClient.invalidateQueries({ queryKey: ['ecommerce_platforms'] });
      toast.success('Sync complete (Simulated)');
    }
  });

  return {
    platforms: platformsQuery.data || [],
    orders: ordersQuery.data || [],
    mappings: mappingsQuery.data || [],
    isLoading: platformsQuery.isLoading || ordersQuery.isLoading || mappingsQuery.isLoading,
    connectPlatform,
    disconnectPlatform,
    updateOrderStatus,
    saveMapping,
    deleteMapping,
    simulateSync
  };
}
