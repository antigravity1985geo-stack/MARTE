import { useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useActivityLog } from '@/hooks/useActivityLog';

export interface Anomaly {
    id: string;
    type: 'large_sale' | 'suspicious_login' | 'stock_jump';
    severity: 'low' | 'medium' | 'high';
    description: string;
    date: string;
}

export function useAnomalies() {
    const { transactions } = useTransactions();
    // In a real app, we'd fetch actual login logs from a table, 
    // but here we can check activity_logs for suspicious patterns.

    const anomalies = useMemo(() => {
        const list: Anomaly[] = [];

        // 1. Large Sale Detection (3x the average of last 50 sales)
        const sales = transactions.filter(t => t.type === 'sale').slice(0, 50);
        if (sales.length > 5) {
            const avg = sales.reduce((sum, t) => sum + t.total, 0) / sales.length;
            sales.forEach(t => {
                if (t.total > avg * 4) {
                    list.push({
                        id: `sale-${t.id}`,
                        type: 'large_sale',
                        severity: 'medium',
                        description: `უჩვეულოდ დიდი გაყიდვა: ${t.total.toFixed(0)} ₾ (საშუალოზე 4-ჯერ მეტი)`,
                        date: t.date
                    });
                }
            });
        }

        // 2. Mocking suspicious login for demo 
        // In production, this would scan auth log table

        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    return { anomalies };
}
