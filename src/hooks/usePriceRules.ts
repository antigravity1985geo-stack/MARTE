import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PriceRuleType = 'bulk' | 'loyalty_tier' | 'time_based' | 'category' | 'bundle';

export interface PriceRuleCondition {
    min_qty?: number;
    tier?: string;
    after?: string; // HH:mm
    before?: string; // HH:mm
    category_id?: string;
    [key: string]: any;
}

export interface SupabasePriceRule {
    id: string;
    user_id: string;
    name: string;
    type: PriceRuleType;
    condition: PriceRuleCondition;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    priority: number;
    active: boolean;
    valid_from: string | null;
    valid_until: string | null;
    created_at: string;
}

export type PriceRuleInsert = Omit<SupabasePriceRule, 'id' | 'created_at' | 'user_id'>;

export function usePriceRules() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['price_rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('price_rules')
                .select('*')
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as SupabasePriceRule[];
        },
    });

    const addRule = useMutation({
        mutationFn: async (rule: PriceRuleInsert) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('არ ხართ ავტორიზებული');

            const { data, error } = await supabase
                .from('price_rules')
                .insert({ ...rule, user_id: user.id })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price_rules'] }),
    });

    const updateRule = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<PriceRuleInsert> }) => {
            const { error } = await supabase
                .from('price_rules')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price_rules'] }),
    });

    const deleteRule = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('price_rules').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price_rules'] }),
    });

    return {
        rules: query.data || [],
        isLoading: query.isLoading,
        addRule,
        updateRule,
        deleteRule,
    };
}
