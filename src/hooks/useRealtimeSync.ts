import { useEffect, useMemo } from 'react';
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

/**
 * Hook to synchronize local TanStack Query cache with Supabase Realtime events.
 * @param tables List of tables to monitor for changes.
 */
export function useRealtimeSync(tables: string[]) {
  const queryClient = useQueryClient();
  const { activeTenantId } = useAuthStore();
  
  // Use a stable key to prevent effect re-triggering on array literal changes
  const tablesKey = useMemo(() => tables.sort().join(','), [tables]);

  useEffect(() => {
    if (!activeTenantId || !tablesKey) return;

    const tablesToSync = tablesKey.split(',').filter(Boolean);
    
    console.log('[Realtime Sync] Initializing for:', tablesToSync);

    const channels = tablesToSync.map((table) => {
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
            queryKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: [key] });
            });
          }
        )
        .subscribe();
    });

    // Cleanup subscription on unmount or key change
    return () => {
      console.log('[Realtime Sync] Cleaning up channels for:', tablesToSync);
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [tablesKey, activeTenantId, queryClient]);
}
