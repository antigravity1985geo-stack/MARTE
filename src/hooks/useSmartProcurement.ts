import { useMemo } from 'react';
import { useTransactions } from './useTransactions';
import { useProducts, SupabaseProduct } from './useProducts';
import { subDays, isAfter, parseISO } from 'date-fns';

export interface ProcurementSuggestion {
    productId: string;
    productName: string;
    currentStock: number;
    dailyVelocity: number;
    daysRemaining: number;
    suggestedQuantity: number;
    priority: 'high' | 'medium' | 'low';
    reason: string;
}

export function useSmartProcurement(lookbackDays = 30, safetyDays = 14) {
    const { transactions } = useTransactions();
    const { products } = useProducts();

    const suggestions = useMemo(() => {
        if (!transactions.length || !products.length) return [];

        const lookbackDate = subDays(new Date(), lookbackDays);

        // 1. Calculate historical sales per product
        const salesMap: Record<string, number> = {};

        transactions.forEach(tx => {
            // Only count sales (not returns or purchases)
            if (tx.type !== 'sale') return;

            const txDate = parseISO(tx.date);
            if (isAfter(txDate, lookbackDate)) {
                tx.items?.forEach(item => {
                    salesMap[item.product_id] = (salesMap[item.product_id] || 0) + item.quantity;
                });
            }
        });

        // 2. Generate suggestions
        return products.map(product => {
            const totalSold = salesMap[product.id] || 0;
            const dailyVelocity = totalSold / lookbackDays;

            if (dailyVelocity === 0 && product.stock > 0) return null;

            const daysRemaining = dailyVelocity > 0 ? product.stock / dailyVelocity : Infinity;

            // If we have less than safetyDays left, or if we are already below min_stock
            if (daysRemaining < safetyDays || product.stock <= product.min_stock) {
                const targetStock = dailyVelocity * 30; // Aim for 30 days of stock
                const suggestedQuantity = Math.max(0, Math.ceil(targetStock - product.stock));

                if (suggestedQuantity <= 0 && product.stock > product.min_stock) return null;

                let priority: 'high' | 'medium' | 'low' = 'low';
                if (daysRemaining < 3 || product.stock === 0) priority = 'high';
                else if (daysRemaining < 7) priority = 'medium';

                let reason = '';
                if (product.stock === 0) reason = 'მარაგი ამოწურულია';
                else if (daysRemaining < 1) reason = 'მარაგი დღეს ამოიწურება';
                else reason = `მარაგი გეყოფათ ${Math.round(daysRemaining)} დღე`;

                return {
                    productId: product.id,
                    productName: product.name,
                    currentStock: product.stock,
                    dailyVelocity,
                    daysRemaining: isFinite(daysRemaining) ? daysRemaining : 999,
                    suggestedQuantity: suggestedQuantity || Math.max(10, product.min_stock * 2),
                    priority,
                    reason
                } as ProcurementSuggestion;
            }

            return null;
        }).filter(Boolean) as ProcurementSuggestion[];
    }, [transactions, products, lookbackDays, safetyDays]);

    return { suggestions };
}
