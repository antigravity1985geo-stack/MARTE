import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';

const INACTIVE_TIMEOUT_MS = 30 * 60 * 1000; // 30 წუთი
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 წუთი ადრე გაფრთხილება
const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 წუთში ერთხელ ტოკენის შემოწმება

/**
 * Manages session lifecycle:
 * - Auto-refresh tokens before expiry
 * - Inactive timeout with warning
 * - Graceful logout on session loss
 */
export function useSessionManager() {
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const inactiveTimer = useRef<ReturnType<typeof setTimeout>>();
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();
  const warningShown = useRef(false);

  const resetInactiveTimers = useCallback(() => {
    if (!isAuthenticated) return;
    warningShown.current = false;

    clearTimeout(warningTimer.current);
    clearTimeout(inactiveTimer.current);

    // Warning before auto-logout
    warningTimer.current = setTimeout(() => {
      warningShown.current = true;
      toast.warning('სესია მალე გაუქმდება უმოქმედობის გამო. დააკლიკეთ რამეს გასაგრძელებლად.', {
        duration: WARNING_BEFORE_MS,
        id: 'session-warning',
      });
    }, INACTIVE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Auto-logout
    inactiveTimer.current = setTimeout(() => {
      toast.error('სესია გაუქმდა უმოქმედობის გამო.');
      logout();
    }, INACTIVE_TIMEOUT_MS);
  }, [isAuthenticated, logout]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    const handler = () => resetInactiveTimers();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetInactiveTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      clearTimeout(warningTimer.current);
      clearTimeout(inactiveTimer.current);
    };
  }, [isAuthenticated, resetInactiveTimers]);

  // Periodic token refresh
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          toast.error('სესია ვადაგასულია. გთხოვთ ხელახლა შეხვიდეთ.');
          logout();
          return;
        }

        // Check if token expires within 5 minutes
        const expiresAt = data.session.expires_at;
        if (expiresAt) {
          const expiresInMs = expiresAt * 1000 - Date.now();
          if (expiresInMs < 5 * 60 * 1000) {
            await supabase.auth.refreshSession();
          }
        }
      } catch {
        // Silent fail — will retry next interval
      }
    }, TOKEN_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, logout]);
}
