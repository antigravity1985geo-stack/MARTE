import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { AiAssistant } from '@/components/AiAssistant';
import { CommandPalette } from '@/components/CommandPalette';
import { OnboardingTour } from '@/components/OnboardingTour';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';
import { useAutoOrders } from '@/hooks/useAutoOrders';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useSessionManager } from '@/hooks/useSessionManager';
import { GlobalAnnouncements } from '@/components/GlobalAnnouncements';
import { useI18n } from '@/hooks/useI18n';

export function AppLayout() {
  useLowStockAlerts();
  useAutoOrders();
  useRealtimeNotifications();
  useSessionManager();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalAnnouncements />
      <div className="flex flex-1 overflow-hidden relative">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-full lg:ml-64 relative">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 lg:p-6 scrollbar-thin">
            <Suspense fallback={
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-sm text-muted-foreground">{t('loading')}...</p>
                </div>
              </div>
            }>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <AiAssistant />
      <CommandPalette />
      <OnboardingTour />
    </div>
  );
}
