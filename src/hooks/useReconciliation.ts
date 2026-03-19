import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BankStatementUpload {
    id: string;
    filename: string;
    upload_date: string;
    status: 'pending' | 'processing' | 'completed' | 'cancelled';
    total_lines: number;
    matched_lines: number;
    tenant_id?: string;
}

export interface BankMappingRule {
    id: string;
    tenant_id: string;
    keyword: string;
    account_code: string;
    description_override?: string | null;
}

export interface BankStatementLine {
    id: string;
    upload_id: string;
    transaction_date: string;
    description: string;
    amount: number;
    counterparty?: string;
    reference_number?: string;
    account_code?: string;
    match_id?: string | null;
    match_status: 'unmatched' | 'matched' | 'ignored' | 'manual';
    match_reason?: string;
}

export function useReconciliation() {
    const [uploads, setUploads] = useState<BankStatementUpload[]>([]);
    const [rules, setRules] = useState<BankMappingRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchUploads();
        fetchRules();
    }, []);

    const fetchRules = async () => {
        const { data, error } = await supabase
            .from('bank_mapping_rules')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setRules(data || []);
    };

    useEffect(() => {
        fetchUploads();
    }, []);

    const fetchUploads = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('bank_statement_uploads')
                .select('*')
                .order('upload_date', { ascending: false });

            if (error) throw error;
            setUploads(data || []);
        } catch (error) {
            console.error('Error fetching uploads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createUpload = async (filename: string, totalLines: number) => {
        const { data, error } = await supabase
            .from('bank_statement_uploads')
            .insert([{ filename, total_lines: totalLines, status: 'pending' }])
            .select()
            .single();

        if (!error) setUploads(prev => [data, ...prev]);
        return { data, error };
    };

    const addRule = async (keyword: string, account_code: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: new Error('Not authenticated') };
        
        // We will assume RLS handles tenant_id correctly based on the user's tenant_id, 
        // but if it's required during insert, we can fetch it, or rely on a trigger.
        // Given we don't have the user's tenant_id immediately, let's fetch it from employees:
        const { data: employee } = await supabase.from('employees').select('tenant_id').eq('id', user.id).single();
        if (!employee) return { error: new Error('Employee record not found') };

        const { data, error } = await supabase
            .from('bank_mapping_rules')
            .insert([{ keyword, account_code, tenant_id: employee.tenant_id }])
            .select()
            .single();

        if (!error && data) setRules(prev => [data, ...prev]);
        return { data, error };
    };

    const deleteRule = async (id: string) => {
        const { error } = await supabase.from('bank_mapping_rules').delete().eq('id', id);
        if (!error) setRules(prev => prev.filter(r => r.id !== id));
        return { error };
    };

    const addLines = async (lines: Omit<BankStatementLine, 'id'>[]) => {
        const { error } = await supabase
            .from('bank_statement_lines')
            .insert(lines);
        return { error };
    };

    const getLines = async (uploadId: string) => {
        const { data, error } = await supabase
            .from('bank_statement_lines')
            .select('*')
            .eq('upload_id', uploadId)
            .order('transaction_date', { ascending: false });
        return { data, error };
    };

    const runAutoMatch = async (uploadId: string) => {
        const { data, error } = await supabase.rpc('auto_match_bank_lines', { p_upload_id: uploadId });
        if (!error) fetchUploads();
        return { data, error };
    };

    const runAutoCategorize = async (uploadId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: new Error('Not authenticated') };
        const { data: employee } = await supabase.from('employees').select('tenant_id').eq('id', user.id).single();
        
        const { data, error } = await supabase.rpc('auto_categorize_bank_lines', { 
            p_upload_id: uploadId,
            p_tenant_id: employee?.tenant_id 
        });
        return { data, error };
    };

    const markLineMatched = async (lineId: string, account_code: string) => {
        const { error } = await supabase
            .from('bank_statement_lines')
            .update({ match_status: 'matched', account_code, match_reason: 'Manually categorized & entered' })
            .eq('id', lineId);
        return { error };
    };

    return {
        uploads,
        rules,
        isLoading,
        createUpload,
        addLines,
        getLines,
        runAutoMatch,
        runAutoCategorize,
        addRule,
        deleteRule,
        markLineMatched,
        refresh: fetchUploads
    };
}
