import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';

export interface SupabaseClient {
  id: string;
  user_id: string;
  name: string;
  tin: string;
  phone: string;
  email: string;
  address: string;
  total_purchases: number;
  total_spent: number;
  loyalty_points: number;
  lifetime_points: number;
  loyalty_tier: string;
  segment: 'new' | 'regular' | 'vip' | 'at_risk' | 'lost';
  first_purchase: string;
  last_purchase: string | null;
  notes: string | null;
  birth_date: string | null;
  created_at: string;
  referral_code?: string;
  referred_by?: string;
}

export interface LoyaltyTierInfo {
  id: string;
  name: string;
  threshold: number;
  multiplier: number;
}

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  type: 'percentage' | 'fixed' | 'bogo' | 'points_multiplier';
  value: number;
  target_segment: string;
  start_date: string | null;
  end_date: string | null;
  promo_code: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export function useClients() {
  const queryClient = useQueryClient();
  const { log } = useActivityLog();

  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('total_spent', { ascending: false });
      if (error) throw error;
      return data as SupabaseClient[];
    },
  });

  const promotionsQuery = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Promotion[];
    },
  });

  const loyaltyTiersQuery = useQuery({
    queryKey: ['loyalty_tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .order('threshold', { ascending: true });
      if (error) throw error;
      return data as LoyaltyTierInfo[];
    },
  });

  const addClient = useMutation({
    mutationFn: async (client: Partial<SupabaseClient>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { error } = await supabase.from('clients').insert({ ...client, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      log({ action: 'create', entityType: 'client' });
    },
  });

  const addPromotion = useMutation({
    mutationFn: async (promo: Partial<Promotion>) => {
      const { error } = await supabase.from('promotions').insert(promo);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      log({ action: 'create', entityType: 'promotion' as any });
    },
  });

  const recordPurchase = useMutation({
    mutationFn: async ({ clientId, amount, pointsEarned, transactionId }: { clientId: string, amount: number, pointsEarned: number, transactionId: string }) => {
      // 1. Get current client data
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('total_spent, loyalty_points, lifetime_points')
        .eq('id', clientId)
        .single();

      if (fetchError) throw fetchError;

      const newTotalSpent = (Number(client.total_spent) || 0) + amount;
      const newPoints = (Number(client.loyalty_points) || 0) + pointsEarned;


      // 3. Update client
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          total_spent: newTotalSpent,
          loyalty_points: newPoints,
          lifetime_points: (client.lifetime_points || 0) + pointsEarned,
          last_purchase: new Date().toISOString()
        })
        .eq('id', clientId);

      if (updateError) throw updateError;

      // 4. Log points history
      if (pointsEarned !== 0) {
        const { error: historyError } = await supabase
          .from('client_points_history')
          .insert({
            client_id: clientId,
            transaction_id: transactionId,
            points: pointsEarned,
            type: pointsEarned > 0 ? 'earn' : 'redeem',
            description: `შესყიდვა POS-დან: +${pointsEarned} ქულა`
          });
        if (historyError) throw historyError;
      }

      return { newPoints };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });

  const pointsHistoryQuery = (clientId: string) => useQuery({
    queryKey: ['points_history', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_points_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const campaignsQuery = useQuery({
    queryKey: ['loyalty_campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveCampaign = useMutation({
    mutationFn: async (campaign: { name: string; type: string; status: string; target_segment: string; content: string }) => {
      const { data, error } = await supabase.from('loyalty_campaigns').insert(campaign).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty_campaigns'] });
    }
  });

  const runSegmentationUpdate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('update_customer_segments');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      log({ action: 'update', entityType: 'client', entityName: 'ავტომატური სეგმენტაციის განახლება' });
    }
  });

  const sendCampaign = useMutation({
    mutationFn: async (campaign: { name: string; target: string; type: string; content: string }) => {
      // 1. Save to DB
      await saveCampaign.mutateAsync({
        name: campaign.name,
        type: campaign.type,
        status: 'sent',
        target_segment: campaign.target,
        content: campaign.content
      });

      // 2. Simulation of sending (SMS/Email)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      log({
        action: 'create',
        entityType: 'promotion' as any,
        entityName: `კამპანია: ${campaign.name}`,
        details: { target: campaign.target, content: campaign.content }
      });
      return { success: true };
    }
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SupabaseClient> }) => {
      const { error } = await supabase.from('clients').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      log({ action: 'update', entityType: 'client', entityId: vars.id });
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      log({ action: 'delete', entityType: 'client', entityId: id });
    },
  });

  return {
    clients: clientsQuery.data || [],
    promotions: promotionsQuery.data || [],
    campaigns: campaignsQuery.data || [],
    loyaltyTiers: loyaltyTiersQuery.data || [],
    isLoading: clientsQuery.isLoading || promotionsQuery.isLoading || campaignsQuery.isLoading || loyaltyTiersQuery.isLoading,
    pointsHistory: pointsHistoryQuery,
    addClient,
    updateClient,
    deleteClient,
    addPromotion,
    recordPurchase,
    runSegmentationUpdate,
    sendCampaign,
  };
}
