import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export type AppRole = 'admin' | 'cashier' | 'senior_cashier' | 'manager' | 'warehouse_manager' | 'hr' | 'accountant' | 'supplier' | 'driver';

// ყველა როლისთვის საერთო გვერდები
const COMMON_PATHS = [
  '/', '/pos', '/products', '/categories', '/sales', '/queue', '/profile', '/guide', 
  '/salon/calendar', '/clinic/calendar', '/clinic/patients', '/clinic/services', '/clinic/lab-orders',
  '/real-estate', '/real-estate/properties', '/real-estate/mortgages'
];

// როლზე დაფუძნებული წვდომა
export const ROLE_ALLOWED_PATHS: Record<AppRole, string[]> = {
  admin: ['*'], // ადმინს ყველა გვერდზე აქვს წვდომა
  manager: ['*'], // მენეჯერს ყველა გვერდზე აქვს წვდომა (admin-ის მსგავსი)
  cashier: [
    ...COMMON_PATHS,
  ],
  senior_cashier: [
    ...COMMON_PATHS,
    '/shift-history',
    '/cashier-stats',
    '/invoices',
    '/receiving',
    '/clients',
    '/expenses',
    '/receipt-settings',
    '/returns',
    '/salary',
    '/attendance',
  ],
  warehouse_manager: [
    ...COMMON_PATHS,
    '/receiving',
    '/warehouse-management',
    '/orders',
    '/suppliers',
    '/supplier-settlements',
    '/production',
    '/invoices',
    '/returns',
    '/inventory-methods',
    '/branches',
    '/distribution',
  ],
  hr: [
    ...COMMON_PATHS,
    '/employees',
    '/attendance',
    '/salary',
    '/shift-history',
  ],
  accountant: [
    ...COMMON_PATHS,
    '/accounting',
    '/cash-flow',
    '/expenses',
    '/invoices',
    '/clients',
    '/suppliers',
    '/supplier-settlements',
    '/salary',
  ],
  supplier: [
    '/',
    '/profile',
    '/orders',
  ],
  driver: [
    '/',
    '/profile',
    '/distribution',
  ],
};

// Legacy export for backward compatibility
export const CASHIER_ALLOWED_PATHS = ROLE_ALLOWED_PATHS.cashier;

export function useUserRole() {
  const user = useAuthStore((s) => s.user);
  const tenants = useAuthStore((s) => s.tenants);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: ['user_role', user?.id, activeTenantId],
    enabled: !!user?.id && !!activeTenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('tenant_id', activeTenantId!);
      if (error) throw error;
      return (data || []).map((r: any) => r.role as AppRole);
    },
    staleTime: 5 * 60 * 1000,
  });

  const roles = query.data || [];

  // Check if user is an owner of the active tenant
  const activeTenant = tenants.find(t => t.id === activeTenantId);
  const isOwner = activeTenant?.role === 'owner';

  const isAdmin = roles.includes('admin') || isOwner || user?.isSuperadmin === true;
  const isCashier = roles.includes('cashier');
  const isSeniorCashier = roles.includes('senior_cashier');
  const isManager = roles.includes('manager');
  const isWarehouseManager = roles.includes('warehouse_manager');
  const isHR = roles.includes('hr');
  const isAccountant = roles.includes('accountant');

  // შეაგროვე ყველა ნებადართული path
  const allowedPaths = new Set<string>(COMMON_PATHS);
  for (const role of roles) {
    const paths = ROLE_ALLOWED_PATHS[role];
    if (paths) {
      for (const p of paths) allowedPaths.add(p);
    }
  }

  const hasAccess = (path: string) => {
    if (user?.isSuperadmin === true) return true;
    if (isAdmin || isManager) return true;
    
    // Normalize path by removing /app prefix if present
    const normalizedPath = path.startsWith('/app') ? path.substring(4) : path;
    const pathToCheck = normalizedPath === '' ? '/' : normalizedPath;
    
    return allowedPaths.has(pathToCheck) || allowedPaths.has(path);
  };

  // როლის ქართული სახელი
  const roleName = isAdmin ? 'ადმინი'
    : isManager ? 'მენეჯერი'
      : isSeniorCashier ? 'უფროსი მოლარე'
        : isWarehouseManager ? 'საწყობის მენეჯერი'
          : isAccountant ? 'ბუღალტერი'
            : isHR ? 'HR მენეჯერი'
              : isCashier ? 'მოლარე'
                : 'მომხმარებელი';

  return {
    roles,
    isAdmin,
    isCashier,
    isSeniorCashier,
    isManager,
    isWarehouseManager,
    isHR,
    isAccountant,
    isLoading: query.isLoading,
    hasAccess,
    allowedPaths,
    roleName,
  };
}
