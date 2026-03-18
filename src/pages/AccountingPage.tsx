import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useAccounting } from '@/hooks/useAccounting';
import { useI18n } from '@/hooks/useI18n';
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
  const { t } = useI18n();
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', debitAccount: '', creditAccount: '', amount: '' });
  const [activeTab, setActiveTab] = useState('chart');

  const handleAddEntry = async () => {
    if (!form.description || !form.debitAccount || !form.creditAccount || !form.amount) {
      toast.error(t('fill_all_fields')); return;
    }
    try {
      await addEntry.mutateAsync({ date: form.date, description: form.description, debitAccount: form.debitAccount, creditAccount: form.creditAccount, amount: parseFloat(form.amount) });
      toast.success(t('accounting_entry_added'));
      setForm({ date: new Date().toISOString().split('T')[0], description: '', debitAccount: '', creditAccount: '', amount: '' });
    } catch (err: any) {
      toast.error(err.message || t('error'));
    }
  };

  const trialBalance = getTrialBalance();
  const pl = getProfitLoss();

  const typeMap: Record<string, string> = {
    asset: t('accounting_type_asset'),
    liability: t('accounting_type_liability'),
    equity: t('accounting_type_equity'),
    revenue: t('accounting_type_revenue'),
    expense: t('accounting_type_expense'),
  };

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
    { label: t('accounting_assets'), value: totalAssets, icon: Wallet, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
    { label: t('accounting_liabilities'), value: totalLiabilities, icon: Landmark, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
    { label: t('accounting_equity'), value: totalEquity, icon: Scale, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { label: t('accounting_net_income'), value: pl.netIncome, icon: TrendingUp, color: pl.netIncome >= 0 ? 'text-success' : 'text-destructive', bg: pl.netIncome >= 0 ? 'bg-success/10' : 'bg-destructive/10', border: pl.netIncome >= 0 ? 'border-success/20' : 'border-destructive/20' },
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('ka-GE');
    doc.setFontSize(18); doc.text('MARTE - ' + t('accounting_title'), 14, 15);
    doc.setFontSize(10); doc.text(`${t('date')}: ${dateStr}`, 14, 22);
    let yPos = 30;

    if (activeTab === 'chart' || activeTab === 'all') {
      doc.setFontSize(14); doc.text(t('accounting_chart'), 14, yPos); yPos += 5;
      autoTable(doc, {
        startY: yPos,
        head: [[t('accounting_code'), t('accounting_account'), t('type'), t('accounting_balance')]],
        body: accounts.map(a => [a.code, a.name, typeMap[a.type], `₾${Math.abs(a.balance).toFixed(2)}`]),
        styles: { fontSize: 9 }, headStyles: { fillColor: [22, 163, 74] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    if (activeTab === 'trial' || activeTab === 'all') {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14); doc.text(t('accounting_trial'), 14, yPos); yPos += 5;
      const tbData = trialBalance.filter(tb => tb.debit > 0 || tb.credit > 0);
      autoTable(doc, {
        startY: yPos,
        head: [[t('accounting_code'), t('accounting_account'), t('accounting_debit'), t('accounting_credit')]],
        body: tbData.map(tb => [tb.code, tb.name, tb.debit > 0 ? `₾${tb.debit.toFixed(2)}` : '', tb.credit > 0 ? `₾${tb.credit.toFixed(2)}` : '']),
        foot: [['', t('accounting_grand_total'), `₾${trialBalance.reduce((s, tb) => s + tb.debit, 0).toFixed(2)}`, `₾${trialBalance.reduce((s, tb) => s + tb.credit, 0).toFixed(2)}`]],
        styles: { fontSize: 9 }, headStyles: { fillColor: [22, 163, 74] }, footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
      });
    }
    if (activeTab === 'pl' || activeTab === 'all') {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14); doc.text(t('accounting_pl'), 14, yPos); yPos += 5;
      autoTable(doc, {
        startY: yPos,
        head: [['', t('amount')]],
        body: [[t('accounting_revenue'), `₾${pl.revenue.toFixed(2)}`], [t('accounting_expenses'), `₾${pl.expenses.toFixed(2)}`]],
        foot: [[t('accounting_net_income'), `₾${pl.netIncome.toFixed(2)}`]],
        styles: { fontSize: 9 }, headStyles: { fillColor: [22, 163, 74] },
        footStyles: { fillColor: pl.netIncome >= 0 ? [220, 252, 231] : [254, 226, 226], fontStyle: 'bold' },
      });
    }
    doc.save(`accounting-report-${new Date().toLocaleDateString('ka-GE')}.pdf`);
    toast.success(t('pdf_downloaded'));
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const chartData = [[t('accounting_code'), t('accounting_account'), t('type'), t('accounting_balance')], ...accounts.map(a => [a.code, a.name, typeMap[a.type], Math.abs(a.balance).toFixed(2)])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(chartData), t('accounting_chart'));
    const journalData = [[t('date'), t('description'), t('accounting_debit'), t('accounting_credit'), t('amount')], ...journalEntries.map(e => [e.date, e.description, e.lines?.[0]?.account_code || '-', e.lines?.[1]?.account_code || '-', e.total_debit.toFixed(2)])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(journalData), t('accounting_journal'));
    const tbData = trialBalance.filter(tb => tb.debit > 0 || tb.credit > 0);
    const trialData = [[t('accounting_code'), t('accounting_account'), t('accounting_debit'), t('accounting_credit')], ...tbData.map(tb => [tb.code, tb.name, tb.debit > 0 ? tb.debit.toFixed(2) : '', tb.credit > 0 ? tb.credit.toFixed(2) : '']), ['', t('accounting_grand_total'), trialBalance.reduce((s, tb) => s + tb.debit, 0).toFixed(2), trialBalance.reduce((s, tb) => s + tb.credit, 0).toFixed(2)]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trialData), t('accounting_trial'));
    const plData = [['', t('amount')], [t('accounting_revenue'), pl.revenue.toFixed(2)], [t('accounting_expenses'), pl.expenses.toFixed(2)], [t('accounting_net_income'), pl.netIncome.toFixed(2)]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(plData), t('accounting_pl'));
    XLSX.writeFile(wb, `accounting-report-${new Date().toLocaleDateString('ka-GE')}.xlsx`);
    toast.success(t('excel_downloaded'));
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border p-6 lg:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.04]"><Calculator className="w-full h-full" /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15 border border-primary/20">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">{t('accounting_title')}</h1>
                <p className="text-sm text-muted-foreground">{t('accounting_subtitle')}</p>
              </div>
            </div>
          </div>
          {exchangeRates.length > 0 && (
            <div className="relative z-10 flex gap-3 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar w-full lg:w-auto">
              {exchangeRates.map((rate) => (
                <div key={rate.currency_code} className="bg-background/80 backdrop-blur-sm border border-border rounded-xl p-3 flex flex-col items-center min-w-[80px] shadow-sm">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">{rate.currency_code}</span>
                  <span className="text-sm font-bold font-mono text-foreground">{Number(rate.rate).toFixed(3)}</span>
                  <span className="text-[9px] text-muted-foreground/70 mt-1 flex items-center gap-1"><TrendingUp className="w-2.5 h-2.5 text-success" />NBG</span>
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
                    {card.label === t('accounting_net_income') && (
                      card.value >= 0 ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">{card.label}</p>
                  <p className={`text-lg lg:text-xl font-bold font-mono ${card.color}`}>₾{Math.abs(card.value).toFixed(2)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chart" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="bg-muted/50 border border-border p-1 rounded-xl">
              <TabsTrigger value="chart" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"><BookOpen className="h-3.5 w-3.5" />{t('accounting_chart')}</TabsTrigger>
              <TabsTrigger value="journal" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"><FileSpreadsheet className="h-3.5 w-3.5" />{t('accounting_journal')}</TabsTrigger>
              <TabsTrigger value="trial" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"><Scale className="h-3.5 w-3.5" />{t('accounting_trial')}</TabsTrigger>
              <TabsTrigger value="pl" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"><TrendingUp className="h-3.5 w-3.5" />{t('accounting_pl')}</TabsTrigger>
              <TabsTrigger value="vat" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"><Receipt className="h-3.5 w-3.5" />{t('accounting_vat')}</TabsTrigger>
              <TabsTrigger value="budget" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"><PieChart className="h-3.5 w-3.5" />{t('accounting_budget')}</TabsTrigger>
              <TabsTrigger value="fixed-assets" className="rounded-lg gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"><Box className="h-3.5 w-3.5" />{t('accounting_fixed_assets')}</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button onClick={exportPDF} variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5">
                <FileText className="h-4 w-4 text-primary" /><span className="hidden sm:inline">{t('pdf_export')}</span><span className="sm:hidden">PDF</span>
              </Button>
              <Button onClick={exportExcel} variant="outline" size="sm" className="gap-2 border-success/20 hover:bg-success/5">
                <Download className="h-4 w-4 text-success" /><span className="hidden sm:inline">{t('excel_export')}</span><span className="sm:hidden">Excel</span>
              </Button>
            </div>
          </div>

          {/* Chart of Accounts */}
          <TabsContent value="chart">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />{t('accounting_chart')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableHead className="font-semibold text-foreground">{t('accounting_code')}</TableHead>
                          <TableHead className="font-semibold text-foreground">{t('accounting_account')}</TableHead>
                          <TableHead className="font-semibold text-foreground">{t('type')}</TableHead>
                          <TableHead className="font-semibold text-foreground text-right">{t('accounting_balance')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accounts.map((a) => (
                          <TableRow key={a.code} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono font-bold text-primary">{a.code}</TableCell>
                            <TableCell className="font-medium">{a.name}</TableCell>
                            <TableCell><Badge variant="outline" className={`${typeColorMap[a.type]} border text-[11px] font-medium`}>{typeMap[a.type]}</Badge></TableCell>
                            <TableCell className="text-right font-mono font-semibold">₾{Math.abs(a.balance).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Journal */}
          <TabsContent value="journal" className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />{t('accounting_new_entry')}</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid gap-4 md:grid-cols-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('date')}</Label>
                      <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border-border focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('description')}</Label>
                      <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('description')} className="border-border focus:border-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('accounting_debit')}</Label>
                      <Select value={form.debitAccount} onValueChange={(v) => setForm({ ...form, debitAccount: v })}>
                        <SelectTrigger className="border-border"><SelectValue placeholder={t('accounting_account')} /></SelectTrigger>
                        <SelectContent>{accounts.map((a) => <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('accounting_credit')}</Label>
                      <Select value={form.creditAccount} onValueChange={(v) => setForm({ ...form, creditAccount: v })}>
                        <SelectTrigger className="border-border"><SelectValue placeholder={t('accounting_account')} /></SelectTrigger>
                        <SelectContent>{accounts.map((a) => <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('amount')} (₾)</Label>
                      <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="border-border focus:border-primary font-mono" />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddEntry} className="w-full gap-2"><Plus className="h-4 w-4" />{t('add')}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" />{t('accounting_journal')}</CardTitle>
                    <Badge variant="secondary" className="font-mono">{journalEntries.length} {t('accounting_entries')}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                        <TableHead className="font-semibold text-foreground">{t('date')}</TableHead>
                        <TableHead className="font-semibold text-foreground">{t('description')}</TableHead>
                        <TableHead className="font-semibold text-foreground">{t('accounting_debit')}</TableHead>
                        <TableHead className="font-semibold text-foreground">{t('accounting_credit')}</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">{t('amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {journalEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                            <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">{t('accounting_no_entries')}</p>
                            <p className="text-xs mt-1">{t('accounting_add_entry_hint')}</p>
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
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Trial Balance */}
          <TabsContent value="trial">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4 text-primary" />{t('accounting_trial')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                        <TableHead className="font-semibold text-foreground">{t('accounting_code')}</TableHead>
                        <TableHead className="font-semibold text-foreground">{t('accounting_account')}</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">{t('accounting_debit')}</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">{t('accounting_credit')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.filter(tb => tb.debit > 0 || tb.credit > 0).map((tb) => (
                        <TableRow key={tb.code} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono font-bold text-primary">{tb.code}</TableCell>
                          <TableCell className="font-medium">{tb.name}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-info">{tb.debit > 0 ? `₾${tb.debit.toFixed(2)}` : ''}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-warning">{tb.credit > 0 ? `₾${tb.credit.toFixed(2)}` : ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between items-center px-5 py-4 border-t border-border bg-muted/10">
                    <span className="font-bold text-foreground">{t('accounting_grand_total')}</span>
                    <div className="flex gap-12">
                      <span className="font-bold font-mono text-info">₾{trialBalance.reduce((s, tb) => s + tb.debit, 0).toFixed(2)}</span>
                      <span className="font-bold font-mono text-warning">₾{trialBalance.reduce((s, tb) => s + tb.credit, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* P&L */}
          <TabsContent value="pl">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />{t('accounting_pl')}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="rounded-xl bg-success/8 border border-success/15 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center"><ArrowUpRight className="h-4 w-4 text-success" /></div>
                        <div><p className="text-sm text-muted-foreground">{t('accounting_revenue')}</p><p className="text-xs text-muted-foreground/70">Revenue</p></div>
                      </div>
                      <span className="text-2xl font-bold font-mono text-success">₾{pl.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-destructive/8 border border-destructive/15 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center"><ArrowDownRight className="h-4 w-4 text-destructive" /></div>
                        <div><p className="text-sm text-muted-foreground">{t('accounting_expenses')}</p><p className="text-xs text-muted-foreground/70">Expenses</p></div>
                      </div>
                      <span className="text-2xl font-bold font-mono text-destructive">₾{pl.expenses.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className={`rounded-xl p-5 border-2 ${pl.netIncome >= 0 ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pl.netIncome >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
                          <TrendingUp className={`h-5 w-5 ${pl.netIncome >= 0 ? 'text-success' : 'text-destructive'}`} />
                        </div>
                        <div><p className="font-semibold text-foreground">{t('accounting_net_income')}</p><p className="text-xs text-muted-foreground">Net Income</p></div>
                      </div>
                      <span className={`text-3xl font-bold font-mono ${pl.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>₾{pl.netIncome.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* VAT */}
          <TabsContent value="vat">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" />{t('accounting_vat')}</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-info/8 border border-info/15 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-info/15 flex items-center justify-center"><ArrowDownRight className="h-4 w-4 text-info" /></div>
                        <p className="text-sm font-medium text-muted-foreground">{t('accounting_vat_receivable')}</p>
                      </div>
                      <p className="text-2xl font-bold font-mono text-foreground">₾{Math.abs(accounts.find(a => a.code === '1700')?.balance || 0).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">VAT Receivable</p>
                    </div>
                    <div className="rounded-xl bg-warning/8 border border-warning/15 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center"><ArrowUpRight className="h-4 w-4 text-warning" /></div>
                        <p className="text-sm font-medium text-muted-foreground">{t('accounting_vat_payable')}</p>
                      </div>
                      <p className="text-2xl font-bold font-mono text-foreground">₾{Math.abs(accounts.find(a => a.code === '2500')?.balance || 0).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">VAT Payable</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl bg-muted/20 border border-border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{t('accounting_vat_balance')}</span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        ₾{(Math.abs(accounts.find(a => a.code === '1700')?.balance || 0) - Math.abs(accounts.find(a => a.code === '2500')?.balance || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Budget */}
          <TabsContent value="budget">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" />{t('accounting_budget')}</CardTitle>
                  <Button size="sm" variant="default"><Plus className="h-4 w-4 mr-2" />{t('accounting_new_budget')}</Button>
                </CardHeader>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <PieChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>{t('accounting_budget_empty')}</p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Fixed Assets */}
          <TabsContent value="fixed-assets">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Box className="h-4 w-4 text-primary" />{t('accounting_fixed_assets')}</CardTitle>
                  <Button size="sm" variant="default"><Plus className="h-4 w-4 mr-2" />{t('accounting_add_asset')}</Button>
                </CardHeader>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Box className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>{t('accounting_assets_empty')}</p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
