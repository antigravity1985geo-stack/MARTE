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

export function AppLayout() {
  useLowStockAlerts();
  useAutoOrders();
  useRealtimeNotifications();
  useSessionManager();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalAnnouncements />
      <div className="flex flex-1 overflow-hidden relative">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-full lg:ml-64 relative">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 lg:p-6 scrollbar-thin">
            <Outlet />
          </main>
        </div>
      </div>
      <AiAssistant />
      <CommandPalette />
      <OnboardingTour />
    </div>
  );
}
