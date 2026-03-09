import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationStore } from '@/stores/useNotificationStore';

/** Request browser notification permission on mount */
function useBrowserNotificationPermission() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
}

/** Send a browser notification if permitted */
function sendBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/pwa-icon-192.png' });
    } catch {
      // Silent fail on environments that don't support Notification constructor
    }
  }
}

/**
 * Listens to realtime events from Supabase and triggers
 * both in-app and browser push notifications.
 */
export function useRealtimeNotifications() {
  useBrowserNotificationPermission();

  const addNotification = useNotificationStore((s) => s.addNotification);
  const addRef = useRef(addNotification);
  addRef.current = addNotification;

  useEffect(() => {
    const channel = supabase
      .channel('global_notifications')

      // ——— Shift events ———
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shifts' },
        (payload) => {
          const shift = payload.new as any;
          const title = '🟢 ცვლა გაიხსნა';
          const message = `მოლარე: ${shift.cashier_name}`;
          addRef.current({ title, message, type: 'info', link: '/shift-history' });
          sendBrowserNotification(title, message);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shifts', filter: 'is_open=eq.false' },
        (payload) => {
          const shift = payload.new as any;
          if (shift.closed_at) {
            const title = '🔴 ცვლა დაიხურა';
            const message = `მოლარე: ${shift.cashier_name}`;
            addRef.current({ title, message, type: 'info', link: '/shift-history' });
            sendBrowserNotification(title, message);
          }
        }
      )

      // ——— Sale events ———
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shift_sales' },
        (payload) => {
          const sale = payload.new as any;
          const title = '💰 ახალი გაყიდვა';
          const message = `თანხა: ${Number(sale.total).toFixed(2)} ₾ | მოლარე: ${sale.cashier_name}`;
          addRef.current({ title, message, type: 'success', link: '/sales' });
          sendBrowserNotification(title, message);
        }
      )

      // ——— Refund events ———
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shift_sales' },
        (payload) => {
          const sale = payload.new as any;
          if (sale.is_refunded && !payload.old?.is_refunded) {
            const title = '↩️ დაბრუნება';
            const message = `თანხა: ${Number(sale.total).toFixed(2)} ₾`;
            addRef.current({ title, message, type: 'warning', link: '/sales' });
            sendBrowserNotification(title, message);
          }
        }
      )

      // ——— Low stock (product updated with low stock) ———
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          const product = payload.new as any;
          const oldProduct = payload.old as any;
          if (
            product.stock <= product.min_stock &&
            oldProduct.stock > oldProduct.min_stock
          ) {
            const title = '⚠️ დაბალი მარაგი';
            const message = `${product.name} — მარაგი: ${product.stock} (მინ: ${product.min_stock})`;
            addRef.current({ title, message, type: 'warning', link: '/products' });
            sendBrowserNotification(title, message);
          }
        }
      )

      // ——— User invite / role change (activity_logs) ———
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          const log = payload.new as any;
          if (log.action === 'invite') {
            const title = '👤 ახალი მოწვევა';
            const message = `${log.user_name} — მოიწვია ${log.entity_name || 'მომხმარებელი'}`;
            addRef.current({ title, message, type: 'info', link: '/admin-panel' });
            sendBrowserNotification(title, message);
          }
          if (log.action === 'role_change') {
            const title = '🔑 როლი შეიცვალა';
            const message = `${log.entity_name || 'მომხმარებელი'} — ${log.user_name}`;
            addRef.current({ title, message, type: 'info', link: '/admin-panel' });
            sendBrowserNotification(title, message);
          }
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
