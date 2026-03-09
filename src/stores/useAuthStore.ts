import { create } from 'zustand';
import type { Session, Subscription } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

let authInitialized = false;
let authSubscription: Subscription | null = null;

export const useAuthStore = create<AuthStore>((set) => {
  const hydrateFromSession = async (session: Session | null) => {
    if (!session?.user) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    const fallbackName =
      session.user.user_metadata?.full_name ||
      session.user.email?.split('@')[0] ||
      '';

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle();

      set({
        user: {
          id: session.user.id,
          email: session.user.email || '',
          fullName: profile?.full_name || fallbackName,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({
        user: {
          id: session.user.id,
          email: session.user.email || '',
          fullName: fallbackName,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    }
  };

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,

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
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(error.message);
    },

    register: async (email, password, fullName) => {
      if (!email || !password || !fullName) throw new Error('შეავსეთ ყველა ველი');
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
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
      set({ user: null, isAuthenticated: false, isLoading: false });
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
