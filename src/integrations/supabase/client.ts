import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 1. Create the base client instance
const baseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// 2. Multi-tenant configuration
let getActiveTenantId: () => string | null = () => null;

/**
 * Configure the provider for the active tenant ID.
 * This is used by the client wrapper to inject tenant filters.
 */
export const setTenantIdProvider = (provider: () => string | null) => {
  getActiveTenantId = provider;
};

// 3. Tables that should NOT have tenant_id automatic injection
const EXCLUDED_TABLES = [
  'tenants', 
  'tenant_members', 
  'user_roles', 
  'profiles', 
  'industry_configs', 
  'subscription_plans',
  'referral_usage',
  'audit_logs',
  'shift_summaries' // Usually session linked
];

// 4. Wrap .from() to inject tenant logic
const originalFrom = baseClient.from.bind(baseClient);

(baseClient as any).from = (table: string) => {
  const query = originalFrom(table);

  // If table is excluded, return the original query builder
  if (EXCLUDED_TABLES.includes(table)) {
    return query;
  }

  // Get current tenant
  const tenantId = getActiveTenantId();
  if (!tenantId) return query;

  // Patch methods to inject tenant_id
  const originalSelect = query.select.bind(query);
  const originalInsert = query.insert.bind(query);
  const originalUpdate = query.update.bind(query);
  const originalDelete = query.delete.bind(query);

  query.select = (...args: any[]) => originalSelect(...args).eq('tenant_id', tenantId);
  
  query.insert = (payload: any, options?: any) => {
    const inject = (obj: any) => ({ ...obj, tenant_id: tenantId });
    const data = Array.isArray(payload) ? payload.map(inject) : inject(payload);
    return originalInsert(data, options);
  };

  query.update = (payload: any, options?: any) => {
    return originalUpdate({ ...payload, tenant_id: tenantId }, options).eq('tenant_id', tenantId);
  };

  query.delete = (options?: any) => {
    return originalDelete(options).eq('tenant_id', tenantId);
  };

  return query;
};

// 5. Build-time and runtime check
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase: SupabaseClient = baseClient;
