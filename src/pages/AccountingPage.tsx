import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useAccounting } from '@/hooks/useAccounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus, Calculator, BookOpen, Scale, TrendingUp, Receipt,
  ArrowUpRight, ArrowDownRight, Wallet, FileSpreadsheet, Landmark,
  Download, FileText, PieChart, Box
} from 'lucide-react';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

const LOGO_TEXT = "MARTE";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function AccountingPage() {
  const { accounts, journalEntries, addEntry, getTrialBalance, getProfitLoss, exchangeRates, isLoading } = useAccounting();
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', debitAccount: '', creditAccount: '', amount: '' });
  const [activeTab, setActiveTab] = useState('chart');

  const handleAddEntry = async () => {
    if (!form.description || !form.debitAccount || !form.creditAccount || !form.amount) { toast.error('შეავსეთ ყველა ველი'); return; }
    try {
      await addEntry.mutateAsync({ date: form.date, description: form.description, debitAccount: form.debitAccount, creditAccount: form.creditAccount, amount: parseFloat(form.amount) });
      toast.success('ჩანაწერი დაემატა');
      setForm({ date: new Date().toISOString().split('T')[0], description: '', debitAccount: '', creditAccount: '', amount: '' });
    } catch (err: any) {
      toast.error(err.message || 'შეცდომა');
    }
  };

  const trialBalance = getTrialBalance();
  const pl = getProfitLoss();
  const typeMap: Record<string, string> = { asset: 'აქტივი', liability: 'ვალდებულება', equity: 'კაპიტალი', revenue: 'შემოსავალი', expense: 'ხარჯი' };
  const typeColorMap: Record<string, string> = {
    asset: 'bg-info/15 text-info border-info/20',
    liability: 'bg-warning/15 text-warning border-warning/20',
    equity: 'bg-primary/15 text-primary border-primary/20',
    revenue: 'bg-success/15 text-success border-success/20',
    expense: 'bg-destructive/15 text-destructive border-destructive/20',
  };

  const totalAssets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalLiabilities = accounts.filter(a => a.type === 'liability').reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalEquity = accounts.filter(a => a.type === 'equity').reduce((s, a) => s + Math.abs(a.balance), 0);

  const summaryCards = [
    { label: 'აქტივები', value: totalAssets, icon: Wallet, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
    { label: 'ვალდებულებები', value: totalLiabilities, icon: Landmark, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
    { label: 'კაპიტალი', value: totalEquity, icon: Scale, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { label: 'წმინდა მოგება', value: pl.netIncome, icon: TrendingUp, color: pl.netIncome >= 0 ? 'text-success' : 'text-destructive', bg: pl.netIncome >= 0 ? 'bg-success/10' : 'bg-destructive/10', border: pl.netIncome >= 0 ? 'border-success/20' : 'border-destructive/20' },
  ];
  // PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('ka-GE');

    // Header
    doc.setFontSize(18);
    doc.text('საწყობიERP - ბუღალტერიის ანგარიში', 14, 15);
    doc.setFontSize(10);
    doc.text(`თარიღი: ${dateStr}`, 14, 22);

    let yPos = 30;

    // Chart of Accounts
    if (activeTab === 'chart' || activeTab === 'all') {
      doc.setFontSize(14);
      doc.text('ანგარიშთა გეგმა', 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['კოდი', 'ანგარიში', 'ტიპი', 'ბალანსი']],
        body: accounts.map(a => [
          a.code,
          a.name,
          typeMap[a.type],
          `₾${Math.abs(a.balance).toFixed(2)}`
        ]),
        styles: { font: 'helvetica', fontSize: 9 },
        headStyles: { fillColor: [22, 163, 74] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Trial Balance
    if (activeTab === 'trial' || activeTab === 'all') {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.text('საცდელი ბალანსი', 14, yPos);
      yPos += 5;

      const tbData = trialBalance.filter(t => t.debit > 0 || t.credit > 0);
      autoTable(doc, {
        startY: yPos,
        head: [['კოდი', 'ანგარიში', 'დებეტი', 'კრედიტი']],
        body: tbData.map(t => [
          t.code,
          t.name,
          t.debit > 0 ? `₾${t.debit.toFixed(2)}` : '',
          t.credit > 0 ? `₾${t.credit.toFixed(2)}` : ''
        ]),
        foot: [[
          '', 'ჯამი:',
          `₾${trialBalance.reduce((s, t) => s + t.debit, 0).toFixed(2)}`,
          `₾${trialBalance.reduce((s, t) => s + t.credit, 0).toFixed(2)}`
        ]],
        styles: { font: 'helvetica', fontSize: 9 },
        headStyles: { fillColor: [22, 163, 74] },
        footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // P&L
    if (activeTab === 'pl' || activeTab === 'all') {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.text('მოგება-ზარალის ანგარიშგება', 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['პოზიცია', 'თანხა']],
        body: [
          ['შემოსავლები', `₾${pl.revenue.toFixed(2)}`],
          ['ხარჯები', `₾${pl.expenses.toFixed(2)}`],
        ],
        foot: [['წმინდა მოგება', `₾${pl.netIncome.toFixed(2)}`]],
        styles: { font: 'helvetica', fontSize: 9 },
        headStyles: { fillColor: [22, 163, 74] },
        footStyles: { fillColor: pl.netIncome >= 0 ? [220, 252, 231] : [254, 226, 226], fontStyle: 'bold' },
      });
    }

    doc.save(`accounting-report-${dateStr}.pdf`);
    toast.success('PDF ჩამოტვირთულია');
  };

  // Excel Export
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Chart of Accounts sheet
    const chartData = [
      ['კოდი', 'ანგარიში', 'ტიპი', 'ბალანსი'],
      ...accounts.map(a => [a.code, a.name, typeMap[a.type], Math.abs(a.balance).toFixed(2)])
    ];
    const wsChart = XLSX.utils.aoa_to_sheet(chartData);
    XLSX.utils.book_append_sheet(wb, wsChart, 'ანგარიშთა გეგმა');

    // Journal sheet
    const journalData = [
      ['თარიღი', 'აღწერა', 'დებეტი', 'კრედიტი', 'თანხა'],
      ...journalEntries.map(e => [
        e.date,
        e.description,
        e.lines?.[0]?.account_code || '-',
        e.lines?.[1]?.account_code || '-',
        e.total_debit.toFixed(2)
      ])
    ];
    const wsJournal = XLSX.utils.aoa_to_sheet(journalData);
    XLSX.utils.book_append_sheet(wb, wsJournal, 'ჟურნალი');

    // Trial Balance sheet
    const tbData = trialBalance.filter(t => t.debit > 0 || t.credit > 0);
    const trialData = [
      ['კოდი', 'ანგარიში', 'დებეტი', 'კრედიტი'],
      ...tbData.map(t => [
        t.code,
        t.name,
        t.debit > 0 ? t.debit.toFixed(2) : '',
        t.credit > 0 ? t.credit.toFixed(2) : ''
      ]),
      ['', 'ჯამი:', trialBalance.reduce((s, t) => s + t.debit, 0).toFixed(2), trialBalance.reduce((s, t) => s + t.credit, 0).toFixed(2)]
    ];
    const wsTrial = XLSX.utils.aoa_to_sheet(trialData);
    XLSX.utils.book_append_sheet(wb, wsTrial, 'საცდელი ბალანსი');

    // P&L sheet
    const plData = [
      ['პოზიცია', 'თანხა'],
      ['შემოსავლები', pl.revenue.toFixed(2)],
      ['ხარჯები', pl.expenses.toFixed(2)],
      ['წმინდა მოგება', pl.netIncome.toFixed(2)]
    ];
    const wsPL = XLSX.utils.aoa_to_sheet(plData);
    XLSX.utils.book_append_sheet(wb, wsPL, 'მოგება-ზარალი');

    // VAT sheet
    const vatData = [
      ['ანგარიში', 'თანხა'],
      ['დღგ მისაღები', Math.abs(accounts.find(a => a.code === '1700')?.balance || 0).toFixed(2)],
      ['დღგ გადასახდელი', Math.abs(accounts.find(a => a.code === '2500')?.balance || 0).toFixed(2)]
    ];
    const wsVAT = XLSX.utils.aoa_to_sheet(vatData);
    XLSX.utils.book_append_sheet(wb, wsVAT, 'დღგ რეესტრი');

    const dateStr = new Date().toLocaleDateString('ka-GE');
    XLSX.writeFile(wb, `accounting-report-${dateStr}.xlsx`);
    toast.success('Excel ჩამოტვირთულია');
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border p-6 lg:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.04]">
            <Calculator className="w-full h-full" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15 border border-primary/20">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">ბუღალტერია</h1>
                <p className="text-sm text-muted-foreground">ორმაგი ჩაწერის სისტემა · ანგარიშთა გეგმა · ფინანსური ანგარიშგება</p>
              </div>
            </div>
          </div>

          {/* Exchange Rates Widget */}
          {exchangeRates.length > 0 && (
            <div className="relative z-10 flex gap-3 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar w-full lg:w-auto">
              {exchangeRates.map((rate) => (
                <div key={rate.currency_code} className="bg-background/80 backdrop-blur-sm border border-border rounded-xl p-3 flex flex-col items-center min-w-[80px] shadow-sm">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">{rate.currency_code}</span>
                  <span className="text-sm font-bold font-mono text-foreground">{Number(rate.rate).toFixed(3)}</span>
                  <span className="text-[9px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5 text-success" /> NBG
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {summaryCards.map((card, i) => (
            <motion.div key={card.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
              <Card className={`border ${card.border} ${card.bg} backdrop-blur-sm hover:shadow-md transition-all duration-300`}>
                <CardContent className="p-4 lg:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                    {card.label === 'წმინდა მოგება' && (
                      card.value >= 0
                        ? <ArrowUpRight className="h-4 w-4 text-success" />
                        : <ArrowDownRight className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">{card.label}</p>
                  <p className={`text-lg lg:text-xl font-bold font-mono ${card.color}`}>
                    ₾{Math.abs(card.value).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chart" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="bg-muted/50 border border-border p-1 rounded-xl">
              <TabsTrigger value="chart" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <BookOpen className="h-3.5 w-3.5" /> ანგარიშთა გეგმა
              </TabsTrigger>
              <TabsTrigger value="journal" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <FileSpreadsheet className="h-3.5 w-3.5" /> ჟურნალი
              </TabsTrigger>
              <TabsTrigger value="trial" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Scale className="h-3.5 w-3.5" /> საცდელი ბალანსი
              </TabsTrigger>
              <TabsTrigger value="pl" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <TrendingUp className="h-3.5 w-3.5" /> მოგება-ზარალი
              </TabsTrigger>
              <TabsTrigger value="vat" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Receipt className="h-3.5 w-3.5" /> დღგ რეესტრი
              </TabsTrigger>
              <TabsTrigger value="budget" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <PieChart className="h-3.5 w-3.5" /> ბიუჯეტი (Budget vs Actual)
              </TabsTrigger>
              <TabsTrigger value="fixed-assets" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Box className="h-3.5 w-3.5" /> ძირითადი საშუალებები
              </TabsTrigger>
            </TabsList>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button onClick={exportPDF} variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40">
                <FileText className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">PDF ექსპორტი</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button onClick={exportExcel} variant="outline" size="sm" className="gap-2 border-success/20 hover:bg-success/5 hover:border-success/40">
                <Download className="h-4 w-4 text-success" />
                <span className="hidden sm:inline">Excel ექსპორტი</span>
                <span className="sm:hidden">Excel</span>
              </Button>
            </div>
          </div>

          {/* ანგარიშთა გეგმა */}
          <TabsContent value="chart">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" /> ანგარიშთა გეგმა
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableHead className="font-semibold text-foreground">კოდი</TableHead>
                          <TableHead className="font-semibold text-foreground">ანგარიში</TableHead>
                          <TableHead className="font-semibold text-foreground">ტიპი</TableHead>
                          <TableHead className="font-semibold text-foreground text-right">ბალანსი</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accounts.map((a) => (
                          <TableRow key={a.code} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono font-bold text-primary">{a.code}</TableCell>
                            <TableCell className="font-medium">{a.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`${typeColorMap[a.type]} border text-[11px] font-medium`}>
                                {typeMap[a.type]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              ₾{Math.abs(a.balance).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ჟურნალი */}
          <TabsContent value="journal" className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" /> ახალი ჩანაწერი
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid gap-4 md:grid-cols-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">თარიღი</Label>
                      <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border-border focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">აღწერა</Label>
                      <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="ტრანზაქციის აღწერა" className="border-border focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">დებეტი</Label>
                      <Select value={form.debitAccount} onValueChange={(v) => setForm({ ...form, debitAccount: v })}>
                        <SelectTrigger className="border-border"><SelectValue placeholder="ანგარიში" /></SelectTrigger>
                        <SelectContent>{accounts.map((a) => <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">კრედიტი</Label>
                      <Select value={form.creditAccount} onValueChange={(v) => setForm({ ...form, creditAccount: v })}>
                        <SelectTrigger className="border-border"><SelectValue placeholder="ანგარიში" /></SelectTrigger>
                        <SelectContent>{accounts.map((a) => <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">თანხა (₾)</Label>
                      <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="border-border focus:border-primary font-mono" />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddEntry} className="w-full gap-2 shadow-[var(--shadow-elegant)]">
                        <Plus className="h-4 w-4" /> დამატება
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-primary" /> ჟურნალის ჩანაწერები
                    </CardTitle>
                    <Badge variant="secondary" className="font-mono">{journalEntries.length} ჩანაწერი</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableHead className="font-semibold text-foreground">თარიღი</TableHead>
                          <TableHead className="font-semibold text-foreground">აღწერა</TableHead>
                          <TableHead className="font-semibold text-foreground">დებეტი</TableHead>
                          <TableHead className="font-semibold text-foreground">კრედიტი</TableHead>
                          <TableHead className="font-semibold text-foreground text-right">თანხა</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {journalEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                              <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-30" />
                              <p className="font-medium">ჩანაწერები არ არის</p>
                              <p className="text-xs mt-1">დაამატეთ ახალი ჟურნალის ჩანაწერი ზემოთ</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          journalEntries.slice().reverse().map((e) => (
                            <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="text-xs font-mono text-muted-foreground">{e.date}</TableCell>
                              <TableCell className="font-medium">{e.description}</TableCell>
                              <TableCell><Badge variant="outline" className="font-mono text-[11px] bg-info/10 text-info border-info/20">{e.lines?.[0]?.account_code || '-'}</Badge></TableCell>
                              <TableCell><Badge variant="outline" className="font-mono text-[11px] bg-warning/10 text-warning border-warning/20">{e.lines?.[1]?.account_code || '-'}</Badge></TableCell>
                              <TableCell className="text-right font-mono font-bold">₾{e.total_debit.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* საცდელი ბალანსი */}
          <TabsContent value="trial">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" /> საცდელი ბალანსი
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableHead className="font-semibold text-foreground">კოდი</TableHead>
                          <TableHead className="font-semibold text-foreground">ანგარიში</TableHead>
                          <TableHead className="font-semibold text-foreground text-right">დებეტი</TableHead>
                          <TableHead className="font-semibold text-foreground text-right">კრედიტი</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalance.filter((t) => t.debit > 0 || t.credit > 0).map((t) => (
                          <TableRow key={t.code} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono font-bold text-primary">{t.code}</TableCell>
                            <TableCell className="font-medium">{t.name}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-info">
                              {t.debit > 0 ? `₾${t.debit.toFixed(2)}` : ''}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-warning">
                              {t.credit > 0 ? `₾${t.credit.toFixed(2)}` : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Totals footer */}
                  <div className="flex justify-between items-center px-5 py-4 border-t border-border bg-muted/10">
                    <span className="font-bold text-foreground">ჯამი:</span>
                    <div className="flex gap-12">
                      <span className="font-bold font-mono text-info">₾{trialBalance.reduce((s, t) => s + t.debit, 0).toFixed(2)}</span>
                      <span className="font-bold font-mono text-warning">₾{trialBalance.reduce((s, t) => s + t.credit, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* მოგება-ზარალი */}
          <TabsContent value="pl">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> მოგება-ზარალის ანგარიშგება
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {/* Revenue */}
                  <div className="rounded-xl bg-success/8 border border-success/15 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center">
                          <ArrowUpRight className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">შემოსავლები</p>
                          <p className="text-xs text-muted-foreground/70">Revenue</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold font-mono text-success">₾{pl.revenue.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="rounded-xl bg-destructive/8 border border-destructive/15 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center">
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">ხარჯები</p>
                          <p className="text-xs text-muted-foreground/70">Expenses</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold font-mono text-destructive">₾{pl.expenses.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Net Income */}
                  <div className={`rounded-xl p-5 border-2 ${pl.netIncome >= 0 ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pl.netIncome >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
                          <TrendingUp className={`h-5 w-5 ${pl.netIncome >= 0 ? 'text-success' : 'text-destructive'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">წმინდა მოგება</p>
                          <p className="text-xs text-muted-foreground">Net Income</p>
                        </div>
                      </div>
                      <span className={`text-3xl font-bold font-mono ${pl.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ₾{pl.netIncome.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* დღგ რეესტრი */}
          <TabsContent value="vat">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" /> დღგ რეესტრი
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-info/8 border border-info/15 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-info/15 flex items-center justify-center">
                          <ArrowDownRight className="h-4 w-4 text-info" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">დღგ მისაღები</p>
                      </div>
                      <p className="text-2xl font-bold font-mono text-foreground">
                        ₾{Math.abs(accounts.find((a) => a.code === '1700')?.balance || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">VAT Receivable</p>
                    </div>
                    <div className="rounded-xl bg-warning/8 border border-warning/15 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center">
                          <ArrowUpRight className="h-4 w-4 text-warning" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">დღგ გადასახდელი</p>
                      </div>
                      <p className="text-2xl font-bold font-mono text-foreground">
                        ₾{Math.abs(accounts.find((a) => a.code === '2500')?.balance || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">VAT Payable</p>
                    </div>
                  </div>

                  {/* VAT Balance */}
                  <div className="mt-4 rounded-xl bg-muted/20 border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">დღგ ბალანსი</span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        ₾{(Math.abs(accounts.find((a) => a.code === '1700')?.balance || 0) - Math.abs(accounts.find((a) => a.code === '2500')?.balance || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
          {/* Budget vs Actual Placeholder */}
          <TabsContent value="budget">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-primary" /> ბიუჯეტირების დაფა
                  </CardTitle>
                  <Button size="sm" variant="default"><Plus className="h-4 w-4 mr-2" />ახალი ბიუჯეტი</Button>
                </CardHeader>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <PieChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>ბიუჯეტის მონაცემები ცარიელია</p>
                  <p className="text-sm mt-1">დაამატეთ მონაცემები 'Q1 2026' ან სხვა პერიოდისთვის თვალის სადევნებლად.</p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Fixed Assets Placeholder */}
          <TabsContent value="fixed-assets">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Box className="h-4 w-4 text-primary" /> ძირითადი საშუალებები (Fixed Assets)
                  </CardTitle>
                  <Button size="sm" variant="default"><Plus className="h-4 w-4 mr-2" />ახალი აქტივი</Button>
                </CardHeader>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Box className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>აქტივები არ მოიძებნა</p>
                  <p className="text-sm mt-1">დაამატეთ ძირითადი საშუალება, რათა ავტომატურად გამოთვალოთ ამორტიზაცია.</p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
