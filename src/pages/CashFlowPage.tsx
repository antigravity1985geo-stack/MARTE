import { PageTransition } from '@/components/PageTransition';
import { useAccounting } from '@/hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, Landmark,
  Scale, Banknote, FileSpreadsheet, CheckCircle2, XCircle, ArrowDownRight,
  PiggyBank, Building2, CircleDollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function CashFlowPage() {
  const { accounts, journalEntries, getProfitLoss, isLoading } = useAccounting();

  const cashAccount = accounts.find(a => a.code === '2310');
  const bankAccount = accounts.find(a => a.code === '2320');
  const totalCash = (cashAccount?.balance || 0) + (bankAccount?.balance || 0);

  const { revenue, totalExpenses: expenses, netIncome } = getProfitLoss();

  const totalAssets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalLiabilities = accounts.filter(a => a.type === 'liability').reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalEquity = accounts.filter(a => a.type === 'equity').reduce((s, a) => s + Math.abs(a.balance), 0);

  const operatingInflows = revenue;
  const operatingOutflows = expenses;
  const operatingCashFlow = operatingInflows - operatingOutflows;
  const isBalanced = Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01;

  const summaryCards = [
    { label: 'ნაღდი ფული', sublabel: 'Cash', value: cashAccount?.balance || 0, icon: Banknote, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { label: 'ბანკი', sublabel: 'Bank', value: bankAccount?.balance || 0, icon: Landmark, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    { label: 'სულ აქტივები', sublabel: 'Total Assets', value: totalAssets, icon: PiggyBank, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
    { label: 'წმინდა მოგება', sublabel: 'Net Income', value: netIncome, icon: TrendingUp, color: netIncome >= 0 ? 'text-success' : 'text-destructive', bg: netIncome >= 0 ? 'bg-success/10' : 'bg-destructive/10', border: netIncome >= 0 ? 'border-success/20' : 'border-destructive/20' },
  ];

  const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );

  const LineItem = ({ label, value, color, mono = true }: { label: string; value: string; color?: string; mono?: boolean }) => (
    <div className="flex justify-between items-center py-2 border-b border-border/40 last:border-b-0 group hover:bg-muted/20 px-2 -mx-2 rounded-md transition-colors">
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
      <span className={`text-sm font-semibold ${mono ? 'font-mono' : ''} ${color || 'text-foreground'}`}>{value}</span>
    </div>
  );

  const TotalLine = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div className="flex justify-between items-center py-3 mt-1 border-t-2 border-border">
      <span className="font-bold text-foreground">{label}</span>
      <span className={`font-bold font-mono text-lg ${color || 'text-foreground'}`}>{value}</span>
    </div>
  );

  if (isLoading) {
    return <PageTransition><div className="flex justify-center py-12">მონაცემები იტვირთება...</div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border p-6 lg:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.04]">
            <CircleDollarSign className="w-full h-full" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15 border border-primary/20">
                <CircleDollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">ფინანსური ანგარიშგება</h1>
                <p className="text-sm text-muted-foreground">ბალანსი · ფულადი ნაკადები · ფინანსური მდგომარეობა</p>
              </div>
            </div>
          </div>
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
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">{card.label}</p>
                  <p className="text-[10px] text-muted-foreground/60 mb-1">{card.sublabel}</p>
                  <p className={`text-lg lg:text-xl font-bold font-mono ${card.color}`}>
                    ₾{Math.abs(card.value).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          {/* Balance Sheet */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="border-border overflow-hidden h-full">
              <CardHeader className="bg-muted/20 border-b border-border pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" /> ბალანსი
                  <span className="text-xs text-muted-foreground font-normal ml-1">Balance Sheet</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {/* Assets */}
                <div className="rounded-xl bg-info/5 border border-info/10 p-4">
                  <SectionHeader icon={PiggyBank} title="აქტივები" subtitle="Assets" />
                  {accounts.filter(a => a.type === 'asset' && Math.abs(a.balance) > 0).map(a => (
                    <LineItem key={a.code} label={`${a.code} - ${a.name}`} value={`₾${Math.abs(a.balance).toFixed(2)}`} />
                  ))}
                  <TotalLine label="სულ აქტივები:" value={`₾${totalAssets.toFixed(2)}`} color="text-info" />
                </div>

                {/* Liabilities */}
                <div className="rounded-xl bg-warning/5 border border-warning/10 p-4">
                  <SectionHeader icon={ArrowDownLeft} title="ვალდებულებები" subtitle="Liabilities" />
                  {accounts.filter(a => a.type === 'liability' && Math.abs(a.balance) > 0).map(a => (
                    <LineItem key={a.code} label={`${a.code} - ${a.name}`} value={`₾${Math.abs(a.balance).toFixed(2)}`} />
                  ))}
                  <TotalLine label="სულ ვალდებულებები:" value={`₾${totalLiabilities.toFixed(2)}`} color="text-warning" />
                </div>

                {/* Equity */}
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <SectionHeader icon={Building2} title="კაპიტალი" subtitle="Equity" />
                  {accounts.filter(a => a.type === 'equity' && Math.abs(a.balance) > 0).map(a => (
                    <LineItem key={a.code} label={`${a.code} - ${a.name}`} value={`₾${Math.abs(a.balance).toFixed(2)}`} />
                  ))}
                  <TotalLine label="სულ კაპიტალი:" value={`₾${totalEquity.toFixed(2)}`} color="text-primary" />
                </div>

                {/* Balance Check */}
                <div className={`rounded-xl p-4 border-2 ${isBalanced ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isBalanced
                        ? <CheckCircle2 className="h-5 w-5 text-success" />
                        : <XCircle className="h-5 w-5 text-destructive" />}
                      <div>
                        <span className="font-semibold text-sm text-foreground">A = L + E</span>
                        <p className="text-[10px] text-muted-foreground">Accounting Equation</p>
                      </div>
                    </div>
                    <Badge variant={isBalanced ? 'default' : 'destructive'} className="text-xs">
                      {isBalanced ? 'ბალანსდება ✓' : 'არ ბალანსდება ✗'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cash Flow Statement */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <Card className="border-border overflow-hidden h-full">
              <CardHeader className="bg-muted/20 border-b border-border pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" /> ფულადი სახსრების მოძრაობა
                  <span className="text-xs text-muted-foreground font-normal ml-1">Cash Flow</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {/* Operating */}
                <div className="rounded-xl bg-success/5 border border-success/10 p-4">
                  <SectionHeader icon={TrendingUp} title="საოპერაციო საქმიანობა" subtitle="Operating Activities" />
                  <LineItem label="შემოსავლები" value={`₾${operatingInflows.toFixed(2)}`} color="text-success" />
                  <LineItem label="ხარჯები" value={`₾${operatingOutflows.toFixed(2)}`} color="text-destructive" />
                  <TotalLine
                    label="საოპერაციო ნაკადი:"
                    value={`₾${operatingCashFlow.toFixed(2)}`}
                    color={operatingCashFlow >= 0 ? 'text-success' : 'text-destructive'}
                  />
                </div>

                {/* Cash Balance */}
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <SectionHeader icon={Banknote} title="ფულადი ნაშთი" subtitle="Cash Balance" />
                  <LineItem label="სალარო" value={`₾${(cashAccount?.balance || 0).toFixed(2)}`} />
                  <LineItem label="ბანკი" value={`₾${(bankAccount?.balance || 0).toFixed(2)}`} />
                  <TotalLine label="სულ ფულადი საშუალებები:" value={`₾${totalCash.toFixed(2)}`} color="text-primary" />
                </div>

                {/* Recent Journal Entries */}
                <div className="rounded-xl bg-muted/20 border border-border p-4">
                  <SectionHeader icon={FileSpreadsheet} title="ბოლო ტრანზაქციები" subtitle="Recent Entries" />
                  {journalEntries.length === 0 ? (
                    <div className="text-center py-6">
                      <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm text-muted-foreground">ჩანაწერები არ არის</p>
                    </div>
                  ) : (
                    journalEntries.slice(-5).reverse().map(e => (
                      <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-b-0 group hover:bg-muted/20 px-2 -mx-2 rounded-md transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{e.date?.split('T')[0]}</span>
                          <span className="text-sm truncate text-foreground group-hover:text-primary transition-colors">{e.description}</span>
                        </div>
                        <span className="font-semibold font-mono text-sm text-foreground ml-2 whitespace-nowrap">₾{e.total_debit.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
