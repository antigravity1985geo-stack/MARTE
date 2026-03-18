import { useState, useMemo } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useExpenses } from '@/hooks/useExpenses';
import { useAccounting } from '@/hooks/useAccounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Receipt, TrendingDown, CalendarClock, PieChart, Banknote } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';
import { StatCard } from '@/components/StatCard';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const expenseCategories = ['ქირა', 'ხელფასი', 'კომუნალური', 'ტრანსპორტი', 'სხვა'];
const expenseAccountMap: Record<string, string> = { 'ქირა': '5300', 'ხელფასი': '5200', 'კომუნალური': '5400', 'ტრანსპორტი': '5500', 'სხვა': '5900' };

export default function ExpensesPage() {
  const { expenses, isLoading, addExpense } = useExpenses();
  const { addEntry } = useAccounting();
  const [form, setForm] = useState({ description: '', amount: '', category: 'სხვა', date: new Date().toISOString().split('T')[0] });

  const stats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonth = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, e) => sum + e.amount, 0);

    const categoryTotals = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    let topCategory = 'არ არის';
    let maxAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > maxAmount) {
        maxAmount = amt;
        topCategory = cat;
      }
    });

    return { total, thisMonth, topCategory, count: expenses.length };
  }, [expenses]);


  const handleAdd = async () => {
    if (!form.description || !form.amount) { toast.error('შეავსეთ ყველა ველი'); return; }
    try {
      await addExpense.mutateAsync({ description: form.description, amount: parseFloat(form.amount), category: form.category, date: form.date });
      await addEntry.mutateAsync({ date: form.date, description: `ხარჯი: ${form.description}`, debitAccount: expenseAccountMap[form.category] || '5900', creditAccount: '1100', amount: parseFloat(form.amount) });
      toast.success('ხარჯი დაემატა');
      setForm({ description: '', amount: '', category: 'სხვა', date: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6 lg:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03] pointer-events-none text-destructive">
            <TrendingDown className="w-full h-full" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-destructive/10 border border-destructive/20 shadow-lg shadow-destructive/5">
                <Receipt className="h-7 w-7 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">ხარჯები</h1>
                <p className="text-sm text-muted-foreground font-medium mt-1">ბიზნესის ხარჯების მართვა და ანალიტიკა</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PrintButton title="ხარჯების ანგარიში" />
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="სულ ხარჯი" value={stats.total} prefix="₾" icon={TrendingDown} color="destructive" />
          <StatCard title="მიმდინარე თვე" value={stats.thisMonth} prefix="₾" icon={CalendarClock} color="warning" />
          <StatCard title="ტოპ კატეგორია" value={stats.topCategory} icon={PieChart} color="info" />
          <StatCard title="ტრანზაქციები" value={stats.count} icon={Receipt} color="primary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Add Expense Form */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="lg:col-span-1">
            <Card className="border-border overflow-hidden h-full">
              <CardHeader className="bg-muted/20 border-b border-border pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> ახალი ხარჯი
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label>აღწერა</Label>
                  <Input placeholder="რაში დაიხარჯა თანხა..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>თანხა (₾)</Label>
                  <Input type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>კატეგორია</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>თარიღი</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <Button onClick={handleAdd} className="w-full mt-2" disabled={addExpense.isPending}>
                  {addExpense.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  დამატება
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Expenses List */}
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="lg:col-span-2">
            <Card className="border-border overflow-hidden h-full flex flex-col">
              <CardHeader className="bg-muted/20 border-b border-border flex flex-row items-center justify-between py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" /> ისტორია
                </CardTitle>
                <Badge variant="outline" className="font-mono">{expenses.length} ჩანაწერი</Badge>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto" id="printable-area">
                <Table>
                  <TableHeader className="bg-muted/10 sticky top-0 backdrop-blur-md">
                    <TableRow>
                      <TableHead>თარიღი</TableHead>
                      <TableHead>აღწერა</TableHead>
                      <TableHead>კატეგორია</TableHead>
                      <TableHead className="text-right">თანხა</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Receipt className="h-8 w-8 opacity-20" />
                            <p>ხარჯები არ მოიძებნა</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenses.map((e) => (
                        <TableRow key={e.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{e.date}</TableCell>
                          <TableCell className="font-medium">{e.description}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">{e.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold font-mono text-destructive">
                            ₾{e.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
