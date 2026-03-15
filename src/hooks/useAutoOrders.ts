import { useEffect, useRef } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAutoOrderRules, useAutoOrderGlobal } from '@/hooks/useAutoOrderRules';
import { useOrders } from '@/hooks/useOrders';
import { useNotifications } from '@/hooks/useNotifications';

export function useAutoOrders() {
  const { products } = useProducts();
  const { suppliers } = useSuppliers();
  const { rules, addHistoryEntry } = useAutoOrderRules();
  const { globalEnabled } = useAutoOrderGlobal();
  const { addOrder } = useOrders();
  const { addNotification } = useNotifications();
  const addOrderRef = useRef(addOrder.mutate);
  addOrderRef.current = addOrder.mutate;
  const addNotificationRef = useRef(addNotification.mutate);
  addNotificationRef.current = addNotification.mutate;
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

        addOrderRef.current({
          order_number: `PO-${Date.now()}`,
          supplier_id: rule.supplierId,
          supplier_name: supplier.name,
          items: [{
            product_id: rule.productId,
            product_name: product.name,
            quantity: rule.orderQuantity,
            price: product.buy_price,
            total: rule.orderQuantity * product.buy_price,
          }],
          status: 'pending',
          total_amount: totalAmount,
          order_date: new Date().toISOString().split('T')[0],
          expected_date: new Date().toISOString().split('T')[0],
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

        addNotificationRef.current({
          title: '🔄 ავტო-შეკვეთა შეიქმნა',
          message: `${product.name} — ${rule.orderQuantity} ${product.unit} → ${supplier.name}`,
          type: 'info',
        });
      }

      if (product.stock > product.min_stock && ordered.current.has(rule.id)) {
        ordered.current.delete(rule.id);
      }
    });
  }, [products, rules, globalEnabled, suppliers, addHistoryEntry]);
}
