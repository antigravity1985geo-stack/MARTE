import { useEffect, useRef } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useNotificationStore } from '@/stores/useNotificationStore';

export function useLowStockAlerts() {
  const { products } = useProducts();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const alerted = useRef<Set<string>>(new Set());

  useEffect(() => {
    products.forEach((p) => {
      if (p.stock <= p.min_stock && !alerted.current.has(p.id)) {
        alerted.current.add(p.id);
        addNotification({
          title: '⚠️ მარაგი დაბალია',
          message: `${p.name} — მარაგი: ${p.stock} ${p.unit} (მინ: ${p.min_stock})`,
          type: 'warning',
        });
      }
      // Reset alert if stock is replenished
      if (p.stock > p.min_stock && alerted.current.has(p.id)) {
        alerted.current.delete(p.id);
      }
    });
  }, [products, addNotification]);

  const lowStockProducts = products.filter((p) => p.stock <= p.min_stock);
  return { lowStockProducts, lowStockCount: lowStockProducts.length };
}
