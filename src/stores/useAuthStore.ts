import { create } from 'zustand';
import type { Session, Subscription } from '@supabase/supabase-js';
import { supabase, setTenantIdProvider } from '@/integrations/supabase/client';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  isSuperadmin: boolean;
  referralCode?: string;
  referredBy?: string;
}

export interface Tenant {
  id: string;
  name: string;
  industry: string;
  role: string;
  subscription_plan?: string;
  subscription_status?: string;
  features?: any;
  limits?: any;
  usage?: any;
}

interface AuthStore {
  user: AuthUser | null;
  tenants: Tenant[];
  activeTenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setActiveTenant: (id: string) => void;
  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, businessName: string, industry: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

let authInitialized = false;
let authSubscription: Subscription | null = null;

export const useAuthStore = create<AuthStore>((set, get) => {
  // Hook the Supabase client interceptor up to our Zustand state
  setTenantIdProvider(() => get().activeTenantId);

  const hydrateFromSession = async (session: Session | null) => {
    if (!session?.user) {
      set({ user: null, tenants: [], activeTenantId: null, isAuthenticated: false, isLoading: false });
      return;
    }

    const fallbackName =
      session.user.user_metadata?.full_name ||
      session.user.email?.split('@')[0] ||
      '';

    let profileData: any = null;
    let tenantsList: Tenant[] = [];

    try {
      const [profileRes, tenantsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, is_superadmin, referral_code, referred_by').eq('id', session.user.id).maybeSingle(),
        supabase.from('tenant_members').select(`role, tenants(id, name, industry, features, limits, usage, subscription_plan, subscription_status)`).eq('user_id', session.user.id)
      ]);

      profileData = profileRes.data;
      if (tenantsRes.data) {
        tenantsList = tenantsRes.data.map((t: any) => ({
          id: t.tenants.id,
          name: t.tenants.name,
          industry: t.tenants.industry,
          role: t.role,
          subscription_plan: t.tenants.subscription_plan || 'free',
          subscription_status: t.tenants.subscription_status || 'active',
          features: t.tenants.features || {},
          limits: t.tenants.limits || {},
          usage: t.tenants.usage || {},
        }));
      }
    } catch (e) {
      console.error('Error loading user profile or tenants', e);
    }
    
    // Pick active tenant from localStorage or default to first
    const savedTenantId = localStorage.getItem('marte_active_tenant');
    
    // SUPERADMIN "LOGIN AS" BYPASS
    if (profileData?.is_superadmin && savedTenantId && !tenantsList.find(t => t.id === savedTenantId)) {
      // Fetch that tenant so superadmin can pretend to be a member
      const { data: targetTenant } = await supabase.from('tenants').select('id, name, industry, features, limits, usage, subscription_plan, subscription_status').eq('id', savedTenantId).maybeSingle();
      if (targetTenant) {
        tenantsList.push({
          id: targetTenant.id,
          name: targetTenant.name,
          industry: targetTenant.industry,
          role: 'owner', // Fake owner role to give full access during impersonation
          subscription_plan: targetTenant.subscription_plan || 'pro', // Superadmin usually impersonates with full access 
          subscription_status: targetTenant.subscription_status || 'active',
          features: targetTenant.features || {},
          limits: targetTenant.limits || {},
          usage: targetTenant.usage || {},
        });
      }
    }

    let activeTenantId = savedTenantId && tenantsList.find(t => t.id === savedTenantId) 
      ? savedTenantId 
      : (tenantsList.length > 0 ? tenantsList[0].id : session.user.id);

    // If we updated to a new default, save it
    localStorage.setItem('marte_active_tenant', activeTenantId);

    set({
      user: {
        id: session.user.id,
        email: session.user.email || '',
        fullName: profileData?.full_name || fallbackName,
        isSuperadmin: !!profileData?.is_superadmin,
        referralCode: profileData?.referral_code,
        referredBy: profileData?.referred_by,
      },
      tenants: tenantsList,
      activeTenantId,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  return {
    user: null,
    tenants: [],
    activeTenantId: null,
    isAuthenticated: false,
    isLoading: true,
    
    setActiveTenant: (id: string) => {
      localStorage.setItem('marte_active_tenant', id);
      set({ activeTenantId: id });
    },

    initialize: () => {
      if (authInitialized) return;
      authInitialized = true;

      void supabase.auth.getSession().then(({ data: { session } }) => {
        void hydrateFromSession(session);
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        // Do not await inside callback: prevents auth deadlocks.
        void hydrateFromSession(session);
      });

      authSubscription = data.subscription;
    },

    login: async (email, password) => {
      if (!email || !password) throw new Error('შეავსეთ ყველა ველი');
      
      set({ isLoading: true });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        set({ isLoading: false });
        throw new Error(error.message);
      }

      if (data.session) {
        await hydrateFromSession(data.session);
      } else {
        set({ isLoading: false });
      }
    },

    register: async (email, password, fullName, businessName, industry, referralCode) => {
      if (!email || !password || !fullName || !businessName) throw new Error('შეავსეთ ყველა სავალდებულო ველი');
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { 
            full_name: fullName.trim(),
            businessName: businessName.trim(),
            industry: industry || 'retail',
            referralCode: referralCode || null
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw new Error(error.message);
    },

    logout: () => {
      void supabase.auth.signOut();
      authSubscription?.unsubscribe();
      authSubscription = null;
      authInitialized = false;
      localStorage.removeItem('marte_active_tenant');
      set({ user: null, tenants: [], activeTenantId: null, isAuthenticated: false, isLoading: false });
    },

    resetPassword: async (email) => {
      if (!email) throw new Error('შეიყვანეთ ელ-ფოსტა');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
    },
  };
});
