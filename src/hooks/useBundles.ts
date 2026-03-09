import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupabaseBundleItem {
    bundle_id: string;
    product_id: string;
    quantity: number;
}

export interface SupabaseProductBundle {
    id: string;
    user_id: string;
    name: string;
    discount_type: 'percentage' | 'fixed' | null;
    discount_value: number;
    active: boolean;
    created_at: string;
}

export interface BundleWithItems extends SupabaseProductBundle {
    items: SupabaseBundleItem[];
}

export type ProductBundleInsert = Omit<SupabaseProductBundle, 'id' | 'created_at' | 'user_id'>;

export function useBundles() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['bundles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_bundles')
                .select(`
          *,
          bundle_items (
            bundle_id,
            product_id,
            quantity
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((bundle: any) => ({
                ...bundle,
                items: bundle.bundle_items || [],
            })) as BundleWithItems[];
        },
    });

    const addBundle = useMutation({
        mutationFn: async (payload: { bundle: ProductBundleInsert; items: { productId: string; quantity: number }[] }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('არ ხართ ავტორიზებული');

            const { data: bundleData, error: bundleError } = await supabase
                .from('product_bundles')
                .insert({ ...payload.bundle, user_id: user.id })
                .select()
                .single();

            if (bundleError) throw bundleError;

            if (payload.items.length > 0) {
                const insertItems = payload.items.map(i => ({
                    bundle_id: bundleData.id,
                    product_id: i.productId,
                    quantity: i.quantity
                }));

                const { error: itemsError } = await supabase
                    .from('bundle_items')
                    .insert(insertItems);

                if (itemsError) throw itemsError;
            }

            return bundleData;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bundles'] }),
    });

    const updateBundle = useMutation({
        mutationFn: async ({ id, updates, newItems }: { id: string; updates: Partial<ProductBundleInsert>; newItems?: { productId: string; quantity: number }[] }) => {
            const { error: bundleError } = await supabase
                .from('product_bundles')
                .update(updates)
                .eq('id', id);

            if (bundleError) throw bundleError;

            if (newItems) {
                // Delete old items
                await supabase.from('bundle_items').delete().eq('bundle_id', id);

                // Insert new ones
                if (newItems.length > 0) {
                    const insertItems = newItems.map(i => ({
                        bundle_id: id,
                        product_id: i.productId,
                        quantity: i.quantity
                    }));
                    const { error: itemsError } = await supabase.from('bundle_items').insert(insertItems);
                    if (itemsError) throw itemsError;
                }
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bundles'] }),
    });

    const deleteBundle = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('product_bundles').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bundles'] }),
    });

    return {
        bundles: query.data || [],
        isLoading: query.isLoading,
        addBundle,
        updateBundle,
        deleteBundle
    };
}
