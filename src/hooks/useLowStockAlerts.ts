import { useEffect, useRef } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useNotifications } from '@/hooks/useNotifications';

export function useLowStockAlerts() {
  const { products } = useProducts();
  const { addNotification } = useNotifications();
  const addNotificationRef = useRef(addNotification.mutate);
  addNotificationRef.current = addNotification.mutate;
  const alerted = useRef<Set<string>>(new Set());

  useEffect(() => {
    products.forEach((p) => {
      if (p.stock <= p.min_stock && !alerted.current.has(p.id)) {
        alerted.current.add(p.id);
        addNotificationRef.current({
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
  }, [products]);

  const lowStockProducts = products.filter((p) => p.stock <= p.min_stock);
  return { lowStockProducts, lowStockCount: lowStockProducts.length };
}
