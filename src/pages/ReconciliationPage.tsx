import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useReconciliation, BankStatementUpload, BankStatementLine } from '@/hooks/useReconciliation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSearch, CheckCircle2, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ReconciliationPage() {
    const { uploads, isLoading, createUpload, addLines, getLines, runAutoMatch } = useReconciliation();
    const [selectedUpload, setSelectedUpload] = useState<BankStatementUpload | null>(null);
    const [lines, setLines] = useState<BankStatementLine[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

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
                                <Button size="sm" onClick={handleAutoMatch} disabled={isProcessing}>
                                    {isProcessing ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
                                    ავტო-შედარება
                                </Button>
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
                                            <TableHead>სტატუსი</TableHead>
                                            <TableHead>მიზეზი</TableHead>
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
                                                <TableCell>
                                                    {line.match_status === 'matched' ? (
                                                        <Badge className="bg-success/20 text-success border-success/20">Matched</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Unmatched</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-[10px] italic text-muted-foreground">
                                                    {line.match_reason || '-'}
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
