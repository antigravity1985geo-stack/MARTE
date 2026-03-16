import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/AppLayout";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import InstallPage from "@/pages/InstallPage";
import LandingPage from "@/pages/Index";
import CustomerDisplay from "@/pages/CustomerDisplay";

// Pages
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import MarteHomeMarketplace from "@/pages/real-estate/MarteHomeMarketplace";
import PropertyDetail from "@/pages/real-estate/PropertyDetail";
import DashboardPage from "@/pages/DashboardPage";
import POSPage from "@/pages/POSPage";
import ProductsPage from "@/pages/ProductsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import ReceivingPage from "@/pages/ReceivingPage";
import SalesPage from "@/pages/SalesPage";
import InvoicesPage from "@/pages/InvoicesPage";
import OrdersPage from "@/pages/OrdersPage";
import WarehouseManagementPage from "@/pages/WarehouseManagementPage";
import { InventoryCountPage } from "@/pages/InventoryCountPage";
import ProductionPage from "@/pages/ProductionPage";
import ClientsPage from "@/pages/ClientsPage";
import SuppliersPage from "@/pages/SuppliersPage";
import ExpensesPage from "@/pages/ExpensesPage";
import SupplierSettlementsPage from "@/pages/SupplierSettlementsPage";
import AccountingPage from "@/pages/AccountingPage";
import PricingPage from "@/pages/PricingPage";
import RSGEPage from "@/pages/RSGEPage";
import FiscalReportPage from "@/pages/FiscalReportPage";
import EmployeesPage from "@/pages/EmployeesPage";
import ShiftHistoryPage from "@/pages/ShiftHistoryPage";
import QueuePage from "@/pages/QueuePage";
import ReceiptSettingsPage from "@/pages/ReceiptSettingsPage";
import GuidePage from "@/pages/GuidePage";
import ProfilePage from "@/pages/ProfilePage";
import CashierStatsPage from "@/pages/CashierStatsPage";
import AdminPanelPage from "@/pages/AdminPanelPage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import DataExportPage from "@/pages/DataExportPage";
import AccountingRulesPage from "@/pages/AccountingRulesPage";
import ReconciliationPage from "@/pages/ReconciliationPage";
import LandedCostPage from "@/pages/LandedCostPage";
import NotFound from "@/pages/NotFound";
import AccessDeniedPage from "@/pages/AccessDeniedPage";
import SalaryPage from "@/pages/SalaryPage";
import ReturnsPage from "@/pages/ReturnsPage";
import CurrencyPage from "@/pages/CurrencyPage";
import BranchesPage from "@/pages/BranchesPage";
import FixedAssetsPage from "@/pages/FixedAssetsPage";
import CashFlowPage from "@/pages/CashFlowPage";
import InventoryMethodsPage from "@/pages/InventoryMethodsPage";
import BankIntegrationPage from "@/pages/BankIntegrationPage";
import DistributionPage from "@/pages/DistributionPage";
import EcommercePage from "@/pages/EcommercePage";
import AttendancePage from "@/pages/AttendancePage";
import CRMPage from '@/pages/CRMPage';
import NotificationsPage from '@/pages/NotificationsPage';
import BundlesPage from '@/pages/BundlesPage';
import PriceRulesPage from '@/pages/PriceRulesPage';
import ReportsPage from '@/pages/ReportsPage';
import SystemMonitorPage from '@/pages/SystemMonitorPage';
import SalonCalendarPage from "@/pages/SalonCalendarPage";
import SuperAdminPage from "@/pages/SuperAdminPage";
import ClinicCalendarPage from "@/pages/clinic/ClinicCalendarPage";
import ClinicPatientsPage from "@/pages/clinic/ClinicPatientsPage";
import ClinicPatientDetailsPage from "@/pages/clinic/ClinicPatientDetailsPage";
import RealEstateDashboard from "@/pages/real-estate/RealEstateDashboard";
import PropertyList from "@/pages/real-estate/PropertyList";
import MortgageManagement from "@/pages/real-estate/MortgageManagement";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 წუთი — ხშირი რეფეჩის თავიდან აცილება
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
      onError: (error: Error) => {
        console.error('Mutation error:', error.message);
      },
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, tenants, activeTenantId, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check subscription status
  const activeTenant = tenants.find(t => t.id === activeTenantId);
  if (activeTenant?.subscription_status === 'suspended' && !user?.isSuperadmin) {
    return <Navigate to="/access-denied" state={{ reason: 'suspended' }} replace />;
  }

  return <>{children}</>;
}

function RoleRoute({ children, path }: { children: React.ReactNode; path: string }) {
  const { hasAccess, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasAccess(path)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}

function AppInit({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  useEffect(() => { initialize(); }, [initialize]);
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <PWAUpdatePrompt />
          <BrowserRouter>
            <AppInit>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/customer-display" element={<ErrorBoundary><CustomerDisplay /></ErrorBoundary>} />
                <Route path="/martehome" element={<MarteHomeMarketplace />} />
                <Route path="/martehome/property/:id" element={<PropertyDetail />} />
                <Route path="/access-denied" element={<AccessDeniedPage />} />

                {/* Legacy Redirects */}
                <Route path="/pos" element={<Navigate to="/app/pos" replace />} />
                <Route path="/products" element={<Navigate to="/app/products" replace />} />
                <Route path="/sales" element={<Navigate to="/app/sales" replace />} />
                <Route path="/receiving" element={<Navigate to="/app/receiving" replace />} />

                <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  {/* ყველასთვის ხელმისაწვდომი */}
                  <Route index element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                  <Route path="pos" element={<ErrorBoundary><POSPage /></ErrorBoundary>} />
                  <Route path="products" element={<ErrorBoundary><ProductsPage /></ErrorBoundary>} />
                  <Route path="bundles" element={<ErrorBoundary><BundlesPage /></ErrorBoundary>} />
                  <Route path="price-rules" element={<ErrorBoundary><PriceRulesPage /></ErrorBoundary>} />
                  <Route path="categories" element={<ErrorBoundary><CategoriesPage /></ErrorBoundary>} />
                  <Route path="sales" element={<ErrorBoundary><SalesPage /></ErrorBoundary>} />
                  <Route path="queue" element={<ErrorBoundary><QueuePage /></ErrorBoundary>} />
                  <Route path="guide" element={<ErrorBoundary><GuidePage /></ErrorBoundary>} />
                  <Route path="install" element={<ErrorBoundary><InstallPage /></ErrorBoundary>} />
                  <Route path="profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />

                  {/* როლზე დაფუძნებული წვდომა */}
                  <Route path="receiving" element={<RoleRoute path="/receiving"><ErrorBoundary><ReceivingPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="invoices" element={<RoleRoute path="/invoices"><ErrorBoundary><InvoicesPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="orders" element={<RoleRoute path="/orders"><ErrorBoundary><OrdersPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="warehouse-management" element={<RoleRoute path="/warehouse-management"><ErrorBoundary><WarehouseManagementPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="inventory-count" element={<RoleRoute path="/warehouse-management"><ErrorBoundary><InventoryCountPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="production" element={<RoleRoute path="/production"><ErrorBoundary><ProductionPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="clients" element={<RoleRoute path="/clients"><ErrorBoundary><ClientsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="suppliers" element={<RoleRoute path="/suppliers"><ErrorBoundary><SuppliersPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="expenses" element={<RoleRoute path="/expenses"><ErrorBoundary><ExpensesPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="supplier-settlements" element={<RoleRoute path="/supplier-settlements"><ErrorBoundary><SupplierSettlementsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="accounting" element={<RoleRoute path="/accounting"><ErrorBoundary><AccountingPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="pricing" element={<RoleRoute path="/pricing"><ErrorBoundary><PricingPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="rsge" element={<RoleRoute path="/rsge"><ErrorBoundary><RSGEPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="fiscal-report" element={<RoleRoute path="/fiscal-report"><ErrorBoundary><FiscalReportPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="employees" element={<RoleRoute path="/employees"><ErrorBoundary><EmployeesPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="shift-history" element={<RoleRoute path="/shift-history"><ErrorBoundary><ShiftHistoryPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="cashier-stats" element={<RoleRoute path="/cashier-stats"><ErrorBoundary><CashierStatsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="receipt-settings" element={<RoleRoute path="/receipt-settings"><ErrorBoundary><ReceiptSettingsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="admin-panel" element={<RoleRoute path="/admin-panel"><ErrorBoundary><AdminPanelPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="super-admin" element={<RoleRoute path="/super-admin"><ErrorBoundary><SuperAdminPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="system-monitor" element={<RoleRoute path="/admin-panel"><ErrorBoundary><SystemMonitorPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="activity-log" element={<RoleRoute path="/activity-log"><ErrorBoundary><ActivityLogPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="data-export" element={<RoleRoute path="/data-export"><ErrorBoundary><DataExportPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="reports" element={<RoleRoute path="/reports"><ErrorBoundary><ReportsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="salary" element={<RoleRoute path="/salary"><ErrorBoundary><SalaryPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="returns" element={<RoleRoute path="/returns"><ErrorBoundary><ReturnsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="currency" element={<RoleRoute path="/currency"><ErrorBoundary><CurrencyPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="branches" element={<RoleRoute path="/branches"><ErrorBoundary><BranchesPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="fixed-assets" element={<RoleRoute path="/fixed-assets"><ErrorBoundary><FixedAssetsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="cash-flow" element={<RoleRoute path="/cash-flow"><ErrorBoundary><CashFlowPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="inventory-methods" element={<RoleRoute path="/inventory-methods"><ErrorBoundary><InventoryMethodsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="bank-integration" element={<RoleRoute path="/bank-integration"><ErrorBoundary><BankIntegrationPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="distribution" element={<RoleRoute path="/distribution"><ErrorBoundary><DistributionPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="ecommerce" element={<RoleRoute path="/ecommerce"><ErrorBoundary><EcommercePage /></ErrorBoundary></RoleRoute>} />
                  <Route path="attendance" element={<RoleRoute path="/attendance"><ErrorBoundary><AttendancePage /></ErrorBoundary></RoleRoute>} />
                  <Route path="crm" element={<RoleRoute path="/crm"><ErrorBoundary><CRMPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="accounting-rules" element={<RoleRoute path="/accounting-rules"><ErrorBoundary><AccountingRulesPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="reconciliation" element={<RoleRoute path="/reconciliation"><ErrorBoundary><ReconciliationPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="landed-cost" element={<RoleRoute path="/landed-cost"><ErrorBoundary><LandedCostPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="notifications" element={<RoleRoute path="/notifications"><ErrorBoundary><NotificationsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="salon/calendar" element={<RoleRoute path="/salon/calendar"><ErrorBoundary><SalonCalendarPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="clinic/calendar" element={<RoleRoute path="/clinic/calendar"><ErrorBoundary><ClinicCalendarPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="clinic/patients" element={<RoleRoute path="/clinic/patients"><ErrorBoundary><ClinicPatientsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="clinic/patients/:id" element={<RoleRoute path="/clinic/patients"><ErrorBoundary><ClinicPatientDetailsPage /></ErrorBoundary></RoleRoute>} />
                  
                  {/* MARTEHOME (Real Estate) */}
                  <Route path="real-estate" element={<ErrorBoundary><RealEstateDashboard /></ErrorBoundary>} />
                  <Route path="real-estate/properties" element={<RoleRoute path="/app/real-estate/properties"><ErrorBoundary><PropertyList /></ErrorBoundary></RoleRoute>} />
                  <Route path="real-estate/mortgages" element={<RoleRoute path="/app/real-estate/mortgages"><ErrorBoundary><MortgageManagement /></ErrorBoundary></RoleRoute>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppInit>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
