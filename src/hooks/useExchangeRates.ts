import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export interface Currency {
  id: string;
  code: string;
  name: string;
  rate: number;
  symbol: string;
}

export function useExchangeRates() {
  const { user } = useAuthStore();

  const query = useQuery({
    queryKey: ['exchange_rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      return data as Currency[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-nbg-rates');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      query.refetch();
    },
  });

  const convert = (amount: number, fromCode: string, toCode: string) => {
    if (!query.data) return amount;
    
    if (fromCode === toCode) return amount;

    const fromCurrency = query.data.find(c => c.code === fromCode);
    const toCurrency = query.data.find(c => c.code === toCode);
    
    if (!fromCurrency || !toCurrency) return amount;
    
    const amountInGel = amount * fromCurrency.rate;
    const finalAmount = amountInGel / toCurrency.rate;
    
    return finalAmount;
  };

  return {
    currencies: query.data || [],
    isLoading: query.isLoading,
    isSyncing: syncMutation.isPending,
    error: query.error || syncMutation.error,
    convert,
    refresh: () => query.refetch(),
    sync: () => syncMutation.mutate(),
  };
}
