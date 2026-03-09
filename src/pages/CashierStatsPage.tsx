import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Receipt, Clock, Award, BarChart3, Users } from 'lucide-react';
import { useState, useMemo } from 'react';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type Period = '7d' | '30d' | '90d' | 'all';

function getDateFrom(period: Period): string | null {
  if (period === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - (period === '7d' ? 7 : period === '30d' ? 30 : 90));
  return d.toISOString();
}

interface CashierStat {
  name: string;
  totalSales: number;
  totalAmount: number;
  avgCheck: number;
  cashAmount: number;
  cardAmount: number;
  refunds: number;
  shiftsCount: number;
  avgShiftDuration: number; // minutes
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(162, 72%, 38%)',
  'hsl(200, 70%, 50%)',
  'hsl(340, 65%, 55%)',
  'hsl(45, 80%, 55%)',
];

export default function CashierStatsPage() {
  const [period, setPeriod] = useState<Period>('30d');

  // Fetch all shift_sales
  const salesQuery = useQuery({
    queryKey: ['cashier_stats_sales', period],
    queryFn: async () => {
      let query = supabase.from('shift_sales').select('*').eq('is_refunded', false);
      const dateFrom = getDateFrom(period);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch refunded sales count per cashier
  const refundsQuery = useQuery({
    queryKey: ['cashier_stats_refunds', period],
    queryFn: async () => {
      let query = supabase.from('shift_sales').select('cashier_name, id').eq('is_refunded', true);
      const dateFrom = getDateFrom(period);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch shifts for duration calculation
  const shiftsQuery = useQuery({
    queryKey: ['cashier_stats_shifts', period],
    queryFn: async () => {
      let query = supabase.from('shifts').select('cashier_name, opened_at, closed_at').eq('is_open', false);
      const dateFrom = getDateFrom(period);
      if (dateFrom) query = query.gte('opened_at', dateFrom);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = salesQuery.isLoading || refundsQuery.isLoading || shiftsQuery.isLoading;

  const stats = useMemo((): CashierStat[] => {
    const sales = salesQuery.data || [];
    const refunds = refundsQuery.data || [];
    const shifts = shiftsQuery.data || [];

    const map = new Map<string, CashierStat>();

    for (const s of sales) {
      const name = s.cashier_name || 'უცნობი';
      let stat = map.get(name);
      if (!stat) {
        stat = { name, totalSales: 0, totalAmount: 0, avgCheck: 0, cashAmount: 0, cardAmount: 0, refunds: 0, shiftsCount: 0, avgShiftDuration: 0 };
        map.set(name, stat);
      }
      stat.totalSales++;
      stat.totalAmount += s.total || 0;
      stat.cashAmount += s.cash_amount || 0;
      stat.cardAmount += s.card_amount || 0;
    }

    // Refunds
    for (const r of refunds) {
      const name = r.cashier_name || 'უცნობი';
      let stat = map.get(name);
      if (!stat) {
        stat = { name, totalSales: 0, totalAmount: 0, avgCheck: 0, cashAmount: 0, cardAmount: 0, refunds: 0, shiftsCount: 0, avgShiftDuration: 0 };
        map.set(name, stat);
      }
      stat.refunds++;
    }

    // Shifts
    for (const sh of shifts) {
      const name = sh.cashier_name || 'უცნობი';
      let stat = map.get(name);
      if (!stat) {
        stat = { name, totalSales: 0, totalAmount: 0, avgCheck: 0, cashAmount: 0, cardAmount: 0, refunds: 0, shiftsCount: 0, avgShiftDuration: 0 };
        map.set(name, stat);
      }
      stat.shiftsCount++;
      if (sh.closed_at && sh.opened_at) {
        const dur = (new Date(sh.closed_at).getTime() - new Date(sh.opened_at).getTime()) / 60000;
        stat.avgShiftDuration += dur;
      }
    }

    const result: CashierStat[] = [];
    for (const stat of map.values()) {
      stat.avgCheck = stat.totalSales > 0 ? stat.totalAmount / stat.totalSales : 0;
      if (stat.shiftsCount > 0) stat.avgShiftDuration = stat.avgShiftDuration / stat.shiftsCount;
      result.push(stat);
    }

    return result.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [salesQuery.data, refundsQuery.data, shiftsQuery.data]);

  const totals = useMemo(() => ({
    sales: stats.reduce((s, c) => s + c.totalSales, 0),
    amount: stats.reduce((s, c) => s + c.totalAmount, 0),
    avgCheck: stats.length > 0 ? stats.reduce((s, c) => s + c.totalAmount, 0) / Math.max(stats.reduce((s, c) => s + c.totalSales, 0), 1) : 0,
    cashiers: stats.length,
  }), [stats]);

  const chartData = stats.map((s) => ({
    name: s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name,
    გაყიდვები: s.totalSales,
    თანხა: Math.round(s.totalAmount),
  }));

  const pieData = stats.map((s, i) => ({
    name: s.name,
    value: Math.round(s.totalAmount),
    fill: COLORS[i % COLORS.length],
  }));

  if (isLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">მოლარეების სტატისტიკა</h1>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">ბოლო 7 დღე</SelectItem>
              <SelectItem value="30d">ბოლო 30 დღე</SelectItem>
              <SelectItem value="90d">ბოლო 90 დღე</SelectItem>
              <SelectItem value="all">ყველა</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">მოლარეები</p>
                  <p className="text-2xl font-bold"><AnimatedNumber value={totals.cashiers} /></p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Receipt className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">სულ გაყიდვები</p>
                  <p className="text-2xl font-bold"><AnimatedNumber value={totals.sales} /></p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">სულ თანხა</p>
                  <p className="text-2xl font-bold">₾<AnimatedNumber value={Math.round(totals.amount)} /></p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">საშ. ჩეკი</p>
                  <p className="text-2xl font-bold">₾<AnimatedNumber value={Math.round(totals.avgCheck)} /></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {stats.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">გაყიდვები მოლარეების მიხედვით</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                    <Bar dataKey="თანხა" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">წილი მთლიან გაყიდვებში</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardHeader><CardTitle className="text-base">დეტალური სტატისტიკა</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>მოლარე</TableHead>
                  <TableHead className="text-right">გაყიდვები</TableHead>
                  <TableHead className="text-right">თანხა</TableHead>
                  <TableHead className="text-right">საშ. ჩეკი</TableHead>
                  <TableHead className="text-right">ნაღდი</TableHead>
                  <TableHead className="text-right">ბარათი</TableHead>
                  <TableHead className="text-right">დაბრუნება</TableHead>
                  <TableHead className="text-right">ცვლები</TableHead>
                  <TableHead className="text-right">საშ. ცვლა</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">მონაცემები არ არის</TableCell></TableRow>
                ) : (
                  stats.map((s, i) => (
                    <TableRow key={s.name}>
                      <TableCell>
                        {i === 0 ? <Award className="h-4 w-4 text-yellow-500" /> : i + 1}
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">{s.totalSales}</TableCell>
                      <TableCell className="text-right font-medium">₾{s.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₾{s.avgCheck.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₾{s.cashAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₾{s.cardAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {s.refunds > 0 ? <Badge variant="destructive" className="text-xs">{s.refunds}</Badge> : '0'}
                      </TableCell>
                      <TableCell className="text-right">{s.shiftsCount}</TableCell>
                      <TableCell className="text-right text-xs">
                        {s.avgShiftDuration > 0 ? `${Math.floor(s.avgShiftDuration / 60)}სთ ${Math.round(s.avgShiftDuration % 60)}წ` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
