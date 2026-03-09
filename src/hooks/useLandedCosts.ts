import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LandedCostHeader {
    id: string;
    transaction_id: string;
    total_additional_cost: number;
    allocation_method: 'value' | 'quantity' | 'weight' | 'volume';
    description?: string;
    status: 'draft' | 'applied' | 'cancelled';
    created_at: string;
}

export interface LandedCostItem {
    id: string;
    header_id: string;
    cost_type: string;
    amount: number;
    vendor_id?: string;
    invoice_number?: string;
}

export function useLandedCosts() {
    const [landedCosts, setLandedCosts] = useState<LandedCostHeader[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchLandedCosts();
    }, []);

    const fetchLandedCosts = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('landed_cost_headers')
                .select(`
          *,
          transaction:transactions(supplier_name, id)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLandedCosts(data || []);
        } catch (error) {
            console.error('Error fetching landed costs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createLandedCost = async (payload: Omit<LandedCostHeader, 'id' | 'created_at' | 'status'>) => {
        const { data, error } = await supabase
            .from('landed_cost_headers')
            .insert([{ ...payload, status: 'draft' }])
            .select()
            .single();
        if (!error) setLandedCosts(prev => [data, ...prev]);
        return { data, error };
    };

    const applyLandedCost = async (headerId: string) => {
        const { error } = await supabase.rpc('apply_landed_cost', { p_header_id: headerId });
        if (!error) fetchLandedCosts();
        return { error };
    };

    return {
        landedCosts,
        isLoading,
        createLandedCost,
        applyLandedCost,
        refresh: fetchLandedCosts
    };
}
