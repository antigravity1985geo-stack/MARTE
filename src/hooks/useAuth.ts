import { useAuthStore } from '@/stores/useAuthStore';

export function useAuth() {
  const { user, isAuthenticated } = useAuthStore();
  return { 
    user, 
    isAuthenticated,
    isSuperadmin: !!user?.isSuperadmin
  };
}
