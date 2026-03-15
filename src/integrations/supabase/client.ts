import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Multi-Tenant Interceptor logic
let getActiveTenantId: () => string | null = () => null;

export const setTenantIdProvider = (provider: () => string | null) => {
  getActiveTenantId = provider;
};

const originalFrom = supabase.from.bind(supabase);
const EXCLUDED_TABLES = ['tenants', 'tenant_members', 'user_roles', 'profiles'];

(supabase as any).from = (table: string) => {
  const query = originalFrom(table);
  
  if (EXCLUDED_TABLES.includes(table)) {
    return query;
  }

  const originalInsert = query.insert.bind(query);
  const originalUpsert = query.upsert.bind(query);
  const originalSelect = query.select.bind(query);
  const originalUpdate = query.update.bind(query);
  const originalDelete = query.delete.bind(query);

  const injectTenant = (payload: any) => {
    const tenantId = getActiveTenantId();
    if (!tenantId) return payload; 
    
    if (Array.isArray(payload)) {
      return payload.map(item => ({ ...item, tenant_id: item.tenant_id || tenantId }));
    } else {
      return { ...payload, tenant_id: payload.tenant_id || tenantId };
    }
  };

  query.insert = (payload: any, options?: any) => {
    return originalInsert(injectTenant(payload), options);
  };

  query.upsert = (payload: any, options?: any) => {
    return originalUpsert(injectTenant(payload), options);
  };

  query.select = (...args: any[]) => {
    const q = originalSelect(...args);
    const tenantId = getActiveTenantId();
    return tenantId ? q.eq('tenant_id', tenantId) : q;
  };

  query.update = (...args: any[]) => {
    const q = originalUpdate(...args);
    const tenantId = getActiveTenantId();
    return tenantId ? q.eq('tenant_id', tenantId) : q;
  };

  query.delete = (...args: any[]) => {
    const q = originalDelete(...args);
    const tenantId = getActiveTenantId();
    return tenantId ? q.eq('tenant_id', tenantId) : q;
  };

  return query;
};
