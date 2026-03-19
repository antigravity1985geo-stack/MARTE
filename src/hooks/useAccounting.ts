import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { calculateTrialBalance, calculateProfitLoss } from '@/lib/accountingMath';

// ==========================================
// Types
// ==========================================

export interface Account {
    id: string;
    code: string;
    name: string;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    parent_code: string | null;
    is_system: boolean;
    balance: number;
}

export interface JournalLine {
    account_id: string;
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
    description?: string;
}

export interface JournalEntry {
    id: string;
    entry_number: string;
    date: string;
    description: string;
    lines: JournalLine[];
    total_debit: number;
    total_credit: number;
    status: 'draft' | 'posted' | 'voided';
    reference?: string;
    created_at: string;
}

export interface VatRecord {
    id: string;
    date: string;
    type: 'purchase' | 'sale';
    document_number: string;
    counterparty_tin: string;
    counterparty_name: string;
    taxable_amount: number;
    vat_amount: number;
    total_amount: number;
    description: string;
}

export interface ExchangeRate {
    id?: string;
    currency_code: string;
    rate: number;
    date: string;
}

// ==========================================
// Georgian Chart of Accounts — Seed Data
// ==========================================

const GEORGIAN_CHART_OF_ACCOUNTS: Omit<Account, 'id'>[] = [
    { code: '1100', name: 'ძირითადი საშუალებები', type: 'asset', parent_code: null, is_system: true, balance: 0 },
    { code: '1200', name: 'არამატერიალური აქტივები', type: 'asset', parent_code: null, is_system: true, balance: 0 },
    { code: '1400', name: 'სასაქონლო მარაგი', type: 'asset', parent_code: null, is_system: true, balance: 0 },
    { code: '1500', name: 'მოთხოვნები (დებიტორები)', type: 'asset', parent_code: null, is_system: true, balance: 0 },
    { code: '1700', name: 'დღგ მისაღები', type: 'asset', parent_code: null, is_system: true, balance: 0 },
    { code: '2300', name: 'ფულადი სახსრები', type: 'asset', parent_code: null, is_system: true, balance: 0 },
    { code: '2310', name: 'სალარო (ნაღდი ფული)', type: 'asset', parent_code: '2300', is_system: true, balance: 0 },
    { code: '2320', name: 'საბანკო ანგარიში', type: 'asset', parent_code: '2300', is_system: true, balance: 0 },
    { code: '3100', name: 'მოწოდებლების ვალდებულებები', type: 'liability', parent_code: null, is_system: true, balance: 0 },
    { code: '2500', name: 'დღგ გადასახდელი', type: 'liability', parent_code: null, is_system: true, balance: 0 },
    { code: '3300', name: 'სახელფასო ვალდებულებები', type: 'liability', parent_code: null, is_system: true, balance: 0 },
    { code: '3310', name: 'საშემოსავლო გადასახდელი', type: 'liability', parent_code: '3300', is_system: true, balance: 0 },
    { code: '3320', name: 'საპენსიო ვალდებულება', type: 'liability', parent_code: '3300', is_system: true, balance: 0 },
    { code: '4000', name: 'საწესდებო კაპიტალი', type: 'equity', parent_code: null, is_system: true, balance: 0 },
    { code: '4100', name: 'გაყიდვების შემოსავალი', type: 'revenue', parent_code: null, is_system: true, balance: 0 },
    { code: '4200', name: 'მომსახურების შემოსავალი', type: 'revenue', parent_code: null, is_system: true, balance: 0 },
    { code: '5100', name: 'გაყიდული პროდ. თვითღირებულება', type: 'expense', parent_code: null, is_system: true, balance: 0 },
    { code: '6100', name: 'ქირავნობის ხარჯი', type: 'expense', parent_code: null, is_system: true, balance: 0 },
    { code: '6200', name: 'კომუნალური ხარჯი', type: 'expense', parent_code: null, is_system: true, balance: 0 },
    { code: '6210', name: 'ხელფასის ხარჯი', type: 'expense', parent_code: null, is_system: true, balance: 0 },
];

// ==========================================
// Hook
// ==========================================

export function useAccounting() {
    const { user, activeTenantId } = useAuthStore();
    const queryClient = useQueryClient();

    // ---- Accounts ----
    const accountsQuery = useQuery({
        queryKey: ['accounts', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .order('code');
            if (error) throw error;

            // Seed Georgian chart of accounts if empty
            if (!data || data.length === 0) {
                const seedRows = GEORGIAN_CHART_OF_ACCOUNTS.map((a) => ({
                    code: a.code,
                    name: a.name,
                    type: a.type,
                    parent_code: a.parent_code,
                    is_system: a.is_system,
                    balance: a.balance,
                }));
                const { data: seeded, error: seedErr } = await supabase
                    .from('accounts')
                    .insert(seedRows)
                    .select();
                if (seedErr) throw seedErr;
                return (seeded || []) as Account[];
            }

            return data as Account[];
        },
        staleTime: 60_000,
    });

    // ---- Journal Entries ----
    const journalQuery = useQuery({
        queryKey: ['journal_entries', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data: entries, error } = await supabase
                .from('journal_entries')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;

            // Fetch lines for all entries
            if (entries && entries.length > 0) {
                const entryIds = entries.map((e: any) => e.id);
                const { data: lines, error: linesErr } = await supabase
                    .from('journal_lines')
                    .select('*')
                    .in('journal_entry_id', entryIds);
                if (linesErr) throw linesErr;

                return entries.map((entry: any) => ({
                    ...entry,
                    lines: (lines || []).filter((l: any) => l.journal_entry_id === entry.id),
                })) as JournalEntry[];
            }

            return (entries || []).map((e: any) => ({ ...e, lines: [] })) as JournalEntry[];
        },
        staleTime: 30_000,
    });

    // ---- VAT Records ----
    const vatQuery = useQuery({
        queryKey: ['vat_records', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vat_records')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            return (data || []) as VatRecord[];
        },
        staleTime: 60_000,
    });

    // ---- Exchange Rates (NBG API) ----
    const today = new Date().toISOString().split('T')[0];
    const exchangeRatesQuery = useQuery({
        queryKey: ['exchange_rates', today],
        queryFn: async () => {
            // 1. Check if we already have today's rates in DB
            const { data: dbRates, error: dbErr } = await supabase
                .from('exchange_rates')
                .select('*')
                .eq('date', today);

            if (!dbErr && dbRates && dbRates.length > 0) {
                return dbRates as ExchangeRate[];
            }

            // 2. Fetch from NBG API if not exists
            try {
                const res = await fetch('https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json/');
                const data = await res.json();

                if (data && data.length > 0 && data[0].currencies) {
                    const nbgCurrencies = data[0].currencies;
                    const targetCurrencies = ['USD', 'EUR', 'GBP'];

                    const ratesToInsert = nbgCurrencies
                        .filter((c: any) => targetCurrencies.includes(c.code))
                        .map((c: any) => ({
                            currency_code: c.code,
                            rate: c.rate,
                            date: today
                        }));

                    if (ratesToInsert.length > 0) {
                        const { data: inserted, error: insertErr } = await supabase
                            .from('exchange_rates')
                            .insert(ratesToInsert)
                            .select();

                        if (!insertErr && inserted) {
                            return inserted as ExchangeRate[];
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to fetch NBG rates', e);
            }

            return [];
        },
        staleTime: 1000 * 60 * 60 * 24, // cache for 24 hours in client
    });

    // ---- Mutations ----

    const addEntry = useMutation({
        mutationFn: async (params: {
            date: string;
            description: string;
            debitAccount: string;
            creditAccount: string;
            amount: number;
            reference?: string;
        }) => {
            const accounts = accountsQuery.data || [];
            const debitAcc = accounts.find((a) => a.code === params.debitAccount);
            const creditAcc = accounts.find((a) => a.code === params.creditAccount);
            if (!debitAcc || !creditAcc) throw new Error('ანგარიში ვერ მოიძებნა');

            // Count existing entries for numbering
            const { count } = await supabase
                .from('journal_entries')
                .select('id', { count: 'exact', head: true });
            const entryNumber = `JE-${String((count || 0) + 1).padStart(4, '0')}`;

            // Insert journal entry
            const { data: entry, error: entryErr } = await supabase
                .from('journal_entries')
                .insert({
                    tenant_id: activeTenantId,
                    entry_number: entryNumber,
                    date: params.date,
                    description: params.description,
                    total_debit: params.amount,
                    total_credit: params.amount,
                    status: 'posted',
                    reference: params.reference || null,
                })
                .select()
                .single();
            if (entryErr) throw entryErr;

            // Insert two lines: debit and credit
            const { error: linesErr } = await supabase.from('journal_lines').insert([
                {
                    journal_entry_id: entry.id,
                    account_id: debitAcc.id,
                    account_code: debitAcc.code,
                    account_name: debitAcc.name,
                    debit: params.amount,
                    credit: 0,
                },
                {
                    journal_entry_id: entry.id,
                    account_id: creditAcc.id,
                    account_code: creditAcc.code,
                    account_name: creditAcc.name,
                    debit: 0,
                    credit: params.amount,
                },
            ]);
            if (linesErr) throw linesErr;

            return entry;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
        },
    });

    const addMultiLineEntry = useMutation({
        mutationFn: async (params: {
            date: string;
            description: string;
            lines: { accountCode: string; debit: number; credit: number }[];
            reference?: string;
        }) => {
            const accounts = accountsQuery.data || [];

            // Count existing entries
            const { count } = await supabase
                .from('journal_entries')
                .select('id', { count: 'exact', head: true });
            const entryNumber = `JE-${String((count || 0) + 1).padStart(4, '0')}`;

            const totalDebit = params.lines.reduce((s, l) => s + l.debit, 0);
            const totalCredit = params.lines.reduce((s, l) => s + l.credit, 0);

            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                throw new Error('დებეტი და კრედიტი არ უდრის ერთმანეთს');
            }

            // Insert journal entry
            const { data: entry, error: entryErr } = await supabase
                .from('journal_entries')
                .insert({
                    tenant_id: activeTenantId,
                    entry_number: entryNumber,
                    date: params.date,
                    description: params.description,
                    total_debit: totalDebit,
                    total_credit: totalCredit,
                    status: 'posted',
                    reference: params.reference || null,
                })
                .select()
                .single();
            if (entryErr) throw entryErr;

            // Prepare lines
            const linesToInsert = params.lines.map(line => {
                const acc = accounts.find(a => a.code === line.accountCode);
                if (!acc) throw new Error(`ანგარიში ${line.accountCode} ვერ მოიძებნა`);
                return {
                    journal_entry_id: entry.id,
                    account_id: acc.id,
                    account_code: acc.code,
                    account_name: acc.name,
                    debit: line.debit,
                    credit: line.credit,
                };
            });

            const { error: linesErr } = await supabase.from('journal_lines').insert(linesToInsert);
            if (linesErr) throw linesErr;
            return entry;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
        },
    });

    const addVatRecord = useMutation({
        mutationFn: async (record: Omit<VatRecord, 'id'>) => {
            const { data, error } = await supabase
                .from('vat_records')
                .insert(record)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vat_records'] });
        },
    });

    const deleteVatRecord = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('vat_records').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vat_records'] });
        },
    });

    // ---- Computed values ----

    const accounts = accountsQuery.data || [];
    const journalEntries = journalQuery.data || [];
    const vatRecords = vatQuery.data || [];

    const getTrialBalance = () => calculateTrialBalance(accounts);

    const getProfitLoss = () => calculateProfitLoss(accounts);

    return {
        accounts,
        journalEntries,
        vatRecords,
        exchangeRates: exchangeRatesQuery.data || [],
        isLoading: accountsQuery.isLoading || journalQuery.isLoading,
        addEntry,
        addMultiLineEntry,
        addVatRecord,
        deleteVatRecord,
        getTrialBalance,
        getProfitLoss,
    };
}
