import { useState, useMemo } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useAccounting } from '@/hooks/useAccounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, CheckCircle2, XCircle, ArrowRightLeft, Loader2, Landmark, Search, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
  counterparty: string;
  matched: boolean;
  matchedEntryId?: string;
  category?: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  currency: string;
  currentBalance: number;
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

function parseCSV(text: string): BankTransaction[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const transactions: BankTransaction[] = [];

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
        id: crypto.randomUUID(),
        date,
        description: desc,
        reference: ref,
        amount,
        type,
        balance,
        counterparty,
        matched: false,
      });
    }
  }
  return transactions;
}

export default function BankIntegrationPage() {
  const { accounts, journalEntries, addEntry } = useAccounting();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [accountDialog, setAccountDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [manualDialog, setManualDialog] = useState(false);
  const [matchView, setMatchView] = useState<BankTransaction | null>(null);
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [csvText, setCsvText] = useState('');
  const [accountForm, setAccountForm] = useState({ bankName: '', accountNumber: '', iban: '', currency: 'GEL' });
  const [manualForm, setManualForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'debit' as 'credit' | 'debit', counterparty: '', reference: '', category: '' });

  // Stats
  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebit = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const matchedCount = transactions.filter(t => t.matched).length;
  const unmatchedCount = transactions.filter(t => !t.matched).length;

  // Filtered transactions
  const filtered = useMemo(() => {
    let list = transactions;
    if (filter === 'matched') list = list.filter(t => t.matched);
    if (filter === 'unmatched') list = list.filter(t => !t.matched);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(t => t.description.toLowerCase().includes(term) || t.counterparty.toLowerCase().includes(term) || t.reference.toLowerCase().includes(term));
    }
    return list;
  }, [transactions, filter, searchTerm]);

  const handleAddAccount = () => {
    if (!accountForm.bankName || !accountForm.accountNumber) { toast.error('შეავსეთ ველები'); return; }
    setBankAccounts(prev => [...prev, { id: crypto.randomUUID(), ...accountForm, currentBalance: 0 }]);
    setAccountDialog(false);
    setAccountForm({ bankName: '', accountNumber: '', iban: '', currency: 'GEL' });
    toast.success('საბანკო ანგარიში დაემატა');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error('ფაილი ვერ დამუშავდა. გამოიყენეთ CSV ფორმატი.');
        return;
      }
      setTransactions(prev => [...prev, ...parsed]);
      toast.success(`${parsed.length} ტრანზაქცია იმპორტირდა`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteImport = () => {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) { toast.error('მონაცემები ვერ დამუშავდა'); return; }
    setTransactions(prev => [...prev, ...parsed]);
    setCsvText('');
    setImportDialog(false);
    toast.success(`${parsed.length} ტრანზაქცია იმპორტირდა`);
  };

  const handleAddManual = () => {
    if (!manualForm.description || !manualForm.amount) { toast.error('შეავსეთ ველები'); return; }
    setTransactions(prev => [...prev, {
      id: crypto.randomUUID(),
      date: manualForm.date,
      description: manualForm.description,
      reference: manualForm.reference,
      amount: parseFloat(manualForm.amount),
      type: manualForm.type,
      balance: 0,
      counterparty: manualForm.counterparty,
      matched: false,
      category: manualForm.category,
    }]);
    setManualDialog(false);
    setManualForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'debit', counterparty: '', reference: '', category: '' });
    toast.success('ტრანზაქცია დაემატა');
  };

  // Auto-match: find journal entries with similar amounts and dates
  const handleAutoMatch = () => {
    let matched = 0;
    setTransactions(prev => prev.map(t => {
      if (t.matched) return t;
      const match = journalEntries.find(je => {
        const amountMatch = Math.abs(je.total_debit - t.amount) < 0.01;
        const dateMatch = je.date?.split('T')[0] === t.date;
        return amountMatch && dateMatch;
      });
      if (match) {
        matched++;
        return { ...t, matched: true, matchedEntryId: match.id };
      }
      return t;
    }));
    toast.success(`${matched} ტრანზაქცია ავტომატურად შედარდა`);
  };

  // Manual match: create journal entry for unmatched transaction
  const handleCreateEntry = async (t: BankTransaction) => {
    const debitAccount = t.type === 'debit' ? '6100' : '2320';
    const creditAccount = t.type === 'debit' ? '2320' : '5110';
    try {
      await addEntry.mutateAsync({
        date: t.date,
        description: `საბანკო: ${t.description}`,
        debitAccount,
        creditAccount,
        amount: t.amount,
        reference: t.reference,
      });
      setTransactions(prev => prev.map(x => x.id === t.id ? { ...x, matched: true } : x));
      setMatchView(null);
      toast.success('ბუღალტრული ჩანაწერი შეიქმნა და შედარდა');
    } catch (err: any) {
      toast.error(err.message || 'ჩანაწერის შექმნა ვერ მოხერხდა');
    }
  };

  const handleUnmatch = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, matched: false, matchedEntryId: undefined } : t));
  };

  // Generate demo data
  const handleGenerateDemo = () => {
    const demos: BankTransaction[] = [
      { id: crypto.randomUUID(), date: '2024-01-15', description: 'საქონლის გაყიდვა - შპს მარშე', reference: 'INV-001', amount: 2450.00, type: 'credit', balance: 55750, counterparty: 'შპს მარშე', matched: false },
      { id: crypto.randomUUID(), date: '2024-01-16', description: 'კომუნალური გადასახადი - თელასი', reference: 'UTL-234', amount: 380.50, type: 'debit', balance: 55369.50, counterparty: 'სს თელასი', matched: false, category: 'utilities' },
      { id: crypto.randomUUID(), date: '2024-01-17', description: 'ხელფასის გადარიცხვა - იანვარი', reference: 'SAL-01', amount: 8500.00, type: 'debit', balance: 46869.50, counterparty: 'თანამშრომლები', matched: false, category: 'salary' },
      { id: crypto.randomUUID(), date: '2024-01-18', description: 'მომწოდებელი - შპს დელტა', reference: 'PO-156', amount: 5200.00, type: 'debit', balance: 41669.50, counterparty: 'შპს დელტა', matched: false, category: 'purchase' },
      { id: crypto.randomUUID(), date: '2024-01-19', description: 'POS ტერმინალი - დღის ჯამი', reference: 'POS-019', amount: 3890.00, type: 'credit', balance: 45559.50, counterparty: '', matched: false, category: 'sales' },
      { id: crypto.randomUUID(), date: '2024-01-20', description: 'ქირა - ოფისი', reference: 'RENT-01', amount: 2000.00, type: 'debit', balance: 43559.50, counterparty: 'შპს რეალტი', matched: false, category: 'rent' },
      { id: crypto.randomUUID(), date: '2024-01-21', description: 'საშემოსავლო გადასახადი', reference: 'TAX-01', amount: 1700.00, type: 'debit', balance: 41859.50, counterparty: 'შემოსავლების სამსახური', matched: false, category: 'tax' },
      { id: crypto.randomUUID(), date: '2024-01-22', description: 'საქონლის გაყიდვა - შპს გუდვილი', reference: 'INV-002', amount: 6780.00, type: 'credit', balance: 48639.50, counterparty: 'შპს გუდვილი', matched: false, category: 'sales' },
    ];
    setTransactions(prev => [...prev, ...demos]);
    toast.success('8 სადემონსტრაციო ტრანზაქცია დაემატა');
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">საბანკო ინტეგრაცია</h1>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <input type="file" accept=".csv,.txt,.xls,.xlsx" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              <Button variant="outline"><Upload className="mr-2 h-4 w-4" />CSV იმპორტი</Button>
            </div>
            <Button variant="outline" onClick={() => setImportDialog(true)}><FileText className="mr-2 h-4 w-4" />ჩასმა</Button>
            <Button variant="outline" onClick={() => setManualDialog(true)}>+ ხელით</Button>
            <Button variant="outline" onClick={handleGenerateDemo}>დემო</Button>
            <Button onClick={handleAutoMatch} disabled={unmatchedCount === 0}><Link2 className="mr-2 h-4 w-4" />ავტო-შედარება</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">სულ ტრანზაქციები</p><p className="text-xl font-bold">{transactions.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">შემოსავალი</p><p className="text-xl font-bold text-success">₾{totalCredit.toFixed(0)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">გასავალი</p><p className="text-xl font-bold text-destructive">₾{totalDebit.toFixed(0)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">შედარებული</p><p className="text-xl font-bold text-success">{matchedCount}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">შეუდარებელი</p><p className="text-xl font-bold text-warning">{unmatchedCount}</p></CardContent></Card>
        </div>

        {/* Bank Accounts */}
        {bankAccounts.length > 0 && (
          <div className="flex gap-3 overflow-auto pb-2">
            {bankAccounts.map(ba => (
              <Card key={ba.id} className="min-w-56">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Landmark className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{ba.bankName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{ba.iban || ba.accountNumber}</p>
                  <p className="text-xs text-muted-foreground">{ba.currency}</p>
                </CardContent>
              </Card>
            ))}
            <Card className="min-w-32 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setAccountDialog(true)}>
              <CardContent className="p-4 flex items-center justify-center h-full">
                <span className="text-muted-foreground text-sm">+ ანგარიში</span>
              </CardContent>
            </Card>
          </div>
        )}

        {bankAccounts.length === 0 && (
          <Button variant="outline" size="sm" onClick={() => setAccountDialog(true)} className="mb-2">
            <Landmark className="mr-2 h-4 w-4" />საბანკო ანგარიშის დამატება
          </Button>
        )}

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

        {/* Transactions Table */}
        <div className="stat-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>თარიღი</TableHead>
                <TableHead>აღწერა</TableHead>
                <TableHead>კონტრაგენტი</TableHead>
                <TableHead>რეფერენსი</TableHead>
                <TableHead>კატეგორია</TableHead>
                <TableHead className="text-right">თანხა</TableHead>
                <TableHead>სტატუსი</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {transactions.length === 0 ? 'იმპორტირეთ საბანკო ამონაწერი CSV ფორმატში ან დაამატეთ სადემონსტრაციო მონაცემები' : 'ტრანზაქციები ვერ მოიძებნა'}
                </TableCell></TableRow>
              ) : filtered.map(t => (
                <TableRow key={t.id} className={t.matched ? 'bg-success/5' : ''}>
                  <TableCell>
                    {t.matched ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground/30" />}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{t.date}</TableCell>
                  <TableCell className="max-w-48 truncate">{t.description}</TableCell>
                  <TableCell className="text-sm">{t.counterparty || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{t.reference || '-'}</TableCell>
                  <TableCell>
                    {t.category && <Badge variant="outline" className="text-xs">{CATEGORIES.find(c => c.value === t.category)?.label || t.category}</Badge>}
                  </TableCell>
                  <TableCell className={`text-right font-semibold whitespace-nowrap ${t.type === 'credit' ? 'text-success' : 'text-destructive'}`}>
                    {t.type === 'credit' ? '+' : '-'}₾{t.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.matched ? 'default' : 'secondary'} className="text-xs">
                      {t.matched ? 'შედარებული' : 'შეუდარებელი'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!t.matched ? (
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
      </div>

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
          <DialogFooter><Button onClick={handleAddAccount}>დამატება</Button></DialogFooter>
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
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">თარიღი:</span><span className="font-medium">{matchView.date}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">აღწერა:</span><span className="font-medium">{matchView.description}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">თანხა:</span><span className={`font-bold ${matchView.type === 'credit' ? 'text-success' : 'text-destructive'}`}>{matchView.type === 'credit' ? '+' : '-'}₾{matchView.amount.toFixed(2)}</span></div>
                {matchView.counterparty && <div className="flex justify-between"><span className="text-sm text-muted-foreground">კონტრაგენტი:</span><span>{matchView.counterparty}</span></div>}
              </div>

              {/* Similar journal entries */}
              <div>
                <h4 className="font-semibold text-sm mb-2">მსგავსი ბუღალტრული ჩანაწერები:</h4>
                {journalEntries
                  .filter(je => Math.abs(je.total_debit - matchView.amount) < matchView.amount * 0.1)
                  .slice(0, 5)
                  .map(je => (
                    <div key={je.id} className="flex items-center justify-between p-2 rounded border mb-1 hover:bg-accent/50 cursor-pointer" onClick={() => {
                      setTransactions(prev => prev.map(t => t.id === matchView.id ? { ...t, matched: true, matchedEntryId: je.id } : t));
                      setMatchView(null);
                      toast.success('შედარდა');
                    }}>
                      <div>
                        <p className="text-sm font-medium">{je.description}</p>
                        <p className="text-xs text-muted-foreground">{je.date?.split('T')[0]}</p>
                      </div>
                      <span className="font-semibold">₾{je.total_debit.toFixed(2)}</span>
                    </div>
                  ))
                }
                {journalEntries.filter(je => Math.abs(je.total_debit - matchView.amount) < matchView.amount * 0.1).length === 0 && (
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
