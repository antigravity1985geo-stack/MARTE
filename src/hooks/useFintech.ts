import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export interface BankAccount {
    id: string;
    tenant_id: string;
    bank_name: string;
    iban: string;
    account_name: string | null;
    currency: string;
    status: 'connected' | 'expired' | 'error' | 'disconnected';
    last_synced_at: string | null;
    created_at: string;
}

export interface BankTransaction {
    id: string;
    bank_account_id: string;
    tenant_id: string;
    external_id: string | null;
    amount: number;
    currency: string;
    description: string | null;
    booking_date: string;
    value_date: string | null;
    status: 'pending' | 'booked';
    reconciled: boolean;
    related_entity_type: string | null;
    related_entity_id: string | null;
    journal_entry_id: string | null;
}

export interface PayrollBatch {
    id: string;
    tenant_id: string;
    name: string;
    month_year: string;
    status: 'draft' | 'processing' | 'paid' | 'cancelled';
    total_amount: number;
    payment_date: string | null;
    created_at: string;
}

export function useFintech() {
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();

    // ---- Bank Accounts ----
    const bankAccountsQuery = useQuery({
        queryKey: ['bank_accounts', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bank_accounts')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as BankAccount[];
        },
    });

    // ---- Bank Transactions ----
    const bankTransactionsQuery = useQuery({
        queryKey: ['bank_transactions', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bank_transactions')
                .select('*')
                .order('booking_date', { ascending: false });
            if (error) throw error;
            return (data || []) as BankTransaction[];
        },
    });

    // ---- Payroll Batches ----
    const payrollBatchesQuery = useQuery({
        queryKey: ['payroll_batches', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('payroll_batches')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as PayrollBatch[];
        },
    });

    // ---- Mutations ----

    const addBankAccount = useMutation({
        mutationFn: async (account: Partial<BankAccount>) => {
            const { data, error } = await supabase
                .from('bank_accounts')
                .insert({
                    ...account,
                    tenant_id: (await supabase.rpc('get_active_tenant_id')) || undefined, // Fallback if rpc exists
                } as any)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
        },
    });

    const addTransactions = useMutation({
        mutationFn: async (transactions: Partial<BankTransaction>[]) => {
            const { data, error } = await supabase
                .from('bank_transactions')
                .insert(transactions as any)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
        },
    });

    const reconcileTransaction = useMutation({
        mutationFn: async ({ id, journalEntryId }: { id: string; journalEntryId: string }) => {
            const { error } = await supabase
                .from('bank_transactions')
                .update({ reconciled: true, journal_entry_id: journalEntryId })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
        },
    });

    return {
        bankAccounts: bankAccountsQuery.data || [],
        bankTransactions: bankTransactionsQuery.data || [],
        payrollBatches: payrollBatchesQuery.data || [],
        isLoading: bankAccountsQuery.isLoading || bankTransactionsQuery.isLoading || payrollBatchesQuery.isLoading,
        addBankAccount,
        addTransactions,
        reconcileTransaction,
    };
}
