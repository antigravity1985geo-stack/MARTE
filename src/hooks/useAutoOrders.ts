import { useEffect, useRef } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAutoOrderRules, useAutoOrderGlobal } from '@/hooks/useAutoOrderRules';
import { useOrderStore } from '@/stores/useOrderStore';
import { useNotificationStore } from '@/stores/useNotificationStore';

export function useAutoOrders() {
  const { products } = useProducts();
  const { suppliers } = useSuppliers();
  const { rules, addHistoryEntry } = useAutoOrderRules();
  const { globalEnabled } = useAutoOrderGlobal();
  const addOrder = useOrderStore((s) => s.addOrder);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const ordered = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!globalEnabled) return;

    rules.forEach((rule) => {
      if (!rule.enabled) return;
      const product = products.find((p) => p.id === rule.productId);
      const supplier = suppliers.find((s) => s.id === rule.supplierId);
      if (!product || !supplier) return;

      if (product.stock <= product.min_stock && !ordered.current.has(rule.id)) {
        ordered.current.add(rule.id);

        const orderId = crypto.randomUUID();
        const totalAmount = rule.orderQuantity * product.buy_price;

        addOrder({
          id: orderId,
          supplierId: rule.supplierId,
          supplierName: supplier.name,
          items: [{
            productId: rule.productId,
            name: product.name,
            quantity: rule.orderQuantity,
            price: product.buy_price,
          }],
          status: 'pending',
          totalAmount,
          date: new Date().toISOString(),
        });

        addHistoryEntry.mutate({
          rule_id: rule.id,
          product_id: rule.productId,
          product_name: product.name,
          supplier_id: rule.supplierId,
          supplier_name: supplier.name,
          quantity: rule.orderQuantity,
          total_amount: totalAmount,
          order_id: orderId,
        });

        addNotification({
          title: '🔄 ავტო-შეკვეთა შეიქმნა',
          message: `${product.name} — ${rule.orderQuantity} ${product.unit} → ${supplier.name}`,
          type: 'info',
        });
      }

      if (product.stock > product.min_stock && ordered.current.has(rule.id)) {
        ordered.current.delete(rule.id);
      }
    });
  }, [products, rules, globalEnabled, suppliers, addOrder, addNotification, addHistoryEntry]);
}
