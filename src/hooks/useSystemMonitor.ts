import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format, eachHourOfInterval, isWithinInterval } from 'date-fns';

export interface SystemHealth {
    uptime: string;
    dbLatency: number;
    storageUsed: string;
    apiStatus: 'healthy' | 'degraded' | 'down';
}

export interface ActivityTrend {
    hour: string;
    count: number;
}

export interface OperationStat {
    name: string;
    value: number;
}

export function useSystemMonitor() {
    // 1. Health Metrics (Simulated + real check)
    const healthQuery = useQuery({
        queryKey: ['system_health'],
        queryFn: async (): Promise<SystemHealth> => {
            const start = performance.now();
            const { error } = await supabase.from('activity_logs').select('id').limit(1);
            const end = performance.now();

            if (error) throw error;

            return {
                uptime: '99.98%',
                dbLatency: Math.round(end - start),
                storageUsed: '1.2 GB / 5 GB',
                apiStatus: 'healthy',
            };
        },
        refetchInterval: 60000,
    });

    // 2. Activity Trends (Aggregated from activity_logs)
    const activityTrendQuery = useQuery({
        queryKey: ['activity_trends'],
        queryFn: async (): Promise<ActivityTrend[]> => {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('created_at')
                .gte('created_at', subDays(new Date(), 1).toISOString());

            if (error) throw error;

            const hours = eachHourOfInterval({
                start: subDays(new Date(), 1),
                end: new Date(),
            });

            return hours.map(h => {
                const hLabel = format(h, 'HH:00');
                const count = data?.filter(log => {
                    const logDate = new Date(log.created_at);
                    return logDate.getHours() === h.getHours() && logDate.getDate() === h.getDate();
                }).length || 0;

                return { hour: hLabel, count };
            });
        },
    });

    // 3. Operational Distribution
    const operationalQuery = useQuery({
        queryKey: ['operational_stats'],
        queryFn: async (): Promise<OperationStat[]> => {
            const { data: logs, error } = await supabase
                .from('activity_logs')
                .select('action, entity_type')
                .limit(500);

            if (error) throw error;

            // Group by action
            const distribution = logs.reduce((acc: any, log) => {
                acc[log.action] = (acc[log.action] || 0) + 1;
                return acc;
            }, {});

            return Object.entries(distribution).map(([name, value]) => ({ name, value: value as number }));
        },
    });

    return {
        health: healthQuery.data,
        trends: activityTrendQuery.data || [],
        operationStats: operationalQuery.data || [],
        isLoading: healthQuery.isLoading || activityTrendQuery.isLoading || operationalQuery.isLoading,
    };
}
