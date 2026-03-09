import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export interface AbcAnalysis {
    product_id: string;
    product_name: string;
    total_revenue: number;
    transaction_count: number;
    abc_category: 'A' | 'B' | 'C';
}

export interface CustomerLtv {
    client_id: string;
    client_name: string;
    total_orders: number;
    total_spent: number;
    avg_order_value: number;
    last_order_date: string;
    customer_days_age: number;
}

export interface BasketAnalysis {
    product_a_name: string;
    product_b_name: string;
    frequency: number;
}

export function useAnalytics() {
    const user = useAuthStore((s) => s.user);

    const abcQuery = useQuery({
        queryKey: ['analytics', 'abc', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_abc_analysis')
                .select('*');
            if (error) throw error;
            return data as AbcAnalysis[];
        },
    });

    const ltvQuery = useQuery({
        queryKey: ['analytics', 'ltv', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('customer_ltv')
                .select('*')
                .order('total_spent', { ascending: false });
            if (error) throw error;
            return data as CustomerLtv[];
        },
    });

    const basketQuery = useQuery({
        queryKey: ['analytics', 'basket', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('basket_analysis')
                .select('*')
                .limit(10);
            if (error) throw error;
            return data as BasketAnalysis[];
        },
    });

    return {
        abcData: abcQuery.data || [],
        ltvData: ltvQuery.data || [],
        basketData: basketQuery.data || [],
        isLoading: abcQuery.isLoading || ltvQuery.isLoading || basketQuery.isLoading,
    };
}
