import { useState, useMemo } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFintech, BankTransaction as DBTransaction, BankAccount as DBAccount } from '@/hooks/useFintech';
import { useAccounting } from '@/hooks/useAccounting';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, CheckCircle2, XCircle, ArrowRightLeft, Loader2, Landmark, Search, Link2, Unlink, CreditCard, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';

// Simplified internal type for parser
interface LegacyTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
}

const BANKS = [
  { name: 'საქართველოს ბანკი', code: 'BOG' },
  { name: 'თიბისი ბანკი', code: 'TBC' },
  { name: 'ლიბერთი ბანკი', code: 'LB' },
  { name: 'ბაზისბანკი', code: 'BASIS' },
  { name: 'კრედო ბანკი', code: 'CREDO' },
  { name: 'პროკრედიტ ბანკი', code: 'PCB' },
  { name: 'სხვა', code: 'OTHER' },
];

const CATEGORIES = [
  { value: 'sales', label: 'გაყიდვები' },
  { value: 'purchase', label: 'შესყიდვა' },
  { value: 'salary', label: 'ხელფასი' },
  { value: 'tax', label: 'გადასახადი' },
  { value: 'rent', label: 'ქირა' },
  { value: 'utilities', label: 'კომუნალური' },
  { value: 'loan', label: 'სესხი' },
  { value: 'transfer', label: 'გადარიცხვა' },
  { value: 'other', label: 'სხვა' },
];

function parseCSV(text: string): LegacyTransaction[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const transactions: LegacyTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3) continue;

    // Try common CSV formats: date, description, amount or date, description, debit, credit, balance
    const date = cols[0] || '';
    const desc = cols[1] || '';
    let amount = 0;
    let type: 'credit' | 'debit' = 'debit';
    let balance = 0;
    let ref = '';
    let counterparty = '';

    if (cols.length >= 5) {
      // Format: date, desc, debit, credit, balance
      const debitAmt = parseFloat(cols[2]) || 0;
      const creditAmt = parseFloat(cols[3]) || 0;
      balance = parseFloat(cols[4]) || 0;
      if (creditAmt > 0) { amount = creditAmt; type = 'credit'; }
      else { amount = debitAmt; type = 'debit'; }
      ref = cols[5] || '';
      counterparty = cols[6] || '';
    } else if (cols.length >= 3) {
      // Format: date, desc, amount (negative=debit)
      amount = parseFloat(cols[2]) || 0;
      type = amount >= 0 ? 'credit' : 'debit';
      amount = Math.abs(amount);
      balance = parseFloat(cols[3]) || 0;
      ref = cols[4] || '';
    }

    if (date && (amount > 0 || desc)) {
      transactions.push({
        date,
        description: desc,
        amount,
        type,
      });
    }
  }
  return transactions;
}

import { useEmployees, SalarySlip } from '@/hooks/useEmployees';

export default function FintechPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { accounts, journalEntries, addEntry, addMultiLineEntry } = useAccounting();
  const { employees, salarySlips, paySalary } = useEmployees();
  const { 
    bankAccounts, 
    bankTransactions: transactions, 
    payrollBatches,
    isLoading,
    addBankAccount,
    addTransactions,
    reconcileTransaction
  } = useFintech();

  const [accountDialog, setAccountDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [manualDialog, setManualDialog] = useState(false);
  const [matchView, setMatchView] = useState<DBTransaction | null>(null);
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [csvText, setCsvText] = useState('');
  const [accountForm, setAccountForm] = useState({ bankName: '', accountNumber: '', iban: '', currency: 'GEL' });
  const [manualForm, setManualForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    description: '', 
    amount: '', 
    type: 'debit' as 'credit' | 'debit', 
    counterparty: '', 
    reference: '', 
    category: '' 
  });

  // Stats
  const totalCredit = transactions.filter(t => t.amount > 0 && !t.journal_entry_id).reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0); // Simplified for now
  const totalDebit = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const matchedCount = transactions.filter(t => t.reconciled || t.journal_entry_id).length;
  const unmatchedCount = transactions.filter(t => !t.reconciled && !t.journal_entry_id).length;

  // Filtered transactions
  const filtered = useMemo(() => {
    let list = transactions;
    if (filter === 'matched') list = list.filter(t => t.reconciled || t.journal_entry_id);
    if (filter === 'unmatched') list = list.filter(t => !t.reconciled && !t.journal_entry_id);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(t => 
        (t.description?.toLowerCase().includes(term)) || 
        (t.external_id?.toLowerCase().includes(term))
      );
    }
    return list;
  }, [transactions, filter, searchTerm]);

  const handleAddAccount = async () => {
    if (!accountForm.bankName || !accountForm.iban) { 
      toast.error('შეავსეთ ბანკის სახელი და IBAN'); 
      return; 
    }
    try {
      await addBankAccount.mutateAsync({
        bank_name: accountForm.bankName,
        iban: accountForm.iban,
        account_name: accountForm.accountNumber, // Reusing field
        currency: accountForm.currency,
        status: 'connected'
      });
      setAccountDialog(false);
      setAccountForm({ bankName: '', accountNumber: '', iban: '', currency: 'GEL' });
      toast.success('საბანკო ანგარიში დაემატა');
    } catch (err) {
      toast.error('დამატება ვერ მოხერხდა');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error('ფაილი ვერ დამუშავდა. გამოიყენეთ CSV ფორმატი.');
        return;
      }
      
      // Map legacy CSV format to DB format
      const toInsert: Partial<DBTransaction>[] = parsed.map(p => ({
        tenant_id: user?.id as any, // This should be active tenant id
        amount: p.type === 'credit' ? p.amount : -p.amount,
        description: p.description,
        booking_date: p.date,
        status: 'booked',
        reconciled: false
      }));

      try {
        await addTransactions.mutateAsync(toInsert);
        toast.success(`${parsed.length} ტრანზაქცია იმპორტირდა`);
      } catch (err) {
        toast.error('იმპორტი ვერ მოხერხდა');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteImport = async () => {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) { toast.error('მონაცემები ვერ დამუშავდა'); return; }
    
    const toInsert: Partial<DBTransaction>[] = parsed.map(p => ({
      amount: p.type === 'credit' ? p.amount : -p.amount,
      description: p.description,
      booking_date: p.date,
      status: 'booked',
      reconciled: false
    }));

    try {
      await addTransactions.mutateAsync(toInsert);
      setCsvText('');
      setImportDialog(false);
      toast.success(`${parsed.length} ტრანზაქცია იმპორტირდა`);
    } catch (err) {
      toast.error('იმპორტი ვერ მოხერხდა');
    }
  };

  const handleAddManual = async () => {
    if (!manualForm.description || !manualForm.amount) { toast.error('შეავსეთ ველები'); return; }
    
    try {
      await addTransactions.mutateAsync([{
        amount: manualForm.type === 'credit' ? parseFloat(manualForm.amount) : -parseFloat(manualForm.amount),
        description: manualForm.description,
        booking_date: manualForm.date,
        status: 'booked',
        reconciled: false
      }]);
      setManualDialog(false);
      setManualForm({ 
        date: new Date().toISOString().split('T')[0], 
        description: '', 
        amount: '', 
        type: 'debit', 
        counterparty: '', 
        reference: '', 
        category: '' 
      });
      toast.success('ტრანზაქცია დაემატა');
    } catch (err) {
      toast.error('დამატება ვერ მოხერხდა');
    }
  };

  // Auto-match: find journal entries with similar amounts and dates
  const handleAutoMatch = () => {
    let matched = 0;
    transactions.forEach(async (t) => {
      if (t.reconciled || t.journal_entry_id) return;
      
      const match = journalEntries.find(je => {
        const amountMatch = Math.abs(je.total_debit - Math.abs(t.amount)) < 0.01;
        const dateMatch = je.date?.split('T')[0] === t.booking_date;
        return amountMatch && dateMatch;
      });
      
      if (match) {
        matched++;
        try {
          await reconcileTransaction.mutateAsync({ id: t.id, journalEntryId: match.id });
        } catch (e) {
          console.error('Match failed', e);
        }
      }
    });
    
    if (matched > 0) {
      toast.success(`${matched} ტრანზაქცია ავტომატურად შედარდა`);
    } else {
      toast.info('ავტომატური თანხვედრა ვერ მოიძებნა');
    }
  };

  // Manual match: create journal entry for unmatched transaction
  const handleCreateEntry = async (t: DBTransaction) => {
    const isCredit = t.amount > 0;
    const absAmount = Math.abs(t.amount);
    
    const debitAccount = isCredit ? '2320' : '6100'; // Simplistic mapping
    const creditAccount = isCredit ? '4100' : '2320';
    
    try {
      const entry = await addEntry.mutateAsync({
        date: t.booking_date,
        description: `საბანკო: ${t.description}`,
        debitAccount,
        creditAccount,
        amount: absAmount,
      });
      
      await reconcileTransaction.mutateAsync({ id: t.id, journalEntryId: entry.id });
      setMatchView(null);
      toast.success('ბუღალტრული ჩანაწერი შეიქმნა და შედარდა');
    } catch (err: any) {
      toast.error(err.message || 'ჩანაწერის შექმნა ვერ მოხერხდა');
    }
  };

  const handleUnmatch = async (id: string) => {
    // For now we just reset the reconciled flag, we don't delete the journal entry
    try {
      await supabase.from('bank_transactions').update({ reconciled: false, journal_entry_id: null }).eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
      toast.success('შედარება გაუქმდა');
    } catch (e) {
      toast.error('ოპერაცია ვერ მოხერხდა');
    }
  };

  // Generate demo data
  const handleGenerateDemo = async () => {
    const demos: Partial<DBTransaction>[] = [
      { booking_date: '2024-01-15', description: 'საქონლის გაყიდვა - შპს მარშე', amount: 2450.00, status: 'booked', reconciled: false },
      { booking_date: '2024-01-16', description: 'კომუნალური გადასახადი - თელასი', amount: -380.50, status: 'booked', reconciled: false },
      { booking_date: '2024-01-17', description: 'ხელფასის გადარიცხვა - იანვარი', amount: -8500.00, status: 'booked', reconciled: false },
    ];
    try {
      await addTransactions.mutateAsync(demos);
      toast.success('სადემონსტრაციო ტრანზაქციები დაემატა');
    } catch (e) {
      toast.error('დემო მონაცემების შექმნა ვერ მოხერხდა');
    }
  };

  const handlePayBatch = async () => {
    const pending = salarySlips.filter(s => s.status === 'draft');
    if (pending.length === 0) {
      toast.info('დასამუშავებელი ხელფასები ვერ მოიძებნა');
      return;
    }

    try {
      for (const slip of pending) {
        const emp = employees.find(e => e.id === slip.employee_id);
        
        // 1. Accounting Entry
        await addMultiLineEntry.mutateAsync({
          date: new Date().toISOString().split('T')[0],
          description: `ხელფასი: ${emp?.full_name} (${new Date().getMonth() + 1}/${new Date().getFullYear()})`,
          lines: [
            { accountCode: '6210', debit: slip.gross_salary, credit: 0 },
            { accountCode: '3310', debit: 0, credit: slip.income_tax },
            { accountCode: '3320', debit: 0, credit: slip.pension_contribution },
            { accountCode: '2320', debit: 0, credit: slip.net_salary }
          ],
          reference: `BATCH-PAYROLL-${slip.id.slice(0, 8)}`
        });

        // 2. Mark as paid
        await paySalary.mutateAsync(slip.id);
      }
      toast.success(`${pending.length} თანამშრომლის ხელფასი წარმატებით გადაიხადა`);
    } catch (e: any) {
      toast.error('ბატჩური გადახდა ვერ მოხერხდა: ' + e.message);
    }
  };

  return (
    <PageTransition>
      <Tabs defaultValue="banking" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList>
            <TabsTrigger value="banking" className="gap-2"><Landmark className="h-4 w-4" />საბანკო</TabsTrigger>
            <TabsTrigger value="payroll" className="gap-2"><CreditCard className="h-4 w-4" />ხელფასების გაცემა</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="banking" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                საბანკო <span className="text-portal-primary">Reconciliation</span>
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                   <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Auto-Match Active</span>
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Last Match Run: Today, 14:30</span>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <input type="file" accept=".csv,.txt,.xls,.xlsx" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Button variant="outline" className="h-11 rounded-xl font-bold shadow-sm" disabled={isLoading}><Upload className="mr-2 h-4 w-4" />CSV იმპორტი</Button>
              </div>
              <Button variant="outline" className="h-11 rounded-xl font-bold shadow-sm" onClick={() => setImportDialog(true)} disabled={isLoading}><FileText className="mr-2 h-4 w-4" />ჩასმა</Button>
              <Button onClick={handleAutoMatch} className="h-11 rounded-xl font-black shadow-lg shadow-portal-primary/20 portal-bg-primary" disabled={unmatchedCount === 0 || isLoading}>
                <Link2 className="mr-2 h-4 w-4" />ავტო-შედარება
              </Button>
            </div>
          </div>

          {/* Stats & Content moved inside TabsContent */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">სულ ტრანზაქციები</p><p className="text-xl font-bold">{transactions.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">შემოსავალი</p><p className="text-xl font-bold text-success">₾{totalCredit.toFixed(0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">გასავალი</p><p className="text-xl font-bold text-destructive">₾{totalDebit.toFixed(0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">შედარებული</p><p className="text-xl font-bold text-success">{matchedCount}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">შეუდარებელი</p><p className="text-xl font-bold text-warning">{unmatchedCount}</p></CardContent></Card>
          </div>

          {/* Bank Accounts */}
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 no-scrollbar">
            {bankAccounts.map(ba => (
              <Card key={ba.id} className="min-w-[280px] group transition-all duration-300 hover:shadow-xl border-none bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${ba.status === 'connected' ? 'bg-green-500' : 'bg-destructive'}`} />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:scale-110 transition-transform">
                        <Landmark className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-sm uppercase tracking-tight">{ba.bank_name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono opacity-60">{ba.iban}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[9px] font-black uppercase ${ba.status === 'connected' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-destructive border-destructive/20 bg-destructive/5'}`}>
                      {ba.status === 'connected' ? 'Active' : 'Error'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-end justify-between mt-6">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Last Sync</span>
                       <span className="text-[11px] font-black flex items-center gap-1.5">
                         <Clock className="h-3 w-3 opacity-40" />
                         {ba.last_synced_at ? new Date(ba.last_synced_at).toLocaleString('ka-GE', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                       </span>
                    </div>
                    <div className="text-right">
                       <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Balance</span>
                       <p className="text-lg font-black leading-none">{ba.currency} &bull; ****</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="min-w-40 cursor-pointer border-2 border-dashed border-slate-200 dark:border-white/10 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-all group flex flex-col items-center justify-center gap-3" onClick={() => setAccountDialog(true)}>
               <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="h-5 w-5 text-muted-foreground" />
               </div>
               <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Add Bank</span>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ძებნა..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Badge variant={filter === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('all')}>ყველა ({transactions.length})</Badge>
            <Badge variant={filter === 'matched' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('matched')}>შედარებული ({matchedCount})</Badge>
            <Badge variant={filter === 'unmatched' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('unmatched')}>შეუდარებელი ({unmatchedCount})</Badge>
          </div>

          <div className="stat-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>თარიღი</TableHead>
                  <TableHead>აღწერა</TableHead>
                  <TableHead>კონტრაგენტი</TableHead>
                  <TableHead>რეფერენსი</TableHead>
                  <TableHead className="text-right">თანხა</TableHead>
                  <TableHead>სტატუსი</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {transactions.length === 0 ? 'იმპორტირეთ საბანკო ამონაწერი CSV ფორმატში' : 'ტრანზაქციები ვერ მოიძებნა'}
                  </TableCell></TableRow>
                ) : filtered.map(t => (
                  <TableRow key={t.id} className={t.reconciled || t.journal_entry_id ? 'bg-success/5' : ''}>
                    <TableCell>
                      {(t.reconciled || t.journal_entry_id) ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground/30" />}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{t.booking_date}</TableCell>
                    <TableCell className="max-w-48 truncate">{t.description}</TableCell>
                    <TableCell className="text-sm">-</TableCell>
                    <TableCell className="font-mono text-xs">{t.external_id || '-'}</TableCell>
                    <TableCell className={`text-right font-semibold whitespace-nowrap ${t.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                      {t.amount > 0 ? '+' : '-'}₾{Math.abs(t.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={(t.reconciled || t.journal_entry_id) ? 'default' : 'secondary'} className="text-xs">
                        {(t.reconciled || t.journal_entry_id) ? 'შედარებული' : 'შეუდარებელი'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!(t.reconciled || t.journal_entry_id) ? (
                        <Button size="sm" variant="ghost" onClick={() => setMatchView(t)}>
                          <Link2 className="h-3 w-3 mr-1" />შედარება
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleUnmatch(t.id)}>
                          <Unlink className="h-3 w-3 mr-1" />გაუქმება
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold">ხელფასების One-Click გაცემა</h1>
              <p className="text-sm text-muted-foreground">დაამუშავეთ ყველა მიმდინარე ხელფასი ერთი კლიკით TBC/BOG API-ს მეშვეობით</p>
            </div>
            <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2" onClick={handlePayBatch} disabled={salarySlips.filter(s => s.status === 'draft').length === 0}>
              <CreditCard className="h-5 w-5" />
              Pay All (₾{salarySlips.filter(s => s.status === 'draft').reduce((sum, s) => sum + s.net_salary, 0).toLocaleString()})
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-success/5 border-success/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">დასარიცხი</p>
                <h3 className="text-3xl font-bold text-success">{salarySlips.filter(s => s.status === 'draft').length}</h3>
                <p className="text-xs text-muted-foreground mt-2">თანამშრომელი</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">უნაღდო ანგარიშსწორება</p>
                <h3 className="text-3xl font-bold">TBC/BOG</h3>
                <p className="text-xs text-muted-foreground mt-2">დაკავშირებული API</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">სულ თანხა</p>
                <h3 className="text-3xl font-bold">₾{salarySlips.filter(s => s.status === 'draft').reduce((sum, s) => sum + s.net_salary, 0).toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground mt-2">ბადე (Net)</p>
              </CardContent>
            </Card>
          </div>

          <div className="stat-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>თანამშრომელი</TableHead>
                  <TableHead>ბანკი</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead className="text-right">ხელფასი (Gross)</TableHead>
                  <TableHead className="text-right">ხელზე (Net)</TableHead>
                  <TableHead>სტატუსი</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salarySlips.filter(s => s.status === 'draft' || s.status === 'paid').slice(0, 10).map(slip => {
                   const emp = employees.find(e => e.id === slip.employee_id);
                   return (
                     <TableRow key={slip.id}>
                       <TableCell className="font-medium">{emp?.full_name}</TableCell>
                       <TableCell>{emp?.bank_name || 'TBC'}</TableCell>
                       <TableCell className="font-mono text-xs">{emp?.iban || 'GE00TB...'}</TableCell>
                       <TableCell className="text-right">₾{slip.gross_salary.toLocaleString()}</TableCell>
                       <TableCell className="text-right font-bold">₾{slip.net_salary.toLocaleString()}</TableCell>
                       <TableCell>
                         <Badge variant={slip.status === 'paid' ? 'default' : 'secondary'}>
                           {slip.status === 'paid' ? 'გადახდილი' : 'დასარიცხი'}
                         </Badge>
                       </TableCell>
                     </TableRow>
                   )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Bank Account Dialog */}
      <Dialog open={accountDialog} onOpenChange={setAccountDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>საბანკო ანგარიშის დამატება</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>ბანკი</Label>
              <Select value={accountForm.bankName} onValueChange={v => setAccountForm(prev => ({ ...prev, bankName: v }))}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ ბანკი" /></SelectTrigger>
                <SelectContent>{BANKS.map(b => <SelectItem key={b.code} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>ანგარიშის ნომერი</Label><Input value={accountForm.accountNumber} onChange={e => setAccountForm(prev => ({ ...prev, accountNumber: e.target.value }))} /></div>
              <div className="space-y-1"><Label>IBAN</Label><Input value={accountForm.iban} onChange={e => setAccountForm(prev => ({ ...prev, iban: e.target.value }))} placeholder="GE..." /></div>
            </div>
            <div className="space-y-1">
              <Label>ვალუტა</Label>
              <Select value={accountForm.currency} onValueChange={v => setAccountForm(prev => ({ ...prev, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GEL">GEL - ლარი</SelectItem>
                  <SelectItem value="USD">USD - დოლარი</SelectItem>
                  <SelectItem value="EUR">EUR - ევრო</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddAccount} disabled={addBankAccount.isPending}>დამატება</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paste Import Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>ამონაწერის ჩასმა</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">ჩასვით საბანკო ამონაწერი CSV ფორმატში. ფორმატი: თარიღი, აღწერა, თანხა (ან: თარიღი, აღწერა, დებეტი, კრედიტი, ბალანსი)</p>
            <Textarea value={csvText} onChange={e => setCsvText(e.target.value)} placeholder="თარიღი,აღწერა,თანხა&#10;2024-01-15,გადარიცხვა,1500" rows={10} className="font-mono text-xs" />
          </div>
          <DialogFooter><Button onClick={handlePasteImport} disabled={!csvText.trim()}>იმპორტი</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={manualDialog} onOpenChange={setManualDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>ტრანზაქციის ხელით დამატება</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>თარიღი</Label><Input type="date" value={manualForm.date} onChange={e => setManualForm(prev => ({ ...prev, date: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>ტიპი</Label>
                <Select value={manualForm.type} onValueChange={v => setManualForm(prev => ({ ...prev, type: v as 'credit' | 'debit' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">შემოსავალი (+)</SelectItem>
                    <SelectItem value="debit">გასავალი (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>აღწერა</Label><Input value={manualForm.description} onChange={e => setManualForm(prev => ({ ...prev, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>თანხა (₾)</Label><Input type="number" value={manualForm.amount} onChange={e => setManualForm(prev => ({ ...prev, amount: e.target.value }))} /></div>
              <div className="space-y-1"><Label>კონტრაგენტი</Label><Input value={manualForm.counterparty} onChange={e => setManualForm(prev => ({ ...prev, counterparty: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>რეფერენსი</Label><Input value={manualForm.reference} onChange={e => setManualForm(prev => ({ ...prev, reference: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>კატეგორია</Label>
                <Select value={manualForm.category} onValueChange={v => setManualForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddManual}>დამატება</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match/Create Entry Dialog */}
      <Dialog open={!!matchView} onOpenChange={() => setMatchView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ტრანზაქციის შედარება</DialogTitle></DialogHeader>
          {matchView && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">თარიღი:</span><span className="font-medium">{matchView.booking_date}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">აღწერა:</span><span className="font-medium">{matchView.description}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">თანხა:</span><span className={`font-bold ${matchView.amount > 0 ? 'text-success' : 'text-destructive'}`}>{matchView.amount > 0 ? '+' : '-'}₾{Math.abs(matchView.amount).toFixed(2)}</span></div>
                {matchView.external_id && <div className="flex justify-between"><span className="text-sm text-muted-foreground">რეფერენსი:</span><span>{matchView.external_id}</span></div>}
              </div>

              {/* Similar journal entries */}
              <div>
                <h4 className="font-semibold text-sm mb-2">მსგავსი ბუღალტრული ჩანაწერები:</h4>
                {journalEntries
                  .filter(je => Math.abs(je.total_debit - Math.abs(matchView.amount)) < Math.abs(matchView.amount) * 0.1)
                  .slice(0, 5)
                  .map(je => (
                    <div key={je.id} className="flex items-center justify-between p-2 rounded border mb-1 hover:bg-accent/50 cursor-pointer" onClick={async () => {
                      try {
                        await reconcileTransaction.mutateAsync({ id: matchView.id, journalEntryId: je.id });
                        setMatchView(null);
                        toast.success('შედარდა');
                      } catch (e) {
                        toast.error('ოპერაცია ვერ მოხერხდა');
                      }
                    }}>
                      <div>
                        <p className="text-sm font-medium">{je.description}</p>
                        <p className="text-xs text-muted-foreground">{je.date?.split('T')[0]}</p>
                      </div>
                      <span className="font-semibold">₾{je.total_debit.toFixed(2)}</span>
                    </div>
                  ))
                }
                {journalEntries.filter(je => Math.abs(je.total_debit - Math.abs(matchView.amount)) < Math.abs(matchView.amount) * 0.1).length === 0 && (
                  <p className="text-sm text-muted-foreground">მსგავსი ჩანაწერები ვერ მოიძებნა</p>
                )}
              </div>

              <Button className="w-full" onClick={() => handleCreateEntry(matchView)}>
                <ArrowRightLeft className="mr-2 h-4 w-4" />ახალი ბუღალტრული ჩანაწერის შექმნა
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
