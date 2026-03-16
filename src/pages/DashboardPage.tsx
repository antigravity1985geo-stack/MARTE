import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PageTransition, staggerContainer, staggerItem } from '@/components/PageTransition';
import { AnimatedNumber } from '@/components/AnimatedNumber';
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
import {
  ShoppingCart, DollarSign, Package, Users, TrendingUp, TrendingDown,
  AlertTriangle, Percent, Zap, ArrowRight, RefreshCw, Clock, CreditCard,
  Banknote, Activity, BarChart3, Heart, Crown, UserCheck,
  Star, ShoppingBag, Timer, Wallet, Brain, Sparkles, ChevronRight,
  ShieldAlert, Eye, Search, Trash2, Plus
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { CyberCard } from '@/components/CyberCard';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/useAuthStore';
import { AVAILABLE_FEATURES, isFeatureLocked, IndustryType, PlanType } from '@/config/features';

const PIE_COLORS = [
  'hsl(162 72% 38%)',
  'hsl(32 95% 52%)',
  'hsl(210 92% 45%)',
  'hsl(4 76% 54%)',
  'hsl(280 60% 50%)',
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

  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [countdown, setCountdown] = useState(30);

  const activeTenant = tenants.find(t => t.id === activeTenantId);
  const industry = (activeTenant?.industry || 'retail') as IndustryType;
  const plan = (activeTenant?.subscription_plan || 'free') as PlanType;
  const features = activeTenant?.features || {};
  
  const isEnabled = (id: string) => {
    // 1. Feature must be toggled on
    if (features[id] === false) return false;
    
    // 2. Feature must belong to this industry
    const config = AVAILABLE_FEATURES.find(f => f.id === id);
    if (!config) return true;
    return config.industries.includes(industry);
  };

  const isLocked = (id: string) => isFeatureLocked(id, plan, user?.isSuperadmin);

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

  // Accounting Stats
  const { revenue: accRevenue, expenses: accExpenses, netIncome } = getProfitLoss();
  const bankBalance = accounts.find(a => a.code === '2320')?.balance || 0;
  const cashBalance = accounts.find(a => a.code === '2310')?.balance || 0;

  // HR Stats
  const activeEmps = employees.filter(e => e.is_active);
  const todayAttendance = attendance.filter(a => a.date === today);
  const presentCount = todayAttendance.filter(a => a.status === 'present').length;
  const absentCount = todayAttendance.filter(a => a.status === 'absent').length;
  const attendancePct = activeEmps.length > 0 ? Math.round((presentCount / activeEmps.length) * 100) : 0;

  // Yesterday comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdaySales = salesTransactions.filter((t) => t.date.startsWith(yesterdayStr));
  const yesterdayRevenue = yesterdaySales.reduce((s, t) => s + t.total, 0);
  const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
  const salesChange = yesterdaySales.length > 0 ? ((todaySales.length - yesterdaySales.length) / yesterdaySales.length) * 100 : 0;

  const totalRevenue = salesTransactions.reduce((s, t) => s + t.total, 0);
  const totalCost = salesTransactions.reduce((s, t) =>
    s + (t.items || []).reduce((is: number, item: any) => {
      const product = products.find((p) => p.id === item.product_id);
      return is + (product ? product.buy_price * item.quantity : 0);
    }, 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const avgOrderValue = todaySales.length > 0 ? todayRevenue / todaySales.length : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const daySales = salesTransactions.filter((t) => t.date.startsWith(dateStr));
    const dayNames = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];
    const dayCost = daySales.reduce((s, t) =>
      s + (t.items || []).reduce((is: number, item: any) => {
        const product = products.find((p) => p.id === item.product_id);
        return is + (product ? product.buy_price * item.quantity : 0);
      }, 0), 0);
    const dayRevenue = daySales.reduce((s, t) => s + t.total, 0);
    return {
      day: dayNames[d.getDay()],
      sales: daySales.length,
      revenue: dayRevenue,
      profit: dayRevenue - dayCost,
    };
  });

  const cashSales = salesTransactions.filter((t) => t.payment_method === 'cash');
  const cardSales = salesTransactions.filter((t) => t.payment_method === 'card');
  const combinedSales = salesTransactions.filter((t) => t.payment_method === 'combined');
  const paymentData = [
    { name: 'ნაღდი', value: cashSales.length, amount: cashSales.reduce((s, t) => s + t.total, 0) },
    { name: 'ბარათი', value: cardSales.length, amount: cardSales.reduce((s, t) => s + t.total, 0) },
    { name: 'კომბინ.', value: combinedSales.length, amount: combinedSales.reduce((s, t) => s + t.total, 0) },
  ].filter((d) => d.value > 0);

  const stats = [
    {
      title: 'დღის გაყიდვები',
      value: todaySales.length,
      icon: ShoppingCart,
      gradient: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
      change: salesChange,
    },
    {
      title: 'დღის შემოსავალი',
      value: todayRevenue,
      prefix: '₾',
      icon: DollarSign,
      gradient: 'from-success/20 to-success/5',
      iconBg: 'bg-success/15',
      iconColor: 'text-success',
      decimals: 2,
      change: revenueChange,
    },
    {
      title: 'საშ. ჩეკი',
      value: avgOrderValue,
      prefix: '₾',
      icon: Activity,
      gradient: 'from-info/20 to-info/5',
      iconBg: 'bg-info/15',
      iconColor: 'text-info',
      decimals: 2,
    },
    {
      title: 'პროდუქტები',
      value: products.length,
      icon: Package,
      gradient: 'from-accent/20 to-accent/5',
      iconBg: 'bg-accent/15',
      iconColor: 'text-accent',
      subtitle: `${lowStockCount} დაბალი მარაგით`,
    },
  ];

  if (industry === 'real_estate' || user?.isSuperadmin) {
    return <RealEstateDashboard />;
  }

  return (
    <PageTransition>
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
        <motion.div variants={staggerItem} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">დეშბორდი</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant={currentShift ? 'default' : 'secondary'}
                  className={`text-[10px] ${currentShift ? 'glow-pulse' : ''}`}
                >
                  {currentShift ? '● ცვლა გახსნილია' : '○ ცვლა დახურულია'}
                </Badge>
                {currentShift && (
                  <span className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-0.5" />
                    {currentShift.cashierName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
              <RefreshCw className="h-3 w-3" />
              <span>{countdown}წმ</span>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 rounded-full" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">განახლება</span>
            </Button>
          </div>
        </motion.div>

        {/* AI Executive Narrative */}
        <motion.div variants={staggerItem}>
          <Card className="border-primary/20 bg-primary/5 overflow-hidden relative border-l-4">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Brain className="h-24 w-24 text-primary" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                AI ბიზნეს-ანალიზი (Executive Summary)
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-primary/70 tracking-wider flex items-center gap-1.5">
                    <Users className="h-3 w-3" /> მარკეტინგი & კლიენტები
                  </p>
                  <p className="text-sm">თქვენი ტოპ კლიენტია <span className="font-bold underline decoration-primary/30 decoration-2 underline-offset-2">{ltvData[0]?.client_name || '...'}</span>, რომელმაც ჯამში {ltvData[0]?.total_spent.toFixed(0) || 0} ₾ დახარჯა. ლოიალობის პროგრამაში ჩართულობა სტაბილურია.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-primary/70 tracking-wider flex items-center gap-1.5">
                    <Package className="h-3 w-3" /> მარაგების ოპტიმიზაცია
                  </p>
                  <p className="text-sm">პროდუქტების <span className="font-bold">{(abcData.filter(a => a.abc_category === 'A').length / (abcData.length || 1) * 100).toFixed(0)}%</span> (A კატეგორია) გენერირებს შემოსავლის დიდ წილს. ყურადღება მიაქციეთ მათ ნაშთებს.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-primary/70 tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3" /> პროგნოზი (Forecast)
                  </p>
                  <p className="text-sm">გუშინდელთან შედარებით შემოსავალი {revenueChange > 0 ? 'გაიზარდა' : 'შემცირდა'} {Math.abs(revenueChange).toFixed(1)}%-ით. მომდევნო 7 დღისთვის მოსალოდნელია სტაბილური ტრენდი.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Anomalies & AI Alerts - Show only if Analytics/Audit enabled */}
        {(anomalies.length > 0 && isEnabled('analytics')) && (
          <motion.div variants={staggerItem}>
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-destructive">AI ანომალიების აღმოჩენა ({anomalies.length})</h3>
                  <p className="text-xs text-muted-foreground">{anomalies[0].description}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8">
                დეტალები <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Visual Audit Trail */}
        <motion.div variants={staggerItem}>
          <Card className="border-primary/10 shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                აუდიტის ისტორია
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/activity-log" className="text-xs flex items-center gap-1 hover:text-primary transition-colors">
                  ყველა <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-4">
              <div className="space-y-3">
                {activityLogs?.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-2.5 rounded-xl hover:bg-primary/5 transition-all group">
                    <div className={`mt-0.5 p-2 rounded-lg ${log.action === 'delete' ? 'bg-destructive/10 text-destructive' :
                      log.action === 'create' ? 'bg-green-500/10 text-green-500' :
                        'bg-primary/10 text-primary'
                      } group-hover:scale-110 transition-transform`}>
                      {log.action === 'delete' ? <Trash2 className="h-4 w-4" /> :
                        log.action === 'create' ? <Plus className="h-4 w-4" /> :
                          <Activity className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{log.user_name}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted/50 px-1.5 py-0.5 rounded">
                          {format(new Date(log.created_at), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate italic">
                        {ACTION_LABELS[log.action] || log.action} - {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        {log.entity_name && <span className="text-primary/70 not-italic ml-1">({log.entity_name})</span>}
                      </p>
                    </div>
                  </div>
                ))}
                {!activityLogs?.length && (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    აქტივობა არ მოიძებნა
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ABC & LTV Summary Widgets - Show only if Sales enabled */}
        {isEnabled('sales') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <motion.div variants={staggerItem} className="lg:col-span-1">
              {/* ... ABC Analysis Card content ... */}
              <Card className="shadow-elegant border-primary/10 h-full card-hover">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    ABC ანალიზი (მოგების წილი)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[140px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'A (Top)', value: abcData.filter(a => a.abc_category === 'A').length, color: 'hsl(162 72% 38%)' },
                        { name: 'B (Mid)', value: abcData.filter(a => a.abc_category === 'B').length, color: 'hsl(32 95% 52%)' },
                        { name: 'C (Low)', value: abcData.filter(a => a.abc_category === 'C').length, color: 'hsl(210 92% 45%)' },
                      ]} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" fontSize={10} stroke="hsl(var(--muted-foreground))" width={50} tickLine={false} axisLine={false} />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ background: 'hsl(var(--card))', borderRadius: '12px', fontSize: '12px' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                          {[
                            { color: 'hsl(162 72% 38%)' },
                            { color: 'hsl(32 95% 52%)' },
                            { color: 'hsl(210 92% 45%)' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-2 bg-muted/40 rounded-lg">
                    <p className="text-[10px] text-muted-foreground text-center italic">"A კატეგორია" - პროდუქტები, რომლებიც ქმნიან თქვენს ძირითად მოგებას</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem} className="lg:col-span-1">
              <Card className="shadow-elegant border-primary/10 h-full card-hover">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Crown className="h-4 w-4 text-accent" />
                    ტოპ კლიენტები (LTV)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {ltvData.slice(0, 4).length > 0 ? ltvData.slice(0, 4).map((client, i) => (
                    <div key={client.client_id} className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/10">
                          #{i + 1}
                        </div>
                        <span className="text-xs font-medium truncate max-w-[100px]">{client.client_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-foreground">₾{client.total_spent.toFixed(0)}</p>
                        <p className="text-[9px] text-muted-foreground">{client.total_orders} შეკვეთა</p>
                      </div>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <Users className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-[10px]">მონაცემები არ არის</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem} className="lg:col-span-1">
              <Card className="shadow-elegant border-primary/10 h-full card-hover">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-info" />
                    Cross-sell რეკომენდაცია
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-2">
                  {basketData.slice(0, 3).length > 0 ? basketData.slice(0, 3).map((pair, i) => (
                    <div key={i} className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/30 border border-border/40 hover:border-info/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-info uppercase tracking-wider">ხშირი წყვილი</span>
                        <Badge variant="outline" className="text-[9px] bg-background border-info/20 px-1 py-0">{pair.frequency}x</Badge>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium truncate flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-info" /> {pair.product_a_name}</span>
                        <span className="text-[10px] font-medium truncate flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-info/60" /> {pair.product_b_name}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <Zap className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-[10px]">ანალიზი მუშავდება...</p>
                    </div>
                  )}
                  <p className="text-[9px] text-center text-muted-foreground italic mt-2">დაფუძნებულია Market Basket Analysis-ზე</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Main Stats - Cyber Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <CyberCard title="დღის გაყიდვები" value={todaySales.length.toString()} icon={ShoppingCart} color="primary" subtitle={salesChange !== 0 ? `${salesChange > 0 ? '+' : ''}${salesChange.toFixed(0)}% გუშინთან` : undefined} />
          <CyberCard title="დღის შემოსავალი" value={todayRevenue} prefix="₾" icon={DollarSign} color="success" subtitle={revenueChange !== 0 ? `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(0)}% გუშინთან` : undefined} />
          <CyberCard title="საშუალო ჩეკი" value={avgOrderValue} prefix="₾" icon={Activity} color="info" />
          <CyberCard title="პროდუქტები" value={products.length.toString()} icon={Package} color="accent" subtitle={`${lowStockCount} დაბალი მარაგით`} />
        </div>

        {/* Financial Summary Row - Show only if Accounting enabled */}
        {isEnabled('accounting') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 mt-4">
            <CyberCard title="ბანკი" value={bankBalance} prefix="₾" icon={Wallet} color="info" subtitle="საბანკო ნაშთი (2320)" />
            <CyberCard title="სალარო" value={cashBalance} prefix="₾" icon={Banknote} color="success" subtitle="ნაღდი ფული (2310)" />
            <CyberCard title="მოგება (P&L)" value={netIncome} prefix="₾" icon={netIncome >= 0 ? TrendingUp : TrendingDown} color={netIncome >= 0 ? 'success' : 'destructive'} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-4">
          <CyberCard title="კლიენტები" value={clients.length.toString()} icon={Users} color="accent" />
        </div>

        {/* Low Stock Alert */}
        {lowStockCount > 0 && (
          <motion.div variants={staggerItem}>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  დაბალი მარაგი ({lowStockCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {lowStockProducts.slice(0, 6).map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-card rounded-lg px-3 py-2.5 text-sm border border-border/50">
                      <span className="truncate font-medium">{p.name}</span>
                      <Badge variant="destructive" className="text-[10px] ml-2 shrink-0">
                        {p.stock}/{p.min_stock} {p.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
                {lowStockCount > 6 && (
                  <Link to="/app/products" className="block mt-2">
                    <Button variant="ghost" size="sm" className="text-destructive text-xs w-full">
                      ყველას ნახვა ({lowStockCount}) <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Revenue Chart - takes 2 cols */}
          <motion.div variants={staggerItem} className="lg:col-span-2">
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    ბოლო 7 დღე
                  </CardTitle>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      შემოსავალი
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      მოგება
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                  <AreaChart data={last7Days}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(162 72% 38%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(162 72% 38%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(32 95% 52%)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(32 95% 52%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: 'var(--shadow-card-hover)' }}
                      formatter={(value: number, name: string) => [
                        `₾${value.toFixed(2)}`,
                        name === 'revenue' ? 'შემოსავალი' : 'მოგება',
                      ]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(162 72% 38%)" fill="url(#revenueGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--card))' }} />
                    <Area type="monotone" dataKey="profit" stroke="hsl(32 95% 52%)" fill="url(#profitGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(162 72% 38%)" strokeDasharray="5 5" strokeWidth={1} dot={false} opacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Methods Pie */}
          <motion.div variants={staggerItem}>
            <Card className="shadow-[var(--shadow-card)] h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-accent" />
                  გადახდის მეთოდები
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {paymentData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={isMobile ? 160 : 180}>
                      <PieChart>
                        <Pie
                          data={paymentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 35 : 50}
                          outerRadius={isMobile ? 60 : 75}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {paymentData.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                          formatter={(value: number) => [value, 'ტრანზაქცია']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {paymentData.map((item, idx) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                            <span className="text-muted-foreground">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.value}</span>
                            <span className="text-muted-foreground">₾{item.amount.toFixed(0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <Banknote className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs">მონაცემები არ არის</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* KPI WIDGETS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Top Products */}
          <motion.div variants={staggerItem}>
            <Card className="shadow-[var(--shadow-card)] h-full card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-primary" />ტოპ პროდუქტები</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 space-y-2">
                {(() => {
                  const productSales: Record<string, number> = {};
                  salesTransactions.forEach(t => {
                    (t.items || []).forEach((item: any) => {
                      productSales[item.product_name] = (productSales[item.product_name] || 0) + item.quantity;
                    });
                  });
                  const top = Object.entries(productSales)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 4);

                  return top.map(([name, qty]) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[120px] text-muted-foreground">{name}</span>
                      <span className="font-bold">{qty} ერთ.</span>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          </motion.div>

          {/* Attendance */}
          <motion.div variants={staggerItem}>
            <Card className="shadow-[var(--shadow-card)] h-full card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary" />დასწრება (დღეს)</CardTitle>
                  <Link to="/app/attendance"><Button size="sm" variant="ghost" className="h-6 text-[10px]">ვრცლად <ArrowRight className="h-3 w-3 ml-0.5" /></Button></Link>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center justify-center mb-3">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${attendancePct}, 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-bold">{attendancePct}%</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                  <div className="rounded bg-primary/10 p-1.5"><p className="font-bold text-sm text-primary">{presentCount}</p>დამსწრე</div>
                  <div className="rounded bg-destructive/10 p-1.5"><p className="font-bold text-sm text-destructive">{absentCount}</p>გაცდენა</div>
                  <div className="rounded bg-muted p-1.5"><p className="font-bold text-sm">{activeEmps.length - presentCount - absentCount}</p>აღურიცხ.</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stock Status */}
          <motion.div variants={staggerItem}>
            <Card className="shadow-[var(--shadow-card)] h-full card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-primary" />მარაგის სტატუსი</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 space-y-2.5">
                {(() => {
                  const inStock = products.filter(p => p.stock > (p.min_stock || 5)).length;
                  const low = lowStockCount;
                  const outOfStock = products.filter(p => p.stock <= 0).length;
                  const total = products.length || 1;
                  return [
                    { label: 'მარაგშია', count: inStock, pct: Math.round((inStock / total) * 100), color: 'bg-primary' },
                    { label: 'დაბალი მარაგი', count: low, pct: Math.round((low / total) * 100), color: 'bg-yellow-500' },
                    { label: 'ამოწურული', count: outOfStock, pct: Math.round((outOfStock / total) * 100), color: 'bg-destructive' },
                  ].map(item => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{item.label}</span><span className="font-medium">{item.count} ({item.pct}%)</span></div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} /></div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          </motion.div>

          {/* Channels */}
          <motion.div variants={staggerItem}>
            <Card className="shadow-[var(--shadow-card)] h-full card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" />არხები</CardTitle>
                  <Link to="/app/ecommerce"><Button size="sm" variant="ghost" className="h-6 text-[10px]">ვრცლად <ArrowRight className="h-3 w-3 ml-0.5" /></Button></Link>
                </div>
              </CardHeader>
              <CardContent className="pb-4 space-y-2">
                {[
                  { label: 'Glovo', orders: 23, revenue: '1,845₾', color: 'bg-yellow-500' },
                  { label: 'Wolt', orders: 18, revenue: '1,120₾', color: 'bg-blue-500' },
                  { label: 'Extra.ge', orders: 7, revenue: '521₾', color: 'bg-green-500' },
                  { label: 'პირდაპირი', orders: todaySales.length, revenue: `${todayRevenue.toFixed(0)}₾`, color: 'bg-primary' },
                ].map(ch => (
                  <div key={ch.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${ch.color}`} /><span className="text-muted-foreground">{ch.label}</span></div>
                    <div className="flex items-center gap-2 text-xs"><span>{ch.orders} შეკვ.</span><span className="font-bold">{ch.revenue}</span></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Hourly Sales */}
        <motion.div variants={staggerItem}>
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Timer className="h-4 w-4 text-primary" />საათობრივი გაყიდვები (დღეს)</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                <BarChart data={Array.from({ length: 13 }, (_, i) => {
                  const hour = i + 8;
                  const hourSales = todaySales.filter(t => new Date(t.date).getHours() === hour);
                  return { hour: `${hour}:00`, revenue: hourSales.reduce((s, t) => s + t.total, 0) };
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} formatter={(value: number) => [`₾${value.toFixed(2)}`, 'შემოსავალი']} />
                  <Bar dataKey="revenue" fill="hsl(162 72% 38%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Auto Orders */}
          <motion.div variants={staggerItem}>
            <Card className="shadow-[var(--shadow-card)] h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    ავტო-შეკვეთები
                    <Badge variant={globalEnabled ? 'default' : 'secondary'} className="text-[10px]">
                      {globalEnabled ? 'ჩართული' : 'გამორთული'}
                    </Badge>
                  </CardTitle>
                  <Link to="/app/orders">
                    <Button size="sm" variant="ghost" className="gap-1 text-xs h-7">
                      ვრცლად <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'შეკვეთა', val: totalAutoOrders, color: 'text-primary' },
                    { label: 'ღირებულება', val: `₾${totalAutoAmount.toFixed(0)}`, color: 'text-accent' },
                    { label: 'წესი', val: activeRules, color: 'text-info' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-muted/40 p-3 text-center">
                      <p className={`text-lg lg:text-xl font-bold ${item.color}`}>{item.val}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
                {history.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ბოლო შეკვეთები</p>
                    {history.slice(0, 3).map((h) => (
                      <div key={h.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm">
                        <span className="truncate font-medium">{h.productName}</span>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {h.quantity} ერთ. • ₾{h.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">ავტო-შეკვეთები ჯერ არ არის</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div variants={staggerItem}>
            <Card className="shadow-[var(--shadow-card)] h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-success" />
                    ბოლო ტრანზაქციები
                  </CardTitle>
                  <Link to="/app/sales">
                    <Button size="sm" variant="ghost" className="gap-1 text-xs h-7">
                      ყველა <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs">ტრანზაქციები ჯერ არ არის</p>
                    <Link to="/app/pos" className="mt-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        POS-ზე გადასვლა
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {transactions.slice(0, 5).map((t, idx) => (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${t.payment_method === 'cash' ? 'bg-success/10 text-success' : t.payment_method === 'card' ? 'bg-info/10 text-info' : 'bg-accent/10 text-accent'}`}>
                            {t.payment_method === 'cash' ? <Banknote className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{(t.items || []).length} პროდუქტი</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(t.date).toLocaleString('ka-GE', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-sm text-foreground">₾{t.total.toFixed(2)}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </PageTransition >
  );
}
