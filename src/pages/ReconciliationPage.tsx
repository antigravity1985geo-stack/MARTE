import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useReconciliation, BankStatementUpload, BankStatementLine } from '@/hooks/useReconciliation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSearch, CheckCircle2, AlertCircle, RefreshCw, XCircle, Settings, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounting } from '@/hooks/useAccounting';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ReconciliationPage() {
    const { uploads, rules, isLoading, createUpload, addLines, getLines, runAutoMatch, runAutoCategorize, addRule, deleteRule, markLineMatched } = useReconciliation();
    const { addEntry, accounts } = useAccounting();
    const [selectedUpload, setSelectedUpload] = useState<BankStatementUpload | null>(null);
    const [lines, setLines] = useState<BankStatementLine[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [ruleKeyword, setRuleKeyword] = useState('');
    const [ruleAccount, setRuleAccount] = useState('');
    const [rulesOpen, setRulesOpen] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            // Simulate CSV parsing (in a real app, use PapaParse or similar)
            const text = await file.text();
            const rows = text.split('\n').filter(row => row.trim());
            const totalLines = rows.length - 1; // Assuming header row

            const { data: upload, error: uploadError } = await createUpload(file.name, totalLines);
            if (uploadError) throw uploadError;

            // Extract dummy lines for demonstration from the CSV text
            const statementLines = rows.slice(1).map(row => {
                const parts = row.split(',');
                return {
                    upload_id: upload.id,
                    transaction_date: parts[0] || new Date().toISOString().split('T')[0],
                    description: parts[1] || 'Bank Transaction',
                    amount: parseFloat(parts[2]) || 0,
                    counterparty: parts[3] || '',
                    match_status: 'unmatched' as const
                };
            });

            const { error: linesError } = await addLines(statementLines);
            if (linesError) throw linesError;

            toast.success('ამონაწერი აიტვირთა წარმატებით');
            handleViewLines(upload);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('ფაილის ატვირთვა ვერ მოხერხდა');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleViewLines = async (upload: BankStatementUpload) => {
        setSelectedUpload(upload);
        const { data, error } = await getLines(upload.id);
        if (!error) setLines(data || []);
    };

    const handleAutoMatch = async () => {
        if (!selectedUpload) return;
        setIsProcessing(true);
        const { data, error } = await runAutoMatch(selectedUpload.id);
        if (!error) {
            toast.success(`${data} ტრანზაქცია ავტომატურად შედარდა`);
            handleViewLines(selectedUpload);
        }
        setIsProcessing(false);
    };

    const handleAutoCategorize = async () => {
        if (!selectedUpload) return;
        setIsProcessing(true);
        const { data, error } = await runAutoCategorize(selectedUpload.id);
        if (!error) {
            toast.success(`${data} ტრანზაქცია ავტომატურად დაკატეგორიზდა`);
            handleViewLines(selectedUpload);
        }
        setIsProcessing(false);
    };

    const handleCreateEntry = async (line: BankStatementLine, accountCode: string) => {
        if (!accountCode) {
            toast.error('აირჩიეთ ანგარიში');
            return;
        }
        try {
            const isDeposit = line.amount > 0;
            const absAmount = Math.abs(line.amount);
            
            // If amount > 0 (deposit): Debit Bank (2320), Credit Selected Account
            // If amount < 0 (withdrawal): Debit Selected Account, Credit Bank (2320)
            const debitAcc = isDeposit ? '2320' : accountCode;
            const creditAcc = isDeposit ? accountCode : '2320';

            await addEntry.mutateAsync({
                date: line.transaction_date,
                description: line.description,
                debitAccount: debitAcc,
                creditAccount: creditAcc,
                amount: absAmount
            });

            await markLineMatched(line.id, accountCode);
            toast.success('გატარება შეიქმნა');
            handleViewLines(selectedUpload!);
        } catch (err: any) {
            toast.error(err.message || 'შეცდომა გატარებისას');
        }
    };

    const handleAddRule = async () => {
        if (!ruleKeyword || !ruleAccount) return;
        const { error } = await addRule(ruleKeyword, ruleAccount);
        if (!error) {
            toast.success('წესი დაემატა');
            setRuleKeyword('');
            setRuleAccount('');
        }
    };

    return (
        <PageTransition>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">საბანკო შედარება</h1>
                        <p className="text-muted-foreground">ამონაწერების ავტომატური დადარება ბუღალტერიასთან</p>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            type="file"
                            accept=".csv,.xlsx"
                            className="hidden"
                            id="bank-upload"
                            onChange={handleFileUpload}
                        />
                        <Button asChild>
                            <label htmlFor="bank-upload" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                ამონაწერის ატვირთვა
                            </label>
                        </Button>

                        <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> წესები</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader><DialogTitle>კატეგორიზაციის წესები</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-5 gap-2 items-end">
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">საკვანძო სიტყვა</Label>
                                            <Input value={ruleKeyword} onChange={(e) => setRuleKeyword(e.target.value)} placeholder="მაგ: GULF" />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">ანგარიში</Label>
                                            <Select value={ruleAccount} onValueChange={setRuleAccount}>
                                                <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                                                <SelectContent>
                                                    {accounts.map(a => <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1">
                                            <Button onClick={handleAddRule} className="w-full"><Plus className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    <div className="max-h-[300px] overflow-auto border rounded-md divide-y">
                                        {rules.map(r => (
                                            <div key={r.id} className="p-2 flex items-center justify-between text-sm hover:bg-muted/50">
                                                <span><strong>{r.keyword}</strong> → {r.account_code}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteRule(r.id)}><Trash2 className="h-3 w-3" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Upload History Sidebar */}
                    <Card className="lg:col-span-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">ატვირთვების ისტორია</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2">
                            <div className="space-y-1">
                                {uploads.map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleViewLines(u)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${selectedUpload?.id === u.id ? 'bg-primary/20 border-l-2 border-primary' : 'hover:bg-muted'
                                            }`}
                                    >
                                        <div className="font-semibold truncate">{u.filename}</div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                            <span>{new Date(u.upload_date).toLocaleDateString()}</span>
                                            <span>{u.matched_lines}/{u.total_lines} Matched</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lines View */}
                    <Card className="lg:col-span-3">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                {selectedUpload ? `დეტალები: ${selectedUpload.filename}` : 'აირჩიეთ ამონაწერი'}
                            </CardTitle>
                            {selectedUpload && selectedUpload.status !== 'completed' && (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={handleAutoCategorize} disabled={isProcessing}>
                                        {isProcessing ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
                                        ავტო-კატეგორიზაცია
                                    </Button>
                                    <Button size="sm" onClick={handleAutoMatch} disabled={isProcessing}>
                                        {isProcessing ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
                                        ტრანზაქციების დადარება
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[600px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>თარიღი</TableHead>
                                            <TableHead>აღწერა</TableHead>
                                            <TableHead>თანხა</TableHead>
                                            <TableHead>კატეგორია</TableHead>
                                            <TableHead>მოქმედება</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lines.map(line => (
                                            <TableRow key={line.id}>
                                                <TableCell className="text-xs whitespace-nowrap">{line.transaction_date}</TableCell>
                                                <TableCell className="max-w-[200px] truncate">{line.description}</TableCell>
                                                <TableCell className={`font-mono font-bold ${line.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                                                    {line.amount > 0 ? `+${line.amount}` : line.amount}
                                                </TableCell>
                                                <TableCell className="min-w-[150px]">
                                                    {line.match_status === 'matched' ? (
                                                        <Badge className="bg-success/20 text-success border-success/20">
                                                            {line.account_code || 'Matched'}
                                                        </Badge>
                                                    ) : (
                                                        <Select 
                                                            value={line.account_code || ''} 
                                                            onValueChange={(val) => {
                                                                const newLines = [...lines];
                                                                const index = newLines.findIndex(l => l.id === line.id);
                                                                if(index !== -1) { newLines[index].account_code = val; setLines(newLines); }
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-7 text-xs border-primary/20 bg-primary/5">
                                                                <SelectValue placeholder="აირჩიეთ ანგარიში" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {accounts.map(a => <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {line.match_status === 'matched' ? (
                                                         <span className="text-[10px] text-muted-foreground">{line.match_reason || 'ავტო-მენეჯმენტი'}</span>
                                                    ) : (
                                                        <Button 
                                                            size="sm" 
                                                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                                            onClick={() => handleCreateEntry(line, line.account_code || '')}
                                                        >
                                                            გატარება
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {!selectedUpload && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                    <FileSearch className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                                    ამონაწერები არ არის არჩეული
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageTransition>
    );
}
