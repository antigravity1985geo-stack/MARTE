import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PageTransition, staggerContainer, staggerItem } from '@/components/PageTransition';
import { useProducts } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { useTransactions } from '@/hooks/useTransactions';
import { useShifts } from '@/hooks/useShifts';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';
import { useAutoOrderRules, useAutoOrderGlobal } from '@/hooks/useAutoOrderRules';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees } from '@/hooks/useEmployees';
import { useAccounting } from '@/hooks/useAccounting';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAnomalies } from '@/hooks/useAnomalies';
import { useActivityLogs, ACTION_LABELS, ENTITY_LABELS } from '@/hooks/useActivityLog';
import { useI18n } from '@/hooks/useI18n';
import {
  ShoppingCart, DollarSign, Package, Users, TrendingUp, TrendingDown,
  AlertTriangle, Zap, ArrowRight, RefreshCw, Clock, CreditCard,
  Banknote, Activity, BarChart3, Heart, Crown, UserCheck,
  Star, ShoppingBag, Timer, Wallet, Brain, Sparkles, ChevronRight,
  ShieldAlert, Trash2, Plus
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/useAuthStore';
import { AVAILABLE_FEATURES, isFeatureLocked, IndustryType, PlanType } from '@/config/features';

// New v0 Premium UI Components
import { KPICards } from '@/components/dashboard/kpi-cards';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ActivityTable } from '@/components/dashboard/activity-table';

const PIE_COLORS = [
  'hsl(221 83% 53%)',
  'hsl(239 84% 67%)',
  'hsl(199 89% 48%)',
  'hsl(142 71% 45%)',
  'hsl(215 25% 27%)',
];

import RealEstateDashboard from './real-estate/RealEstateDashboard';

export default function DashboardPage() {
  const { products } = useProducts();
  const { clients } = useClients();
  const { transactions } = useTransactions();
  const { currentShift } = useShifts();
  const { lowStockProducts, lowStockCount } = useLowStockAlerts();
  const { history, rules } = useAutoOrderRules();
  const { globalEnabled } = useAutoOrderGlobal();
  const { employees, attendance } = useEmployees();
  const { getProfitLoss, accounts } = useAccounting();
  const { abcData, ltvData, basketData } = useAnalytics();
  const { anomalies } = useAnomalies();
  const { data: activityLogs } = useActivityLogs(20);
  const { user, tenants, activeTenantId } = useAuthStore();
  const { t } = useI18n();

  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [countdown, setCountdown] = useState(30);

  const activeTenant = tenants.find(t => t.id === activeTenantId);
  const industry = (activeTenant?.industry || 'retail') as IndustryType;
  const plan = (activeTenant?.subscription_plan || 'free') as PlanType;
  const features = activeTenant?.features || {};

  const isEnabled = (id: string) => {
    if (features[id] === false) return false;
    const config = AVAILABLE_FEATURES.find(f => f.id === id);
    if (!config) return true;
    return config.industries.includes(industry);
  };

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    setLastRefresh(new Date());
    setCountdown(30);
  }, [queryClient]);

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRefresh]);

  const totalAutoOrders = history.length;
  const totalAutoAmount = history.reduce((s, h) => s + h.totalAmount, 0);
  const activeRules = rules.filter((r) => r.enabled).length;

  const today = new Date().toISOString().split('T')[0];
  const salesTransactions = transactions.filter((t) => t.type === 'sale');
  const todaySales = salesTransactions.filter((t) => t.date.startsWith(today));
  const todayRevenue = todaySales.reduce((s, t) => s + t.total, 0);

  const { revenue: accRevenue, totalExpenses: accExpenses, netIncome } = getProfitLoss();
  const bankBalance = accounts.find(a => a.code === '2320')?.balance || 0;
  const cashBalance = accounts.find(a => a.code === '2310')?.balance || 0;

  const activeEmps = employees.filter(e => e.is_active);
  const todayAttendance = attendance.filter(a => a.date === today);
  const presentCount = todayAttendance.filter(a => a.status === 'present').length;
  const absentCount = todayAttendance.filter(a => a.status === 'absent').length;
  const attendancePct = activeEmps.length > 0 ? Math.round((presentCount / activeEmps.length) * 100) : 0;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdaySales = salesTransactions.filter((t) => t.date.startsWith(yesterdayStr));
  const yesterdayRevenue = yesterdaySales.reduce((s, t) => s + t.total, 0);
  const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
  const salesChange = yesterdaySales.length > 0 ? ((todaySales.length - yesterdaySales.length) / yesterdaySales.length) * 100 : 0;

  const avgOrderValue = todaySales.length > 0 ? todayRevenue / todaySales.length : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const daySales = salesTransactions.filter((t) => t.date.startsWith(dateStr));
    const dayCost = daySales.reduce((s, t) =>
      s + (t.items || []).reduce((is: number, item: any) => {
        const product = products.find((p) => p.id === item.product_id);
        return is + (product ? product.buy_price * item.quantity : 0);
      }, 0), 0);
    const dayRevenue = daySales.reduce((s, t) => s + t.total, 0);
    return {
      day: format(d, 'EEE'), // Mapped in Recharts tooltip if needed, or rely on date
      sales: daySales.length,
      revenue: dayRevenue,
      profit: dayRevenue - dayCost,
    };
  });

  const cashSales = salesTransactions.filter((t) => t.payment_method === 'cash');
  const cardSales = salesTransactions.filter((t) => t.payment_method === 'card');
  const combinedSales = salesTransactions.filter((t) => t.payment_method === 'combined');
  const paymentData = [
    { name: t('sales_cash'), value: cashSales.length, amount: cashSales.reduce((s, t) => s + t.total, 0) },
    { name: t('sales_card'), value: cardSales.length, amount: cardSales.reduce((s, t) => s + t.total, 0) },
    { name: t('sales_combined'), value: combinedSales.length, amount: combinedSales.reduce((s, t) => s + t.total, 0) },
  ].filter((d) => d.value > 0);

  if (industry === 'real_estate') {
    return <RealEstateDashboard />;
  }

  const kpiCardsData = [
    {
      label: t('dashboard_daily_revenue'),
      value: `₾${todayRevenue.toLocaleString()}`,
      change: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
      trend: revenueChange >= 0 ? "up" as const : "down" as const,
      icon: DollarSign,
      iconBg: "bg-primary/20",
      iconColor: "text-primary",
    },
    {
      label: t('nav_clients'),
      value: clients.length.toString(),
      icon: Users,
      iconBg: "bg-success/20",
      iconColor: "text-success",
    },
    {
      label: t('low_stock_alert'),
      value: lowStockCount.toString(),
      icon: AlertTriangle,
      iconBg: "bg-warning/20",
      iconColor: "text-warning",
    },
    {
      label: t('dashboard_daily_sales'),
      value: todaySales.length.toString(),
      change: `${salesChange >= 0 ? '+' : ''}${salesChange.toFixed(1)}%`,
      trend: salesChange >= 0 ? "up" as const : "down" as const,
      icon: ShoppingCart,
      iconBg: "bg-info/20",
      iconColor: "text-info",
    },
  ];

  const activityData = activityLogs?.slice(0, 10).map(log => ({
    id: log.id,
    user: log.user_name,
    action: ACTION_LABELS[log.action] || log.action,
    target: log.entity_name || ENTITY_LABELS[log.entity_type] || log.entity_type,
    time: format(new Date(log.created_at), 'HH:mm'),
    status: log.action === 'delete' ? 'გაუქმებული' : 'დასრულებული',
  }));

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-8 pb-10">
        {/* Header Section with Refresh */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('nav_dashboard')}</h1>
            <p className="text-sm text-muted-foreground">
              თქვენი ბიზნესის მიმოხილვა და ძირითადი მაჩვენებლები
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-muted-foreground bg-secondary/50 border border-border rounded-lg px-3 py-1.5 uppercase tracking-wide">
              <RefreshCw className="h-3 w-3 animate-spin-slow text-primary" />
              <span>{countdown}S</span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 h-10 rounded-xl border-border bg-glass backdrop-blur-md hover:bg-accent transition-all font-semibold shadow-sm" 
              onClick={refresh}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">{t('refresh')}</span>
            </Button>
          </div>
        </div>

        {/* Phase 2: KPI Cards */}
        <KPICards data={kpiCardsData} />

        {/* Charts & Actions Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart data={last7Days} />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>

        {/* Activity Table */}
        <div className="w-full">
          <ActivityTable data={activityData} />
        </div>
      </div>
    </PageTransition>
  );
}
