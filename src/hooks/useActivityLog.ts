import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  details: Record<string, any>;
  created_at: string;
}

type LogAction =
  | 'create' | 'update' | 'delete'
  | 'login' | 'logout'
  | 'open_shift' | 'close_shift'
  | 'sale' | 'refund'
  | 'invite' | 'role_change'
  | 'import' | 'export'
  | 'attendance_log' | 'salary_payment';

type EntityType =
  | 'product' | 'category' | 'client' | 'supplier'
  | 'employee' | 'shift' | 'transaction' | 'invoice'
  | 'expense' | 'warehouse' | 'order' | 'recipe'
  | 'user' | 'role' | 'queue_ticket' | 'attendance' | 'salary' | 'other';

export function useActivityLog() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const log = useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId = '',
      entityName = '',
      details = {},
    }: {
      action: LogAction;
      entityType: EntityType;
      entityId?: string;
      entityName?: string;
      details?: Record<string, any>;
    }) => {
      if (!user) return;
      const { error } = await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_name: user.fullName || user.email,
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        details,
      });
      if (error) console.error('Activity log error:', error);
    },
  });

  return { log: log.mutate, logAsync: log.mutateAsync };
}

export function useActivityLogs(limit = 100, entityType?: string) {
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('activity_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['activity_logs'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['activity_logs', limit, entityType],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (entityType) query = query.eq('entity_type', entityType);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ActivityLog[];
    },
    refetchInterval: 30000,
  });
}

// Action labels in Georgian
export const ACTION_LABELS: Record<string, string> = {
  create: 'შექმნა',
  update: 'რედაქტირება',
  delete: 'წაშლა',
  login: 'შესვლა',
  logout: 'გამოსვლა',
  open_shift: 'ცვლის გახსნა',
  close_shift: 'ცვლის დახურვა',
  sale: 'გაყიდვა',
  refund: 'დაბრუნება',
  invite: 'მოწვევა',
  role_change: 'როლის შეცვლა',
  import: 'იმპორტი',
  export: 'ექსპორტი',
  attendance_log: 'დასწრების აღრიცხვა',
  salary_payment: 'ხელფასის გაცემა',
};

export const ENTITY_LABELS: Record<string, string> = {
  product: 'პროდუქტი',
  category: 'კატეგორია',
  client: 'კლიენტი',
  supplier: 'მომწოდებელი',
  employee: 'თანამშრომელი',
  shift: 'ცვლა',
  transaction: 'ტრანზაქცია',
  invoice: 'ინვოისი',
  expense: 'ხარჯი',
  warehouse: 'საწყობი',
  order: 'შეკვეთა',
  recipe: 'რეცეპტი',
  user: 'მომხმარებელი',
  role: 'როლი',
  queue_ticket: 'რიგის ბილეთი',
  attendance: 'დასწრება',
  salary: 'ხელფასი',
  other: 'სხვა',
};
