import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Package, Calculator, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryBatch {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedDate: string;
  expiryDate?: string;
}

type CostMethod = 'fifo' | 'lifo' | 'average';

const methodLabels: Record<CostMethod, string> = {
  fifo: 'FIFO (პირველი შესული - პირველი გასული)',
  lifo: 'LIFO (ბოლო შესული - პირველი გასული)',
  average: 'საშუალო შეწონილი',
};

export default function InventoryMethodsPage() {
  const { products } = useProducts();
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [method, setMethod] = useState<CostMethod>('fifo');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', quantity: '', unitCost: '', expiryDate: '' });
  const [writeOffDialog, setWriteOffDialog] = useState(false);
  const [writeOffForm, setWriteOffForm] = useState({ productId: '', quantity: '' });

  const handleAddBatch = () => {
    if (!form.productId || !form.quantity || !form.unitCost) { toast.error('შეავსეთ ველები'); return; }
    const product = products.find(p => p.id === form.productId);
    const qty = parseInt(form.quantity);
    const cost = parseFloat(form.unitCost);
    setBatches(prev => [...prev, {
      id: crypto.randomUUID(),
      productId: form.productId,
      productName: product?.name || '',
      quantity: qty,
      unitCost: cost,
      totalCost: qty * cost,
      receivedDate: new Date().toISOString().split('T')[0],
      expiryDate: form.expiryDate || undefined,
    }]);
    setDialogOpen(false);
    setForm({ productId: '', quantity: '', unitCost: '', expiryDate: '' });
    toast.success('პარტია დაემატა');
  };

  const handleWriteOff = () => {
    const qty = parseInt(writeOffForm.quantity);
    if (!writeOffForm.productId || !qty) { toast.error('შეავსეთ ველები'); return; }

    const productBatches = batches
      .filter(b => b.productId === writeOffForm.productId && b.quantity > 0)
      .sort((a, b) => {
        if (method === 'fifo') return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
        if (method === 'lifo') return new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
        return 0;
      });

    let remaining = qty;
    let totalCost = 0;
    const updatedBatches = [...batches];

    if (method === 'average') {
      const totalQty = productBatches.reduce((s, b) => s + b.quantity, 0);
      const totalVal = productBatches.reduce((s, b) => s + b.totalCost, 0);
      const avgCost = totalQty > 0 ? totalVal / totalQty : 0;
      totalCost = qty * avgCost;

      // Reduce from all batches proportionally
      for (const batch of productBatches) {
        if (remaining <= 0) break;
        const idx = updatedBatches.findIndex(b => b.id === batch.id);
        const take = Math.min(batch.quantity, remaining);
        updatedBatches[idx] = { ...batch, quantity: batch.quantity - take, totalCost: (batch.quantity - take) * batch.unitCost };
        remaining -= take;
      }
    } else {
      for (const batch of productBatches) {
        if (remaining <= 0) break;
        const idx = updatedBatches.findIndex(b => b.id === batch.id);
        const take = Math.min(batch.quantity, remaining);
        totalCost += take * batch.unitCost;
        updatedBatches[idx] = { ...batch, quantity: batch.quantity - take, totalCost: (batch.quantity - take) * batch.unitCost };
        remaining -= take;
      }
    }

    if (remaining > 0) {
      toast.error('არასაკმარისი მარაგი');
      return;
    }

    setBatches(updatedBatches);
    setWriteOffDialog(false);
    setWriteOffForm({ productId: '', quantity: '' });
    toast.success(`ჩამოიწერა ${qty} ერთეული, თვითღირებულება: ₾${totalCost.toFixed(2)} (${methodLabels[method]})`);
  };

  const productGroups = products.map(p => {
    const pBatches = batches.filter(b => b.productId === p.id && b.quantity > 0);
    const totalQty = pBatches.reduce((s, b) => s + b.quantity, 0);
    const totalCost = pBatches.reduce((s, b) => s + b.totalCost, 0);
    const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
    return { ...p, batches: pBatches, totalQty, totalCost, avgCost };
  }).filter(p => p.batches.length > 0);

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">მარაგის ჩამოწერის მეთოდები</h1>
          <div className="flex gap-2 items-center">
            <Select value={method} onValueChange={v => setMethod(v as CostMethod)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fifo">FIFO</SelectItem>
                <SelectItem value="lifo">LIFO</SelectItem>
                <SelectItem value="average">საშუალო</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />პარტია</Button>
            <Button variant="outline" onClick={() => setWriteOffDialog(true)}><Calculator className="mr-2 h-4 w-4" />ჩამოწერა</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">აქტიური მეთოდი</p><p className="text-lg font-bold">{method.toUpperCase()}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Layers className="h-5 w-5 text-success" /><div><p className="text-xs text-muted-foreground">პარტიები</p><p className="text-xl font-bold">{batches.filter(b => b.quantity > 0).length}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-info" /><div><p className="text-xs text-muted-foreground">ჯამური ღირებულება</p><p className="text-xl font-bold">₾{batches.reduce((s, b) => s + b.totalCost, 0).toFixed(0)}</p></div></div></CardContent></Card>
        </div>

        {/* Product Groups with Batches */}
        {productGroups.map(pg => (
          <Card key={pg.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{pg.name}</CardTitle>
                <div className="flex gap-3 text-sm">
                  <span>მარაგი: <strong>{pg.totalQty}</strong></span>
                  <span>ღირებულება: <strong>₾{pg.totalCost.toFixed(2)}</strong></span>
                  <span>საშ. ფასი: <strong>₾{pg.avgCost.toFixed(2)}</strong></span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>მიღების თარიღი</TableHead>
                    <TableHead>ვადა</TableHead>
                    <TableHead className="text-right">რაოდენობა</TableHead>
                    <TableHead className="text-right">ერთეულის ფასი</TableHead>
                    <TableHead className="text-right">ჯამი</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pg.batches.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>{b.receivedDate}</TableCell>
                      <TableCell>{b.expiryDate || '-'}</TableCell>
                      <TableCell className="text-right">{b.quantity}</TableCell>
                      <TableCell className="text-right">₾{b.unitCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">₾{b.totalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {productGroups.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>პარტიები არ არის. დაამატეთ პირველი პარტია.</p>
          </div>
        )}
      </div>

      {/* Add Batch Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ახალი პარტია</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>პროდუქტი</Label>
              <Select value={form.productId} onValueChange={v => setForm(prev => ({ ...prev, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>რაოდენობა</Label><Input type="number" value={form.quantity} onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))} /></div>
              <div className="space-y-1"><Label>ერთეულის ფასი</Label><Input type="number" value={form.unitCost} onChange={e => setForm(prev => ({ ...prev, unitCost: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>ვარგისიანობის ვადა</Label><Input type="date" value={form.expiryDate} onChange={e => setForm(prev => ({ ...prev, expiryDate: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleAddBatch}>დამატება</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Write-off Dialog */}
      <Dialog open={writeOffDialog} onOpenChange={setWriteOffDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>ჩამოწერა ({method.toUpperCase()} მეთოდით)</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>პროდუქტი</Label>
              <Select value={writeOffForm.productId} onValueChange={v => setWriteOffForm(prev => ({ ...prev, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                <SelectContent>{products.filter(p => batches.some(b => b.productId === p.id && b.quantity > 0)).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>რაოდენობა</Label><Input type="number" value={writeOffForm.quantity} onChange={e => setWriteOffForm(prev => ({ ...prev, quantity: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleWriteOff}><Calculator className="mr-2 h-4 w-4" />ჩამოწერა</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
