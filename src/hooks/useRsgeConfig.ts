import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { rsgeCall, getRsgeAuditLogs, RsgeConfig, RsgeAuditLog } from '@/lib/rsge';
import { toast } from 'sonner';

// ---- useRsgeConfig: load & save RS.GE config from DB ----
export function useRsgeConfig() {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const queryClient = useQueryClient();

  const {
    data: config,
    isLoading,
    error,
    refetch,
  } = useQuery<RsgeConfig | null>({
    queryKey: ['rsge_config', tenantId],
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('rsge_configs')
        .select('su, sp, demo, company_tin, company_name, is_active')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data as RsgeConfig | null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newConfig: Partial<RsgeConfig> & { sp?: string }) => {
      if (!tenantId) throw new Error('tenant_id არ არის');
      // Use edge function to save (handles server-side auth)
      await rsgeCall('save_config', newConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rsge_config', tenantId] });
      toast.success('RS.GE კონფიგურაცია შენახულია');
    },
    onError: (err: any) => {
      toast.error(`შენახვის შეცდომა: ${err.message}`);
    },
  });

  return {
    config,
    isLoading,
    error,
    refetch,
    saveConfig: saveMutation.mutate,
    saveConfigAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}

// ---- useRsgeAuditLogs: load audit log from DB directly ----
export function useRsgeAuditLogs(limit = 50) {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  return useQuery<RsgeAuditLog[]>({
    queryKey: ['rsge_audit_logs', tenantId, limit],
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30s
    queryFn: async () => {
      if (!tenantId) return [];
      return getRsgeAuditLogs(tenantId, limit);
    },
  });
}

// ---- useRsgeFiscalShift: active shift state ----
export function useRsgeFiscalShift() {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const queryClient = useQueryClient();

  const { data: shift, isLoading } = useQuery({
    queryKey: ['rsge_fiscal_shift', tenantId],
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from('rsge_fiscal_shifts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_open', true)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },
  });

  const openShift = useMutation({
    mutationFn: async (cashierName: string) => {
      const result = await rsgeCall('open_shift', { cashierName });
      // Persist to DB
      if (tenantId) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('rsge_fiscal_shifts').insert({
          tenant_id: tenantId,
          cashier_id: user?.id,
          cashier_name: cashierName,
          rs_shift_id: result?.shift?.id || null,
          demo_mode: true, // will be updated based on config
        });
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rsge_fiscal_shift', tenantId] });
      toast.success('ფისკალური ცვლა გახსნილია');
    },
    onError: (err: any) => toast.error(`შეცდომა: ${err.message}`),
  });

  const closeShift = useMutation({
    mutationFn: async () => {
      const result = await rsgeCall('close_shift', {});
      if (tenantId && shift) {
        await supabase
          .from('rsge_fiscal_shifts')
          .update({ is_open: false, closed_at: new Date().toISOString() })
          .eq('id', shift.id);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rsge_fiscal_shift', tenantId] });
      toast.success('ფისკალური ცვლა დახურულია');
    },
    onError: (err: any) => toast.error(`შეცდომა: ${err.message}`),
  });

  return { shift, isLoading, openShift, closeShift };
}
