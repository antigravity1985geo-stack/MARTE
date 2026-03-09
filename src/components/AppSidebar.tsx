import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, Package, Tags, Download, TrendingUp,
  ClipboardList, Warehouse, Factory, Users, Truck, Receipt,
  HandCoins, Calculator, BadgePercent, FileText, BarChart3, PieChart,
  UserCog, Clock, ListOrdered, Printer, BookOpen, LogOut,
  Menu, X, Shield, Activity, HardDriveDownload, Wallet,
  RotateCcw, Globe, Building2, Building, Layers, ArrowDownLeft, Landmark, Heart, Bell, PackagePlus,
  Settings2, FileSearch, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const sections = [
  {
    title: 'მთავარი',
    items: [
      { title: 'მთავარი', icon: LayoutDashboard, path: '/app' },
      { title: 'POS სისტემა', icon: Monitor, path: '/app/pos' },
    ],
  },
  {
    title: 'გაყიდვები',
    items: [
      { title: 'პროდუქტები', icon: Package, path: '/app/products' },
      { title: 'კომბოები (Bundles)', icon: PackagePlus, path: '/app/bundles' },
      { title: 'ფასდაკლებები', icon: BadgePercent, path: '/app/price-rules' },
      { title: 'კატეგორიები', icon: Tags, path: '/app/categories' },
    ],
  },
  {
    title: 'ოპერაციები',
    items: [
      { title: 'მიღება', icon: Download, path: '/app/receiving' },
      { title: 'გაყიდვები', icon: TrendingUp, path: '/app/sales' },
      { title: 'დაბრუნებები', icon: RotateCcw, path: '/app/returns' },
      { title: 'ინვოისები', icon: FileText, path: '/app/invoices' },
      { title: 'შეკვეთები', icon: ClipboardList, path: '/app/orders' },
      { title: 'საწყობები', icon: Warehouse, path: '/app/warehouse-management' },
      { title: 'წარმოება', icon: Factory, path: '/app/production' },
      { title: 'მარაგის მეთოდები', icon: Layers, path: '/app/inventory-methods' },
      { title: 'ზედნადები ხარჯები', icon: Truck, path: '/app/landed-cost' },
      { title: 'დისტრიბუცია', icon: Truck, path: '/app/distribution' },
      { title: 'E-Commerce', icon: Globe, path: '/app/ecommerce' },
    ],
  },
  {
    title: 'კონტაქტები',
    items: [
      { title: 'კლიენტები', icon: Users, path: '/app/clients' },
      { title: 'CRM & ლოიალობა', icon: Heart, path: '/app/crm' },
      { title: 'მომწოდებლები', icon: Truck, path: '/app/suppliers' },
    ],
  },
  {
    title: 'ფინანსები',
    items: [
      { title: 'ხარჯები', icon: Receipt, path: '/app/expenses' },
      { title: 'ანგარიშსწორება', icon: HandCoins, path: '/app/supplier-settlements' },
      { title: 'ბუღალტერია', icon: Calculator, path: '/app/accounting' },
      { title: 'ფინანსური ანგარიშგება', icon: ArrowDownLeft, path: '/app/cash-flow' },
      { title: 'საბანკო ინტეგრაცია', icon: Landmark, path: '/app/bank-integration' },
      { title: 'საბანკო შედარება', icon: FileSearch, path: '/app/reconciliation' },
      { title: 'ხელფასები & HR', icon: Wallet, path: '/app/salary' },
      { title: 'ძირითადი საშუალებები', icon: Building, path: '/app/fixed-assets' },
      { title: 'ვალუტა & კურსები', icon: Globe, path: '/app/currency' },
      { title: 'ავტომატური წესები', icon: Settings2, path: '/app/accounting-rules' },
      { title: 'ფასები', icon: BadgePercent, path: '/app/pricing' },
    ],
  },
  {
    title: 'ადმინისტრირება',
    items: [
      { title: 'RS.GE', icon: FileText, path: '/app/rsge' },
      { title: 'ფისკალური', icon: BarChart3, path: '/app/fiscal-report' },
      { title: 'თანამშრომლები', icon: UserCog, path: '/app/employees' },
      { title: 'დასწრება', icon: Clock, path: '/app/attendance' },
      { title: 'მოლარეების სტატისტიკა', icon: PieChart, path: '/app/cashier-stats' },
      { title: 'ცვლის ისტორია', icon: Clock, path: '/app/shift-history' },
      { title: 'ფილიალები', icon: Building2, path: '/app/branches' },
      { title: 'რიგები', icon: ListOrdered, path: '/app/queue' },
      { title: 'ქვითარი', icon: Printer, path: '/app/receipt-settings' },
      { title: 'სისტემის მონიტორინგი', icon: ShieldCheck, path: '/app/system-monitor' },
      { title: 'ადმინის პანელი', icon: Shield, path: '/app/admin-panel' },
      { title: 'აქტივობის ლოგი', icon: Activity, path: '/app/activity-log' },
      { title: 'რეპორტების ჰაბი', icon: BarChart3, path: '/app/reports' },
      { title: 'ბექაფი / ექსპორტი', icon: HardDriveDownload, path: '/app/data-export' },
      { title: 'სახელმძღვანელო', icon: BookOpen, path: '/app/guide' },
      { title: 'შეტყობინებები', icon: Bell, path: '/app/notifications' },
      { title: 'აპის ინსტალაცია', icon: Download, path: '/app/install' },
    ],
  },
];

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { hasAccess, isLoading: roleLoading, roleName } = useUserRole();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  // ფილტრაცია როლის მიხედვით
  const filteredSections = sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasAccess(item.path)),
  })).filter((section) => section.items.length > 0);

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
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-all duration-200
                    ${isActive
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium shadow-[inset_0_0_0_1px_hsl(162_72%_38%/0.15)]'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-0.5'
                    }
                  `}
                >
                  <item.icon className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-sidebar-primary' : 'group-hover:text-sidebar-primary/70'}`} />
                  <span>{item.title}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary glow-pulse" />}
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
