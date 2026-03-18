import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, Package, Download, TrendingUp,
  ClipboardList, Warehouse, Factory, Users, Truck, Receipt,
  Calculator, FileText, BarChart3,
  UserCog, Clock, ListOrdered, LogOut,
  Menu, X, Activity,
  Globe, Building2, Building,
  ShieldCheck, CalendarDays, Lock, Home, Key, Stethoscope, Wallet2, Settings, Gift, Scissors
} from 'lucide-react';
import { Heart } from 'lucide-react';
import { AVAILABLE_FEATURES, isFeatureLocked, IndustryType, PlanType } from '@/config/features';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import { useI18n } from '@/hooks/useI18n';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getSections = (
  industry: IndustryType,
  features: any = {},
  plan: PlanType = 'free',
  isSuperadmin: boolean = false,
  t: (k: any) => string
) => {
  const isEnabled = (id: string) => {
    if (isSuperadmin) return true;
    if (features[id] === true) return true;
    if (features[id] === false) return false;
    const config = AVAILABLE_FEATURES.find(f => f.id === id);
    if (!config) return true;
    return config.industries.includes(industry as IndustryType);
  };

  const shouldLock = (id: string) => isFeatureLocked(id, plan as PlanType, isSuperadmin);
  const sections: any[] = [];

  // 1. Main
  sections.push({
    title: t('nav_section_main'),
    items: [
      { title: t('nav_dashboard'), icon: LayoutDashboard, path: '/app' },
      ...(isEnabled('pos') ? [{ title: t('nav_pos'), icon: Monitor, path: '/app/pos' }] : []),
      ...(isEnabled('real_estate') || isSuperadmin ? [{ title: 'Real Estate Home', icon: Home, path: '/app/real-estate' }] : []),
      ...(isEnabled('clinic') || isSuperadmin ? [{ title: t('nav_clinic_calendar'), icon: CalendarDays, path: '/app/clinic/calendar' }] : []),
      ...(isEnabled('salon') || isSuperadmin ? [{ title: t('nav_salon'), icon: CalendarDays, path: '/app/salon/calendar' }] : []),
    ],
  });

  // 2. Business Operations
  const operationItems: any[] = [];
  if (isEnabled('clinic') || isSuperadmin) operationItems.push({ title: t('nav_patients'), icon: Users, path: '/app/clinic/patients' });
  if (isEnabled('sales') || isSuperadmin) {
    operationItems.push({ title: t('nav_sales'), icon: TrendingUp, path: '/app/sales' });
    operationItems.push({ title: t('nav_orders'), icon: ListOrdered, path: '/app/orders' });
  }
  if (isEnabled('crm') || isSuperadmin) operationItems.push({ title: t('nav_clients'), icon: Heart, path: '/app/clients' });
  if (isEnabled('real_estate') || isSuperadmin) {
    operationItems.push({ title: 'ბინები / უძრავი ქონება', icon: Building, path: '/app/real-estate/properties' });
    operationItems.push({ title: 'იპოთეკა / გირაო', icon: Key, path: '/app/real-estate/mortgages' });
  }
  if (isEnabled('ecommerce') || isSuperadmin) {
    operationItems.push({ title: t('nav_ecommerce'), icon: Globe, path: '/app/ecommerce' });
  }
  if (operationItems.length > 0) sections.push({ title: t('nav_section_operations'), items: operationItems });

  // 3. Inventory & Management
  const managementItems: any[] = [];
  if (isEnabled('inventory') || isSuperadmin) {
    managementItems.push({ title: t('nav_products'), icon: Package, path: '/app/products' });
    if (isEnabled('clinic') || isSuperadmin) managementItems.push({ title: 'სამედიცინო სერვისები', icon: Stethoscope, path: '/app/clinic/services' });
    if (isEnabled('salon') || isSuperadmin) managementItems.push({ title: 'სალონის სერვისები', icon: Scissors, path: '/app/salon/services' });
    managementItems.push({ title: t('nav_warehouses'), icon: Warehouse, path: '/app/warehouse-management' });
    managementItems.push({ title: t('nav_inventory'), icon: ClipboardList, path: '/app/inventory-count' });
  }
  if (isEnabled('purchases') || isSuperadmin) {
    managementItems.push({ title: t('nav_receiving'), icon: Download, path: '/app/receiving' });
    managementItems.push({ title: t('nav_suppliers'), icon: Truck, path: '/app/suppliers' });
  }
  if (isEnabled('production') || isSuperadmin) {
    managementItems.push({ title: t('nav_production'), icon: Factory, path: '/app/production', isLocked: shouldLock('production') });
  }
  if (isEnabled('distribution') || isSuperadmin) {
    managementItems.push({ title: t('nav_distribution'), icon: Truck, path: '/app/distribution' });
  }
  if (managementItems.length > 0) sections.push({ title: t('nav_section_inventory'), items: managementItems });

  // 4. Finance
  const financeItems: any[] = [];
  if (isEnabled('accounting') || isSuperadmin) {
    financeItems.push({ title: t('nav_expenses'), icon: Receipt, path: '/app/expenses' });
    financeItems.push({ title: t('nav_invoices'), icon: FileText, path: '/app/invoices' });
    financeItems.push({ title: t('nav_accounting'), icon: Calculator, path: '/app/accounting', isLocked: shouldLock('accounting') });
    financeItems.push({ title: t('nav_reports'), icon: BarChart3, path: '/app/cash-flow' });
    financeItems.push({ title: t('nav_rsge'), icon: Globe, path: '/app/rsge' });
    if (isEnabled('analytics') || isSuperadmin) {
      financeItems.push({ title: t('nav_analytics'), icon: Activity, path: '/app/reports' });
    }
    if (isEnabled('fintech') || isSuperadmin) {
      financeItems.push({ title: t('nav_fintech'), icon: Wallet2, path: '/app/fintech' });
    }
  }
  if (isEnabled('hr') || isSuperadmin) financeItems.push({ title: t('nav_salary'), icon: Wallet2, path: '/app/salary' });
  if (financeItems.length > 0) sections.push({ title: t('nav_section_finance'), items: financeItems });

  // 5. Administration
  const adminItems: any[] = [];
  if (isEnabled('hr') || isSuperadmin) {
    adminItems.push({ title: t('nav_employees'), icon: UserCog, path: '/app/employees' });
    adminItems.push({ title: t('nav_attendance'), icon: Clock, path: '/app/attendance' });
  }
  adminItems.push({ title: t('nav_branches'), icon: Building2, path: '/app/branches' });
  adminItems.push({ title: t('marte_distributor'), icon: Gift, path: '/app/marte-distributor' });
  adminItems.push({ title: t('nav_settings'), icon: Settings, path: '/app/admin-panel' });
  if (isSuperadmin) {
    adminItems.push({ title: t('nav_system_monitor'), icon: Activity, path: '/app/system-monitor' });
    adminItems.push({ title: t('nav_activity_log'), icon: ClipboardList, path: '/app/activity-log' });
  }
  sections.push({ title: t('nav_section_admin'), items: adminItems });

  return sections;
};

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, tenants, activeTenantId, setActiveTenant } = useAuthStore();
  const { hasAccess, isLoading: roleLoading, roleName } = useUserRole();
  const { t, lang, setLang } = useI18n();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const activeTenant = tenants.find(tn => tn.id === activeTenantId);
  const industry = (activeTenant?.industry || 'retail') as IndustryType;
  const plan = (activeTenant?.subscription_plan || 'free') as PlanType;
  const dynamicSections = getSections(industry, activeTenant?.features, plan, user?.isSuperadmin || false, t);

  const filteredSections = user?.isSuperadmin
    ? dynamicSections
    : dynamicSections
        .map(section => ({ ...section, items: section.items.filter((item: any) => hasAccess(item.path)) }))
        .filter(section => section.items.length > 0);

  if (user?.isSuperadmin) {
    const adminSection = filteredSections.find(s => s.title === t('nav_section_admin'));
    if (adminSection && !adminSection.items.find((i: any) => i.path === '/app/super-admin')) {
      adminSection.items.unshift({ title: t('nav_superadmin'), icon: ShieldCheck, path: '/app/super-admin' });
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar w-64 border-r border-sidebar-border transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 p-5 h-16 border-b border-sidebar-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20">
          <div className="size-5 rotate-45 rounded-sm bg-primary shadow-[0_0_20px_var(--glow)]" />
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground uppercase truncate">MARTE</span>
        {!roleLoading && (
          <Badge variant="outline" className="ml-auto shrink-0 text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5 hidden xl:flex hover:bg-primary/10 transition-colors">
            {roleName}
          </Badge>
        )}
      </div>

      {/* Workspace Switcher */}
      {tenants.length > 1 && (
        <div className="p-4 mx-2 mt-4 mb-2 rounded-xl bg-sidebar-accent/50 border border-sidebar-border group transition-all hover:bg-sidebar-accent">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 px-1">{t('nav_company')}</p>
          <Select value={activeTenantId || ''} onValueChange={val => { setActiveTenant(val); window.location.reload(); }}>
            <SelectTrigger className="w-full bg-transparent border-none p-1 h-auto text-sm font-semibold text-foreground focus:ring-0 shadow-none">
              <SelectValue placeholder="აირჩიეთ ბიზნესი" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              {tenants.map(tn => (
                <SelectItem key={tn.id} value={tn.id} className="text-xs hover:bg-accent focus:bg-accent focus:text-accent-foreground transition-colors">
                  {tn.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-4 scrollbar-thin">
        {filteredSections.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? 'mt-8' : ''}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item: any) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.isLocked ? '#' : item.path}
                    onClick={e => { if (item.isLocked) { e.preventDefault(); return; } setMobileOpen(false); }}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${item.isLocked ? 'opacity-40 cursor-not-allowed grayscale' : ''}
                      ${isActive
                        ? 'bg-primary/15 text-primary shadow-[0_0_20px_var(--glow)]'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                      }`}
                  >
                    <item.icon className={`size-5 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <span>{item.title}</span>
                    {item.isLocked && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
                    {isActive && !item.isLocked && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </ScrollArea>

      <div className="border-t border-sidebar-border p-4 space-y-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200">
              <Globe className="h-4 w-4" />
              <span className="flex-1 text-left">
                {lang === 'ka' && '🇬🇪 ქართული'}
                {lang === 'en' && '🇬🇧 English'}
                {lang === 'ru' && '🇷🇺 Русский'}
                {lang === 'az' && '🇦🇿 Azərbaycan'}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-sidebar-border uppercase">{lang}</Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px] bg-popover border-border">
            <DropdownMenuItem onClick={() => setLang('ka')} className="cursor-pointer gap-2">
              <span>🇬🇪</span> ქართული
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang('en')} className="cursor-pointer gap-2">
              <span>🇬🇧</span> English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang('ru')} className="cursor-pointer gap-2">
              <span>🇷🇺</span> Русский
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang('az')} className="cursor-pointer gap-2">
              <span>🇦🇿</span> Azərbaycan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Button variant="ghost" size="icon" className="fixed top-3 left-3 z-50 lg:hidden text-white hover:bg-slate-800" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-40 lg:hidden transform transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </div>
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30 w-64">
        {sidebarContent}
      </div>
    </>
  );
}
