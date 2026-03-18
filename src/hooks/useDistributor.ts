import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';

export interface Commission {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  referred_user_id: string;
  referred_user_name?: string;
}

export const useDistributor = () => {
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['distributor-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [commissionsRes, referralsRes] = await Promise.all([
        supabase
          .from('distributor_commissions')
          .select('*')
          .eq('distributor_id', user.id),
        supabase
          .from('profiles')
          .select('id, full_name, created_at')
          .eq('referred_by', user.id)
      ]);

      if (commissionsRes.error) throw commissionsRes.error;
      if (referralsRes.error) throw referralsRes.error;

      const commissions = commissionsRes.data as Commission[];
      const totalEarned = commissions.reduce((sum, c) => sum + (c.status === 'paid' ? Number(c.amount) : 0), 0);
      const pendingAmount = commissions.reduce((sum, c) => sum + (c.status === 'pending' ? Number(c.amount) : 0), 0);

      return {
        totalEarned,
        pendingAmount,
        referralCount: referralsRes.data.length,
        referrals: referralsRes.data,
        commissions
      };
    },
    enabled: !!user?.id
  });

  const copyReferralLink = () => {
    if (!user?.referralCode) return;
    const link = `${window.location.origin}/auth?ref=${user.referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('ლინკი კოპირებულია!');
  };

  return {
    stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    copyReferralLink,
    referralLink: user?.referralCode ? `${window.location.origin}/auth?ref=${user.referralCode}` : ''
  };
};
