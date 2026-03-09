import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useProducts } from '@/hooks/useProducts';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useClients } from '@/hooks/useClients';
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
import { Plus, RotateCcw, Truck, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ReturnRecord {
  id: string;
  type: 'supplier' | 'customer';
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  counterpartyId: string;
  counterpartyName: string;
  reason: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  createdAt: string;
}

export default function ReturnsPage() {
  const { products } = useProducts();
  const { suppliers } = useSuppliers();
  const { clients } = useClients();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnType, setReturnType] = useState<'supplier' | 'customer'>('customer');
  const [form, setForm] = useState({
    productId: '', quantity: '', counterpartyId: '', reason: '',
  });

  const handleAdd = () => {
    if (!form.productId || !form.quantity || !form.counterpartyId) {
      toast.error('შეავსეთ ყველა ველი');
      return;
    }
    const product = products.find(p => p.id === form.productId);
    const counterparty = returnType === 'supplier'
      ? suppliers.find(s => s.id === form.counterpartyId)
      : clients.find(c => c.id === form.counterpartyId);
    const qty = parseInt(form.quantity);
    const unitPrice = returnType === 'supplier' ? (product?.buy_price || 0) : (product?.sell_price || 0);

    setReturns(prev => [...prev, {
      id: crypto.randomUUID(),
      type: returnType,
      date: new Date().toISOString().split('T')[0],
      productId: form.productId,
      productName: product?.name || '',
      quantity: qty,
      unitPrice,
      totalAmount: qty * unitPrice,
      counterpartyId: form.counterpartyId,
      counterpartyName: counterparty?.name || (counterparty as any)?.full_name || '',
      reason: form.reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }]);
    setDialogOpen(false);
    setForm({ productId: '', quantity: '', counterpartyId: '', reason: '' });
    toast.success('დაბრუნება დაემატა');
  };

  const handleStatusChange = (id: string, status: ReturnRecord['status']) => {
    setReturns(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success('სტატუსი განახლდა');
  };

  const supplierReturns = returns.filter(r => r.type === 'supplier');
  const customerReturns = returns.filter(r => r.type === 'customer');

  const totalSupplierAmount = supplierReturns.reduce((s, r) => s + r.totalAmount, 0);
  const totalCustomerAmount = customerReturns.reduce((s, r) => s + r.totalAmount, 0);

  const renderTable = (records: ReturnRecord[]) => (
    <div className="stat-card overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>თარიღი</TableHead>
            <TableHead>პროდუქტი</TableHead>
            <TableHead>კონტრაგენტი</TableHead>
            <TableHead className="text-right">რაოდენობა</TableHead>
            <TableHead className="text-right">თანხა</TableHead>
            <TableHead>მიზეზი</TableHead>
            <TableHead>სტატუსი</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">ჩანაწერები არ არის</TableCell></TableRow>
          ) : records.map(r => (
            <TableRow key={r.id}>
              <TableCell className="text-sm">{r.date}</TableCell>
              <TableCell className="font-medium">{r.productName}</TableCell>
              <TableCell>{r.counterpartyName}</TableCell>
              <TableCell className="text-right">{r.quantity}</TableCell>
              <TableCell className="text-right font-semibold">₾{r.totalAmount.toFixed(2)}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-32 truncate">{r.reason}</TableCell>
              <TableCell>
                <Badge variant={r.status === 'completed' ? 'default' : r.status === 'approved' ? 'secondary' : r.status === 'rejected' ? 'destructive' : 'outline'}>
                  {r.status === 'completed' ? 'დასრულებული' : r.status === 'approved' ? 'დამტკიცებული' : r.status === 'rejected' ? 'უარყოფილი' : 'მოლოდინში'}
                </Badge>
              </TableCell>
              <TableCell>
                {r.status === 'pending' && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleStatusChange(r.id, 'approved')}>✓</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleStatusChange(r.id, 'rejected')}>✗</Button>
                  </div>
                )}
                {r.status === 'approved' && (
                  <Button size="sm" variant="ghost" onClick={() => handleStatusChange(r.id, 'completed')}>დასრულება</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">საქონლის დაბრუნება</h1>
          <div className="flex gap-2">
            <Button onClick={() => { setReturnType('customer'); setDialogOpen(true); }}><Users className="mr-2 h-4 w-4" />მყიდველისგან</Button>
            <Button variant="outline" onClick={() => { setReturnType('supplier'); setDialogOpen(true); }}><Truck className="mr-2 h-4 w-4" />მომწოდებლისთვის</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">მომწოდებლისთვის</p><p className="text-xl font-bold">{supplierReturns.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">მყიდველისგან</p><p className="text-xl font-bold">{customerReturns.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">მომწოდებ. თანხა</p><p className="text-xl font-bold text-warning">₾{totalSupplierAmount.toFixed(0)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">მყიდვ. თანხა</p><p className="text-xl font-bold text-destructive">₾{totalCustomerAmount.toFixed(0)}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="customer">
          <TabsList>
            <TabsTrigger value="customer"><Users className="mr-1 h-3 w-3" />მყიდველისგან</TabsTrigger>
            <TabsTrigger value="supplier"><Truck className="mr-1 h-3 w-3" />მომწოდებლისთვის</TabsTrigger>
          </TabsList>
          <TabsContent value="customer" className="mt-4">{renderTable(customerReturns)}</TabsContent>
          <TabsContent value="supplier" className="mt-4">{renderTable(supplierReturns)}</TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{returnType === 'supplier' ? 'მომწოდებლისთვის დაბრუნება' : 'მყიდველისგან დაბრუნება'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>პროდუქტი</Label>
              <Select value={form.productId} onValueChange={v => setForm(prev => ({ ...prev, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{returnType === 'supplier' ? 'მომწოდებელი' : 'მყიდველი'}</Label>
              <Select value={form.counterpartyId} onValueChange={v => setForm(prev => ({ ...prev, counterpartyId: v }))}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                <SelectContent>
                  {returnType === 'supplier'
                    ? suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                    : clients.map(c => <SelectItem key={c.id} value={c.id}>{(c as any).full_name || (c as any).name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>რაოდენობა</Label><Input type="number" value={form.quantity} onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))} /></div>
            <div className="space-y-1"><Label>მიზეზი</Label><Textarea value={form.reason} onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))} placeholder="დაბრუნების მიზეზი..." /></div>
          </div>
          <DialogFooter><Button onClick={handleAdd}><RotateCcw className="mr-2 h-4 w-4" />დაბრუნება</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
