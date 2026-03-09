import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccountingRule {
    id: string;
    name: string;
    event_type: 'SALE' | 'PURCHASE' | 'EXPENSE' | 'RECEIVING';
    payment_method?: string | null;
    category_id?: string | null;
    debit_account_code: string;
    credit_account_code: string;
    description_template?: string | null;
    is_active: boolean;
    created_at: string;
}

export function useAccountingRules() {
    const [rules, setRules] = useState<AccountingRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('accounting_rules')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRules(data || []);
        } catch (error: any) {
            console.error('Error fetching accounting rules:', error);
            toast.error('წესების წამოღება ვერ მოხერხდა');
        } finally {
            setIsLoading(false);
        }
    };

    const addRule = async (rule: Omit<AccountingRule, 'id' | 'created_at'>) => {
        try {
            const { data, error } = await supabase
                .from('accounting_rules')
                .insert([rule])
                .select()
                .single();

            if (error) throw error;
            setRules(prev => [data, ...prev]);
            return { data, error: null };
        } catch (error: any) {
            console.error('Error adding rule:', error);
            toast.error('წესის დამატება ვერ მოხერხდა');
            return { data: null, error };
        }
    };

    const updateRule = async (id: string, updates: Partial<AccountingRule>) => {
        try {
            const { error } = await supabase
                .from('accounting_rules')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
            return { error: null };
        } catch (error: any) {
            console.error('Error updating rule:', error);
            toast.error('წესის განახლება ვერ მოხერხდა');
            return { error };
        }
    };

    const deleteRule = async (id: string) => {
        try {
            const { error } = await supabase
                .from('accounting_rules')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setRules(prev => prev.filter(r => r.id !== id));
            return { error: null };
        } catch (error: any) {
            console.error('Error deleting rule:', error);
            toast.error('წესის წაშლა ვერ მოხერხდა');
            return { error };
        }
    };

    return {
        rules,
        isLoading,
        addRule,
        updateRule,
        deleteRule,
        refresh: fetchRules
    };
}
