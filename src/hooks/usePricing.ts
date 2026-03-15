import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export type PriceTier = 'retail' | 'wholesale' | 'vip' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface PriceRule {
  id: string;
  product_id: string;
  product_name: string;
  tier: PriceTier;
  price: number;
  min_quantity: number;
  created_at?: string;
}

export interface LoyaltyMember {
  id: string;
  clientId: string;
  clientName: string;
  points: number;
  tier: PriceTier;
  totalSpent: number;
  joinDate: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  expiresAt: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export const TIER_LABELS: Record<PriceTier, string> = {
  retail: 'საცალო',
  wholesale: 'საბითუმო',
  vip: 'VIP',
  bronze: 'ბრინჯაო',
  silver: 'ვერცხლი',
  gold: 'ოქრო',
  platinum: 'პლატინა'
};

export function usePricing() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const rulesQuery = useQuery({
    queryKey: ['price_rules'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('price_rules').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as PriceRule[];
    },
    enabled: !!user,
  });

  const loyaltyQuery = useQuery({
    queryKey: ['loyalty_members'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('clients').select('id, name, loyalty_points, loyalty_tier, total_spent, created_at');
      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id,
        clientId: c.id,
        clientName: c.name,
        points: c.loyalty_points || 0,
        tier: (c.loyalty_tier || 'bronze') as PriceTier,
        totalSpent: c.total_spent || 0,
        joinDate: c.created_at
      })) as LoyaltyMember[];
    },
    enabled: !!user,
  });

  const couponsQuery = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        code: p.promo_code || '',
        discountType: p.type === 'percent' ? 'percentage' : p.type,
        discountValue: p.value,
        minPurchase: 0, // Fallback if missing
        expiresAt: p.end_date,
        usageLimit: 0,
        usedCount: p.usage_count,
        isActive: p.is_active
      })) as Coupon[];
    },
    enabled: !!user,
  });

  const addPriceRule = useMutation({
    mutationFn: async (rule: Omit<PriceRule, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('price_rules').insert({ ...rule, user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price_rules'] }),
  });

  const updatePriceRule = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PriceRule> }) => {
      const { error } = await supabase.from('price_rules').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price_rules'] }),
  });

  const deletePriceRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('price_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price_rules'] }),
  });

  const updateMemberTier = useMutation({
    mutationFn: async ({ clientId, tier }: { clientId: string; tier: PriceTier }) => {
      const { error } = await supabase.from('clients').update({ loyalty_tier: tier }).eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loyalty_members'] }),
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });

  const addCouponData = useMutation({
    mutationFn: async (c: any) => {
      const { error } = await supabase.from('promotions').insert({
        name: c.code,
        promo_code: c.code,
        type: c.discountType,
        value: c.discountValue,
        start_date: new Date().toISOString(),
        end_date: c.expiresAt,
        is_active: c.isActive,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });

  const updateCouponUsage = useMutation({
    mutationFn: async (couponId: string) => {
      const coupon = couponsQuery.data?.find(c => c.id === couponId);
      if (coupon) {
        await supabase.from('promotions').update({ usage_count: coupon.usedCount + 1 }).eq('id', couponId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] })
  });
  
  // Backward compatibility signatures for UI
  const addCoupon = (c: Omit<Coupon, 'id' | 'usedCount'>) => addCouponData.mutate(c);

  const priceRules = rulesQuery.data || [];
  const loyaltyMembers = loyaltyQuery.data || [];
  const coupons = couponsQuery.data || [];

  const useCoupon = (code: string, purchaseTotal: number) => {
    const coupon = coupons.find((c) => c.code === code && c.isActive);
    if (!coupon || new Date(coupon.expiresAt) < new Date() || purchaseTotal < coupon.minPurchase) {
      return { valid: false, discount: 0 };
    }
    const discount = coupon.discountType === 'percentage'
      ? Math.round(purchaseTotal * coupon.discountValue / 100)
      : coupon.discountValue;
    
    // Trigger mutation to update usage count asynchronously without waiting
    updateCouponUsage.mutate(coupon.id);
    
    return { valid: true, discount, coupon };
  };

  const getClientPrice = (productId: string, clientId: string, basePrice: number, quantity: number) => {
    const member = loyaltyMembers.find((m) => m.clientId === clientId);
    if (!member) return basePrice;
    const rules = priceRules
      .filter((r) => r.product_id === productId && r.tier === member.tier && quantity >= r.min_quantity)
      .sort((a, b) => a.price - b.price);
    return rules.length > 0 ? rules[0].price : basePrice;
  };

  return {
    priceRules,
    loyaltyMembers,
    coupons,
    isLoading: rulesQuery.isLoading || loyaltyQuery.isLoading || couponsQuery.isLoading,
    addPriceRule,
    updatePriceRule,
    deletePriceRule,
    updateMemberTier,
    addCoupon,
    deleteCoupon,
    useCoupon,
    getClientPrice,
  };
}
