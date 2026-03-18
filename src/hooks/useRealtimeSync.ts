import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

// Map database tables to their primary React Query keys
const TABLE_QUERY_KEYS: Record<string, string[]> = {
  products: ['products'],
  transactions: ['transactions'],
  inventory_counts: ['inventory_counts'],
  queue_tickets: ['queue_tickets'],
  shift_sales: ['shift_sales', 'shifts'],
};

export function useRealtimeSync(tables: string[]) {
  const queryClient = useQueryClient();
  const { activeTenantId } = useAuthStore();

  useEffect(() => {
    // Only subscribe if we are authenticated/have a tenant AND requested tables exist
    if (!activeTenantId || tables.length === 0) return;

    const channels = tables.map((table) => {
      // Create a unique channel name per table
      return supabase
        .channel(`public:${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            console.log(`[Realtime Sync] Change received on ${table}:`, payload);
            
            // Look up corresponding query keys for this table
            const queryKeys = TABLE_QUERY_KEYS[table] || [table];
            
            // Invalidate each mapped query key to trigger refetch
            // Invalidating [key] will match any query array starting with that key
            queryKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: [key] });
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime Sync] Subscribed to ${table}`);
          }
        });
    });

    // Cleanup subscription on unmount
    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [tables, activeTenantId, queryClient]);
}
