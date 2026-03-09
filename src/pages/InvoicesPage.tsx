import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useTransactions, type TransactionWithItems } from '@/hooks/useTransactions';
import { useClients } from '@/hooks/useClients';
import { useInvoices } from '@/hooks/useInvoices';
import { useReceiptStore } from '@/stores/useReceiptStore';
import { generateInvoice } from '@/lib/generateInvoice';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Plus, Eye, Loader2, Receipt, Ban, CheckCircle2 } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { clients } = useClients();
  const { invoices, isLoading: invLoading, addInvoice, updateInvoice, getNextInvoiceNumber } = useInvoices();
  const config = useReceiptStore((s) => s.receiptConfig);
  const isMobile = useIsMobile();

  const [tab, setTab] = useState('invoices');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [notes, setNotes] = useState('');

  const isLoading = txLoading || invLoading;

  const completedTx = transactions.filter((t) => t.status === 'completed' && t.type === 'sale');
  // Transactions that don't have an invoice yet
  const uninvoicedTx = completedTx.filter(
    (t) => !invoices.some((inv) => inv.transaction_id === t.id)
  );

  const filteredInvoices = invoices
    .filter((inv) => !dateFilter || inv.issued_date.startsWith(dateFilter))
    .filter((inv) => statusFilter === 'all' || inv.status === statusFilter);

  const getClient = (id?: string | null) => clients.find((c) => c.id === id);
  const getTx = (id?: string | null) => transactions.find((t) => t.id === id);

  const statusLabel = (s: string) => {
    switch (s) {
      case 'issued': return 'გაცემული';
      case 'paid': return 'გადახდილი';
      case 'cancelled': return 'გაუქმებული';
      default: return s;
    }
  };
  const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' => {
    switch (s) {
      case 'paid': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };
  const methodLabel = (m: string) => m === 'cash' ? 'ნაღდი' : m === 'card' ? 'ბარათი' : 'კომბინ.';

  const handleCreateInvoice = async () => {
    if (!selectedTxId) {
      toast.error('აირჩიეთ ტრანზაქცია');
      return;
    }
    const tx = getTx(selectedTxId);
    if (!tx) return;

    const client = getClient(selectedClientId || tx.client_id);
    const invoiceNumber = getNextInvoiceNumber();

    try {
      await addInvoice.mutateAsync({
        invoice_number: invoiceNumber,
        transaction_id: tx.id,
        client_id: client?.id,
        client_name: client?.name || '',
        total: tx.total,
        status: 'issued',
        payment_method: tx.payment_method,
        notes,
        issued_date: new Date().toISOString(),
      });
      toast.success(`ინვოისი ${invoiceNumber} შეიქმნა`);
      setCreateOpen(false);
      setSelectedTxId('');
      setSelectedClientId('');
      setNotes('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDownloadPdf = async (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const tx = getTx(inv.transaction_id);
    if (!tx) {
      toast.error('ტრანზაქცია ვერ მოიძებნა');
      return;
    }
    const client = getClient(inv.client_id);
    const doc = await generateInvoice({
      transaction: tx,
      client,
      config,
      invoiceNumber: inv.invoice_number,
    });
    doc.save(`${inv.invoice_number}.pdf`);
    toast.success('PDF ჩამოიტვირთა');
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateInvoice.mutateAsync({ id, updates: { status } });
      toast.success(`სტატუსი შეიცვალა: ${statusLabel(status)}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Quick invoice from transaction
  const handleQuickInvoice = async (tx: TransactionWithItems) => {
    const client = getClient(tx.client_id);
    const invoiceNumber = getNextInvoiceNumber();
    try {
      const inv = await addInvoice.mutateAsync({
        invoice_number: invoiceNumber,
        transaction_id: tx.id,
        client_id: client?.id,
        client_name: client?.name || '',
        total: tx.total,
        status: 'issued',
        payment_method: tx.payment_method,
        issued_date: new Date().toISOString(),
      });
      // Auto-download PDF
      const doc = await generateInvoice({ transaction: tx, client, config, invoiceNumber });
      doc.save(`${invoiceNumber}.pdf`);
      toast.success(`ინვოისი ${invoiceNumber} შეიქმნა და ჩამოიტვირთა`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">ინვოისები</h1>
          <div className="flex gap-2">
            <PrintButton title="ინვოისების სია" />
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> ინვოისის შექმნა
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="invoices">ინვოისები ({invoices.length})</TabsTrigger>
            <TabsTrigger value="transactions">გაყიდვები ({uninvoicedTx.length})</TabsTrigger>
          </TabsList>

          <TabsContent id="printable-area" value="invoices" className="space-y-3 mt-3">
            <div className="flex flex-wrap gap-2">
              <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="max-w-[180px]" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="max-w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ყველა სტატუსი</SelectItem>
                  <SelectItem value="issued">გაცემული</SelectItem>
                  <SelectItem value="paid">გადახდილი</SelectItem>
                  <SelectItem value="cancelled">გაუქმებული</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredInvoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ინვოისები არ არის</p>
            ) : isMobile ? (
              <div className="space-y-2">
                {filteredInvoices.map((inv) => (
                  <div key={inv.id} className="stat-card p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm font-semibold">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(inv.issued_date).toLocaleDateString('ka-GE')}</p>
                        <p className="text-sm mt-0.5">{inv.client_name || 'არაიდენტიფ.'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">₾{inv.total.toFixed(2)}</p>
                        <Badge variant={statusVariant(inv.status)} className="text-[10px]">{statusLabel(inv.status)}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleDownloadPdf(inv.id)}>
                        <FileDown className="h-3.5 w-3.5" /> PDF
                      </Button>
                      {inv.status === 'issued' && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => handleStatusChange(inv.id, 'paid')}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleStatusChange(inv.id, 'cancelled')}>
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="stat-card overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ნომერი</TableHead>
                      <TableHead>თარიღი</TableHead>
                      <TableHead>კლიენტი</TableHead>
                      <TableHead>ჯამი</TableHead>
                      <TableHead>მეთოდი</TableHead>
                      <TableHead>სტატუსი</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm font-semibold">{inv.invoice_number}</TableCell>
                        <TableCell className="text-xs">{new Date(inv.issued_date).toLocaleDateString('ka-GE')}</TableCell>
                        <TableCell>{inv.client_name || 'არაიდენტიფ.'}</TableCell>
                        <TableCell className="font-semibold">₾{inv.total.toFixed(2)}</TableCell>
                        <TableCell><Badge variant="secondary">{methodLabel(inv.payment_method)}</Badge></TableCell>
                        <TableCell><Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleDownloadPdf(inv.id)} title="PDF ჩამოტვირთვა">
                              <FileDown className="h-4 w-4" />
                            </Button>
                            {inv.status === 'issued' && (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => handleStatusChange(inv.id, 'paid')} title="გადახდილად მონიშვნა">
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => handleStatusChange(inv.id, 'cancelled')} title="გაუქმება">
                                  <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-3 mt-3">
            <p className="text-sm text-muted-foreground">გაყიდვები რომლებსაც ინვოისი ჯერ არ აქვთ — დააჭირეთ ინვოისის სწრაფად შესაქმნელად.</p>
            {uninvoicedTx.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ყველა გაყიდვას ინვოისი აქვს</p>
            ) : isMobile ? (
              <div className="space-y-2">
                {uninvoicedTx.map((t) => {
                  const client = getClient(t.client_id);
                  return (
                    <div key={t.id} className="stat-card p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('ka-GE')}</p>
                          <p className="font-medium mt-0.5">{client?.name || 'არაიდენტიფ.'}</p>
                          <p className="text-xs text-muted-foreground">{(t.items || []).length} პროდუქტი</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-lg font-bold text-primary">₾{t.total.toFixed(2)}</p>
                          <Button size="sm" className="gap-1" onClick={() => handleQuickInvoice(t)}>
                            <Receipt className="h-3.5 w-3.5" /> ინვოისი
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="stat-card overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>თარიღი</TableHead>
                      <TableHead>კლიენტი</TableHead>
                      <TableHead>პროდუქტები</TableHead>
                      <TableHead>ჯამი</TableHead>
                      <TableHead>მეთოდი</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uninvoicedTx.map((t) => {
                      const client = getClient(t.client_id);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{new Date(t.date).toLocaleDateString('ka-GE')}</TableCell>
                          <TableCell>{client?.name || 'არაიდენტიფ.'}</TableCell>
                          <TableCell>{(t.items || []).length} ერთ.</TableCell>
                          <TableCell className="font-semibold">₾{t.total.toFixed(2)}</TableCell>
                          <TableCell><Badge variant="secondary">{methodLabel(t.payment_method)}</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" className="gap-1" onClick={() => handleQuickInvoice(t)}>
                              <Receipt className="h-4 w-4" /> ინვოისი + PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ახალი ინვოისი</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>ტრანზაქცია</Label>
              <Select value={selectedTxId} onValueChange={(v) => {
                setSelectedTxId(v);
                const tx = getTx(v);
                if (tx?.client_id) setSelectedClientId(tx.client_id);
              }}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ გაყიდვა" /></SelectTrigger>
                <SelectContent>
                  {uninvoicedTx.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {new Date(t.date).toLocaleDateString('ka-GE')} — ₾{t.total.toFixed(2)} ({(t.items || []).length} ერთ.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>კლიენტი (არასავალდებულო)</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="კლიენტი" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>შენიშვნა</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="არასავალდებულო" maxLength={500} />
            </div>
            {selectedTxId && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p>ინვოისის ნომერი: <span className="font-mono font-bold">{getNextInvoiceNumber()}</span></p>
                <p>ჯამი: <span className="font-bold text-primary">₾{getTx(selectedTxId)?.total.toFixed(2)}</span></p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleCreateInvoice} disabled={addInvoice.isPending}>
              {addInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              შექმნა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
