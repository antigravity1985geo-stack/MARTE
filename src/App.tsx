import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/AppLayout";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
const InstallPage = lazy(() => import('@/pages/InstallPage'));
const LandingPage = lazy(() => import('@/pages/Index'));
const CustomerDisplay = lazy(() => import('@/pages/CustomerDisplay'));

// Pages
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const MarteHomeMarketplace = lazy(() => import('@/pages/real-estate/MarteHomeMarketplace'));
const PropertyDetail = lazy(() => import('@/pages/real-estate/PropertyDetail'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const POSPage = lazy(() => import('@/pages/POSPage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'));
const ReceivingPage = lazy(() => import('@/pages/ReceivingPage'));
const SalesPage = lazy(() => import('@/pages/SalesPage'));
const InvoicesPage = lazy(() => import('@/pages/InvoicesPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const WarehouseManagementPage = lazy(() => import('@/pages/WarehouseManagementPage'));
const InventoryCountPage = lazy(() => import('@/pages/InventoryCountPage').then(module => ({ default: module.InventoryCountPage })));
const ProductionPage = lazy(() => import('@/pages/ProductionPage'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const SuppliersPage = lazy(() => import('@/pages/SuppliersPage'));
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage'));
const SupplierSettlementsPage = lazy(() => import('@/pages/SupplierSettlementsPage'));
const AccountingPage = lazy(() => import('@/pages/AccountingPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const RSGEPage = lazy(() => import('@/pages/RSGEPage'));
const FiscalReportPage = lazy(() => import('@/pages/FiscalReportPage'));
const EmployeesPage = lazy(() => import('@/pages/EmployeesPage'));
const ShiftHistoryPage = lazy(() => import('@/pages/ShiftHistoryPage'));
const QueuePage = lazy(() => import('@/pages/QueuePage'));
const ReceiptSettingsPage = lazy(() => import('@/pages/ReceiptSettingsPage'));
const GuidePage = lazy(() => import('@/pages/GuidePage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const CashierStatsPage = lazy(() => import('@/pages/CashierStatsPage'));
const AdminPanelPage = lazy(() => import('@/pages/AdminPanelPage'));
const ActivityLogPage = lazy(() => import('@/pages/ActivityLogPage'));
const DataExportPage = lazy(() => import('@/pages/DataExportPage'));
const AccountingRulesPage = lazy(() => import('@/pages/AccountingRulesPage'));
const ReconciliationPage = lazy(() => import('@/pages/ReconciliationPage'));
const LandedCostPage = lazy(() => import('@/pages/LandedCostPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const AccessDeniedPage = lazy(() => import('@/pages/AccessDeniedPage'));
const SalaryPage = lazy(() => import('@/pages/SalaryPage'));
const ReturnsPage = lazy(() => import('@/pages/ReturnsPage'));
const CurrencyPage = lazy(() => import('@/pages/CurrencyPage'));
const BranchesPage = lazy(() => import('@/pages/BranchesPage'));
const FixedAssetsPage = lazy(() => import('@/pages/FixedAssetsPage'));
const CashFlowPage = lazy(() => import('@/pages/CashFlowPage'));
const InventoryMethodsPage = lazy(() => import('@/pages/InventoryMethodsPage'));
const FintechPage = lazy(() => import('@/pages/FintechPage'));
const DistributionPage = lazy(() => import('@/pages/DistributionPage'));
const EcommercePage = lazy(() => import('@/pages/EcommercePage'));
const AttendancePage = lazy(() => import('@/pages/AttendancePage'));
const CRMPage = lazy(() => import('@/pages/CRMPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const BundlesPage = lazy(() => import('@/pages/BundlesPage'));
const PriceRulesPage = lazy(() => import('@/pages/PriceRulesPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const SystemMonitorPage = lazy(() => import('@/pages/SystemMonitorPage'));
const SalonCalendarPage = lazy(() => import('@/pages/SalonCalendarPage'));
const SuperAdminPage = lazy(() => import('@/pages/SuperAdminPage'));
const ClinicCalendarPage = lazy(() => import('@/pages/clinic/ClinicCalendarPage'));
const ClinicPatientsPage = lazy(() => import('@/pages/clinic/ClinicPatientsPage'));
const ClinicPatientDetailsPage = lazy(() => import('@/pages/clinic/ClinicPatientDetailsPage'));
const ClinicServicesPage = lazy(() => import('@/pages/clinic/ClinicServicesPage'));
const RealEstateDashboard = lazy(() => import('@/pages/real-estate/RealEstateDashboard'));
const PropertyList = lazy(() => import('@/pages/real-estate/PropertyList'));
const MortgageManagement = lazy(() => import('@/pages/real-estate/MortgageManagement'));
const MarteDistributorPage = lazy(() => import('@/pages/MarteDistributorPage'));

// Portal Pages
const PortalLayout = lazy(() => import('@/components/portal/PortalLayout').then(m => ({ default: m.PortalLayout })));
const PortalDashboard = lazy(() => import('@/pages/portal/PortalDashboard').then(m => ({ default: m.PortalDashboard })));
const PortalBooking = lazy(() => import('@/pages/portal/PortalBooking').then(m => ({ default: m.PortalBooking })));
const PortalHistory = lazy(() => import('@/pages/portal/PortalHistory').then(m => ({ default: m.PortalHistory })));
const PortalCatalog = lazy(() => import('@/pages/portal/PortalCatalog').then(m => ({ default: m.PortalCatalog })));
const PortalAuth = lazy(() => import('@/pages/portal/PortalAuth').then(m => ({ default: m.PortalAuth })));

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
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">იტვირთება...</p>
        </div>
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
              <Suspense fallback={
                <div className="flex h-[50vh] w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-sm border-primary text-muted-foreground" style={{borderTopColor: "transparent"}}>იტვირთება...</p>
                  </div>
                </div>
              }>
                <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/customer-display" element={<ErrorBoundary><CustomerDisplay /></ErrorBoundary>} />
                <Route path="/martehome" element={<MarteHomeMarketplace />} />
                <Route path="/martehome/property/:id" element={<PropertyDetail />} />
                <Route path="/access-denied" element={<AccessDeniedPage />} />

                {/* Client Portals */}
                <Route path="/portal/:tenant_slug/auth" element={<PortalAuth />} />
                <Route path="/portal/:tenant_slug" element={<PortalLayout />}>
                  <Route index element={<PortalDashboard />} />
                  <Route path="catalog" element={<PortalCatalog />} />
                  <Route path="booking" element={<PortalBooking />} />
                  <Route path="history" element={<PortalHistory />} />
                </Route>

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
                  <Route path="marte-distributor" element={<ErrorBoundary><MarteDistributorPage /></ErrorBoundary>} />

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
                  <Route path="fintech" element={<RoleRoute path="/app/fintech"><ErrorBoundary><FintechPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="returns" element={<RoleRoute path="/returns"><ErrorBoundary><ReturnsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="currency" element={<RoleRoute path="/currency"><ErrorBoundary><CurrencyPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="branches" element={<RoleRoute path="/branches"><ErrorBoundary><BranchesPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="fixed-assets" element={<RoleRoute path="/fixed-assets"><ErrorBoundary><FixedAssetsPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="cash-flow" element={<RoleRoute path="/cash-flow"><ErrorBoundary><CashFlowPage /></ErrorBoundary></RoleRoute>} />
                  <Route path="inventory-methods" element={<RoleRoute path="/inventory-methods"><ErrorBoundary><InventoryMethodsPage /></ErrorBoundary></RoleRoute>} />
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
                  <Route path="clinic/services" element={<RoleRoute path="/clinic/services"><ErrorBoundary><ClinicServicesPage /></ErrorBoundary></RoleRoute>} />
                  
                  {/* MARTEHOME (Real Estate) */}
                  <Route path="real-estate" element={<RoleRoute path="/real-estate"><ErrorBoundary><RealEstateDashboard /></ErrorBoundary></RoleRoute>} />
                  <Route path="real-estate/properties" element={<RoleRoute path="/real-estate/properties"><ErrorBoundary><PropertyList /></ErrorBoundary></RoleRoute>} />
                  <Route path="real-estate/mortgages" element={<RoleRoute path="/real-estate/mortgages"><ErrorBoundary><MortgageManagement /></ErrorBoundary></RoleRoute>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </AppInit>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
