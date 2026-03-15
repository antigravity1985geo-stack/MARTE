import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export interface AppNotification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
  createdAt?: string;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((n: any) => ({
        ...n,
        createdAt: n.created_at
      })) as AppNotification[];
    },
    enabled: !!user,
  });

  const addNotification = useMutation({
    mutationFn: async (notification: Omit<AppNotification, 'id' | 'read' | 'created_at' | 'createdAt'>) => {
      const { error } = await supabase
        .from('app_notifications')
        .insert({ 
          user_id: user?.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link || ''
        });
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('app_notifications')
        .update({ read: true })
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('app_notifications')
        .update({ read: true })
        .eq('user_id', user.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const removeNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('app_notifications')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('app_notifications')
        .delete()
        .eq('user_id', user.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = query.data || [];
  const unreadCount = () => notifications.filter(n => !n.read).length;

  return {
    notifications,
    isLoading: query.isLoading,
    error: query.error,
    addNotification,
    markRead,
    markAllRead,
    removeNotification,
    clearAll,
    unreadCount,
  };
}
