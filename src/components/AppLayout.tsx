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

export function AppLayout() {
  useLowStockAlerts();
  useAutoOrders();
  useRealtimeNotifications();
  useSessionManager();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 lg:p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
      <AiAssistant />
      <CommandPalette />
      <OnboardingTour />
    </div>
  );
}
