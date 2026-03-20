import { useAuthStore } from '@/stores/useAuthStore';

export function useTenant() {
  const { activeTenantId, tenants } = useAuthStore();
  const activeTenant = tenants.find(t => t.id === activeTenantId);
  return { 
    tenantId: activeTenantId, 
    tenant: activeTenant,
    isAdmin: activeTenant?.role === 'owner' || activeTenant?.role === 'admin'
  };
}
