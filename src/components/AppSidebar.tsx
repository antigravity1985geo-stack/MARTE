import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, Package, Tags, Download, TrendingUp,
  ClipboardList, Warehouse, Factory, Users, Truck, Receipt,
  HandCoins, Calculator, BadgePercent, FileText, BarChart3, PieChart,
  UserCog, Clock, ListOrdered, Printer, BookOpen, LogOut,
  Menu, X, Shield, Activity, HardDriveDownload, Wallet,
  RotateCcw, Globe, Building2, Building, Layers, ArrowDownLeft, Landmark, Heart, Bell, PackagePlus,
  Settings2, FileSearch, ShieldCheck, CalendarDays, Lock, Home, Key
} from 'lucide-react';
import { AVAILABLE_FEATURES, isFeatureLocked, IndustryType, PlanType } from '@/config/features';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getSections = (industry: IndustryType, features: any = {}, plan: PlanType = 'free', isSuperadmin: boolean = false) => {
  const isEnabled = (id: string) => {
    if (isSuperadmin) return true;
    if (features[id] === true) return true;
    if (features[id] === false) return false;
    const config = AVAILABLE_FEATURES.find(f => f.id === id);
    if (!config) return true;
    return config.industries.includes(industry as IndustryType);
  };

  const shouldLock = (id: string) => isFeatureLocked(id, plan as PlanType, isSuperadmin);

  const sections = [];

  // Main
  sections.push({
    title: 'მთავარი',
    items: [
      { title: 'მთავარი', icon: LayoutDashboard, path: '/app' },
      ...(isEnabled('pos') ? [{ title: 'POS სისტემა', icon: Monitor, path: '/app/pos' }] : []),
    ],
  });

  // Real Estate
  if (isEnabled('real_estate') || isSuperadmin) {
    sections.push({
      title: 'MARTEHOME (უძრავი ქონება)',
      items: [
        { title: 'დეშბორდი', icon: LayoutDashboard, path: '/app/real-estate' },
        { title: 'განცხადებები / ბინები', icon: Home, path: '/app/real-estate/properties' },
        { title: 'გირაო / იპოთეკა', icon: Key, path: '/app/real-estate/mortgages' },
        { title: 'MarteHome (საჯარო)', icon: Globe, path: '/martehome' },
      ],
    });
  }

  // Clinic
  if (isEnabled('clinic') || isSuperadmin) {
    sections.push({
      title: 'კლინიკა და ჯანდაცვა',
      items: [
        { title: 'ვიზიტების კალენდარი', icon: CalendarDays, path: '/app/clinic/calendar' },
        { title: 'პაციენტების ბაზა', icon: Users, path: '/app/clinic/patients' },
      ],
    });
  }

  // Logistics & Sales
  sections.push({
    title: (isEnabled('clinic') && !isSuperadmin) ? 'ლოჯისტიკა და მარაგები' : 'გაყიდვები & შემოსავლები',
    items: [
      ...(isEnabled('inventory') ? [{ title: 'პროდუქტები (მარაგი)', icon: Package, path: '/app/products' }] : []),
      ...(isEnabled('sales') ? [
        { title: 'კომბოები (Bundles)', icon: PackagePlus, path: '/app/bundles' },
        { title: 'ფასდაკლებები', icon: BadgePercent, path: '/app/price-rules' }
      ] : []),
      ...(isEnabled('inventory') ? [{ title: 'კატეგორიები', icon: Tags, path: '/app/categories' }] : []),
    ],
  });

  // Operations
  sections.push({
    title: 'ოპერაციები',
    items: [
      ...(isEnabled('purchases') ? [{ 
        title: 'შესყიდვების მიღება', 
        icon: Download, 
        path: '/app/receiving',
        isLocked: shouldLock('purchases')
      }] : []),
      ...(isEnabled('sales') ? [
        { title: 'გაყიდვები / სერვისები', icon: TrendingUp, path: '/app/sales' },
        { title: 'დაბრუნებები', icon: RotateCcw, path: '/app/returns' },
        { title: 'ინვოისები', icon: FileText, path: '/app/invoices' },
        { title: 'შეკვეთები', icon: ClipboardList, path: '/app/orders' }
      ] : []),
      ...(isEnabled('inventory') ? [{ title: 'საწყობები', icon: Warehouse, path: '/app/warehouse-management' }] : []),
      ...(isEnabled('production') ? [
        { title: 'წარმოება', icon: Factory, path: '/app/production', isLocked: shouldLock('production') },
      ] : []),
    ],
  });

  // CRM
  if (isEnabled('crm') || isEnabled('purchases') || isSuperadmin) {
    sections.push({
      title: (isEnabled('crm') || isSuperadmin) ? 'კონტაქტები' : 'მომწოდებლები',
      items: [
        ...(isEnabled('crm') ? [
          { title: 'კლიენტები', icon: Users, path: '/app/clients' },
          { title: 'CRM & ლოიალობა', icon: Heart, path: '/app/crm', isLocked: shouldLock('crm') }
        ] : []),
        ...(isEnabled('purchases') ? [{ title: 'მომწოდებლები', icon: Truck, path: '/app/suppliers' }] : []),
      ],
    });
  }

  // Salon
  if (isEnabled('salon') || isSuperadmin) {
    sections.push({
      title: 'მომსახურება / სალონი',
      items: [
        { title: 'ჯავშნები (Calendar)', icon: CalendarDays, path: '/app/salon/calendar' },
      ],
    });
  }

  // Finance
  if (isEnabled('accounting') || isEnabled('hr') || isSuperadmin) {
    sections.push({
      title: 'ფინანსები',
      items: [
        ...(isEnabled('accounting') ? [
          { title: 'ხარჯები', icon: Receipt, path: '/app/expenses' },
          { title: 'ანგარიშსწორება', icon: HandCoins, path: '/app/supplier-settlements' },
          { title: 'ბუღალტერია', icon: Calculator, path: '/app/accounting', isLocked: shouldLock('accounting') },
          { title: 'ფინანსური ანგარიშგება', icon: ArrowDownLeft, path: '/app/cash-flow', isLocked: shouldLock('accounting') },
          { title: 'საბანკო ინტეგრაცია', icon: Landmark, path: '/app/bank-integration', isLocked: shouldLock('accounting') },
          { title: 'საბანკო შედარება', icon: FileSearch, path: '/app/reconciliation', isLocked: shouldLock('accounting') },
        ] : []),
        ...(isEnabled('hr') ? [
          { title: 'ხელფასები & HR', icon: Wallet, path: '/app/salary', isLocked: shouldLock('hr') }
        ] : []),
      ],
    });
  }

  // Admin
  sections.push({
    title: 'ადმინისტრირება',
    items: [
      ...(isEnabled('hr') ? [{ title: 'თანამშრომლები', icon: UserCog, path: '/app/employees', isLocked: shouldLock('hr') }] : []),
      ...(isEnabled('hr') ? [{ title: 'ფილიალები', icon: Building2, path: '/app/branches', isLocked: shouldLock('hr') }] : []),
      { title: 'აქტივობის ლოგი', icon: Activity, path: '/app/activity-log' },
    ],
  });

  return sections;
};

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, tenants, activeTenantId, setActiveTenant } = useAuthStore();
  const { hasAccess, isLoading: roleLoading, roleName } = useUserRole();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const activeTenant = tenants.find(t => t.id === activeTenantId);
  const industry = (activeTenant?.industry || 'retail') as IndustryType;
  const plan = (activeTenant?.subscription_plan || 'free') as PlanType;
  const dynamicSections = getSections(industry, activeTenant?.features, plan, user?.isSuperadmin || false);

  // ფილტრაცია როლის მიხედვით
  const filteredSections = user?.isSuperadmin 
    ? dynamicSections 
    : dynamicSections.map((section) => ({
        ...section,
        items: section.items.filter((item) => hasAccess(item.path)),
      })).filter((section) => section.items.length > 0);

  // Inject Superadmin
  if (user?.isSuperadmin) {
    const adminSection = filteredSections.find(s => s.title === 'ადმინისტრირება');
    if (adminSection && !adminSection.items.find(i => i.path === '/app/super-admin')) {
      adminSection.items.unshift({ title: 'პლატფორმის მართვა', icon: ShieldCheck, path: '/app/super-admin' });
    } else if (!adminSection) {
      filteredSections.push({
        title: 'ადმინისტრირება',
        items: [{ title: 'პლატფორმის მართვა', icon: ShieldCheck, path: '/app/super-admin' }]
      });
    }
  }

  const roleBadgeVariant = roleName === 'ადმინი' ? 'default' : 'secondary';

  const sidebarContent = (
    <div className="flex flex-col h-full sidebar-gradient w-64 transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/20 shadow-[0_0_12px_hsl(162_72%_38%/0.15)]">
          <Warehouse className="h-5 w-5 text-sidebar-primary" />
        </div>
        <span className="text-xl font-black gradient-text tracking-tighter">MARTE</span>
        {!roleLoading && (
          <Badge variant={roleBadgeVariant} className="ml-auto text-[10px] px-1.5 py-0">
            {roleName}
          </Badge>
        )}
      </div>

      {/* Workspace Switcher */}
      {tenants.length > 0 && (
        <div className="p-3 border-b border-sidebar-border bg-sidebar-accent/5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-1.5 px-1">აქტიური ბիუზნესი:</p>
          <Select 
            value={activeTenantId || ''} 
            onValueChange={(val) => { 
              setActiveTenant(val); 
              window.location.reload(); 
            }}
          >
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border h-8 text-xs font-medium focus:ring-1 focus:ring-sidebar-primary/30">
              <SelectValue placeholder="აირჩიეთ ბიზნესი" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map(t => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.name} <span className="text-muted-foreground ml-1">({t.role})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Nav */}
      <ScrollArea className="flex-1 py-2 scrollbar-thin">
        {filteredSections.map((section) => (
          <div key={section.title} className="mb-1">
            <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {section.title}
            </p>
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.isLocked ? '#' : item.path}
                  onClick={(e) => {
                    if (item.isLocked) {
                      e.preventDefault();
                      return;
                    }
                    setMobileOpen(false);
                  }}
                  className={`group flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-all duration-200
                    ${item.isLocked ? 'opacity-50 cursor-not-allowed filter grayscale' : ''}
                    ${isActive
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium shadow-[inset_0_0_0_1px_hsl(162_72%_38%/0.15)]'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-0.5'
                    }
                  `}
                >
                  <item.icon className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-sidebar-primary' : 'group-hover:text-sidebar-primary/70'}`} />
                  <span>{item.title}</span>
                  {item.isLocked && <Lock className="ml-auto h-3 w-3 text-muted-foreground/50" />}
                  {isActive && !item.isLocked && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary glow-pulse" />}
                </Link>
              );
            })}
          </div>
        ))}
      </ScrollArea>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span>გამოსვლა</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 lg:hidden transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30 w-64">
        {sidebarContent}
      </div>
    </>
  );
}
