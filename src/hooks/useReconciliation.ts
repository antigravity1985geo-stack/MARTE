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
    const [isLoading, setIsLoading] = useState(true);

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

    return {
        uploads,
        isLoading,
        createUpload,
        addLines,
        getLines,
        runAutoMatch,
        refresh: fetchUploads
    };
}
