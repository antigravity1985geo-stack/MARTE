import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Loader2, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { generateInternalWaybill } from '@/lib/waybillGenerator';

export default function WarehouseManagementPage() {
  const { warehouses, writeOffs, transfers, currencies, isLoading, addWarehouse, deleteWarehouse, addWriteOff, addTransfer, updateCurrency } = useWarehouses();
  const { products } = useProducts();
  const queryClient = useQueryClient();
  const [whDialogOpen, setWhDialogOpen] = useState(false);
  const [whName, setWhName] = useState('');
  const [whLocation, setWhLocation] = useState('');
  const [woProductId, setWoProductId] = useState('');
  const [woQuantity, setWoQuantity] = useState('');
  const [woReason, setWoReason] = useState<'damage' | 'expired' | 'shortage' | 'other'>('damage');
  const [woWarehouseId, setWoWarehouseId] = useState('');
  const [trFrom, setTrFrom] = useState('');
  const [trTo, setTrTo] = useState('');
  const [trProductId, setTrProductId] = useState('');
  const [trQuantity, setTrQuantity] = useState('');

  const handleAddWarehouse = async () => {
    if (!whName) return;
    try {
      await addWarehouse.mutateAsync({ name: whName, location: whLocation });
      toast.success('საწყობი დაემატა');
      setWhDialogOpen(false); setWhName(''); setWhLocation('');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleWriteOff = async () => {
    if (!woProductId || !woQuantity || !woWarehouseId) { toast.error('შეავსეთ ყველა ველი'); return; }
    const product = products.find((p) => p.id === woProductId);
    if (!product) return;
    const qty = parseInt(woQuantity);
    try {
      await addWriteOff.mutateAsync({ product_id: woProductId, product_name: product.name, quantity: qty, reason: woReason, warehouse_id: woWarehouseId });
      await supabase.from('products').update({ stock: Math.max(0, product.stock - qty) }).eq('id', woProductId);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('ჩამოწერილია');
      setWoProductId(''); setWoQuantity('');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleTransfer = async () => {
    if (!trFrom || !trTo || !trProductId || !trQuantity) { toast.error('შეავსეთ ყველა ველი'); return; }
    const product = products.find((p) => p.id === trProductId);
    if (!product) return;
    try {
      const res = await addTransfer.mutateAsync({
        from_warehouse_id: trFrom,
        to_warehouse_id: trTo,
        product_id: trProductId,
        product_name: product.name,
        quantity: parseInt(trQuantity)
      });

      toast.success('გადაცემა შესრულდა და მარაგი განახლდა');

      // Auto-generate waybill
      const fromWh = warehouses.find(w => w.id === trFrom);
      const toWh = warehouses.find(w => w.id === trTo);

      generateInternalWaybill({
        transferNumber: res.transfer_id?.slice(0, 8) || 'TR-' + Date.now(),
        date: new Date().toLocaleDateString('ka-GE'),
        fromName: fromWh?.name || 'Unknown',
        toName: toWh?.name || 'Unknown',
        items: [{ name: product.name, quantity: parseInt(trQuantity), unit: product.unit }]
      });

      setTrProductId(''); setTrQuantity('');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteWarehouse = async (id: string) => {
    try {
      await deleteWarehouse.mutateAsync(id);
      toast.success('წაშლილია');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleUpdateCurrency = async (code: string, rate: number) => {
    try {
      await updateCurrency.mutateAsync({ code, rate });
    } catch (err: any) { toast.error(err.message); }
  };

  const reasonMap: Record<string, string> = { damage: 'დაზიანება', expired: 'ვადაგასულობა', shortage: 'დანაკლისი', other: 'სხვა' };

  if (isLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">საწყობების მართვა</h1>
        <Tabs defaultValue="warehouses">
          <TabsList><TabsTrigger value="warehouses">საწყობები</TabsTrigger><TabsTrigger value="writeoffs">ჩამოწერა</TabsTrigger><TabsTrigger value="transfers">გადაცემა</TabsTrigger><TabsTrigger value="currency">ვალუტა</TabsTrigger></TabsList>

          <TabsContent value="warehouses" className="space-y-4 mt-4">
            <Button onClick={() => setWhDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />ახალი საწყობი</Button>
            <div className="stat-card"><Table><TableHeader><TableRow><TableHead>სახელი</TableHead><TableHead>მდებარეობა</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>{warehouses.map((w) => (<TableRow key={w.id}><TableCell>{w.name}</TableCell><TableCell>{w.location}</TableCell><TableCell><Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteWarehouse(w.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody>
            </Table></div>
          </TabsContent>

          <TabsContent value="writeoffs" className="space-y-4 mt-4">
            <div className="stat-card grid gap-3 md:grid-cols-5">
              <div className="space-y-1"><Label>საწყობი</Label><Select value={woWarehouseId} onValueChange={setWoWarehouseId}><SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger><SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>პროდუქტი</Label><Select value={woProductId} onValueChange={setWoProductId}><SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>რაოდენობა</Label><Input type="number" value={woQuantity} onChange={(e) => setWoQuantity(e.target.value)} /></div>
              <div className="space-y-1"><Label>მიზეზი</Label><Select value={woReason} onValueChange={(v: any) => setWoReason(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(reasonMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex items-end"><Button onClick={handleWriteOff} className="w-full">ჩამოწერა</Button></div>
            </div>
            <div className="stat-card"><Table><TableHeader><TableRow><TableHead>თარიღი</TableHead><TableHead>პროდუქტი</TableHead><TableHead>რაოდ.</TableHead><TableHead>მიზეზი</TableHead></TableRow></TableHeader>
              <TableBody>{writeOffs.map((w) => (<TableRow key={w.id}><TableCell className="text-xs">{new Date(w.date).toLocaleDateString('ka-GE')}</TableCell><TableCell>{w.product_name}</TableCell><TableCell>{w.quantity}</TableCell><TableCell>{reasonMap[w.reason] || w.reason}</TableCell></TableRow>))}</TableBody>
            </Table></div>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-4 mt-4">
            <div className="stat-card grid gap-3 md:grid-cols-5">
              <div className="space-y-1"><Label>საწყობიდან</Label><Select value={trFrom} onValueChange={setTrFrom}><SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger><SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>საწყობში</Label><Select value={trTo} onValueChange={setTrTo}><SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger><SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>პროდუქტი</Label><Select value={trProductId} onValueChange={setTrProductId}><SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>რაოდენობა</Label><Input type="number" value={trQuantity} onChange={(e) => setTrQuantity(e.target.value)} /></div>
              <div className="flex items-end"><Button onClick={handleTransfer} className="w-full">გადაცემა</Button></div>
            </div>
            <TableBody>{transfers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs">{new Date(t.date).toLocaleDateString('ka-GE')}</TableCell>
                <TableCell>{t.product_name}</TableCell>
                <TableCell>{t.quantity}</TableCell>
                <TableCell>{warehouses.find((w) => w.id === t.from_warehouse_id)?.name}</TableCell>
                <TableCell>{warehouses.find((w) => w.id === t.to_warehouse_id)?.name}</TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => generateInternalWaybill({
                      transferNumber: t.id.slice(0, 8),
                      date: new Date(t.date).toLocaleDateString('ka-GE'),
                      fromName: warehouses.find((w) => w.id === t.from_warehouse_id)?.name || 'Unknown',
                      toName: warehouses.find((w) => w.id === t.to_warehouse_id)?.name || 'Unknown',
                      items: [{ name: t.product_name, quantity: t.quantity, unit: '' }]
                    })}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </TabsContent>

          <TabsContent value="currency" className="space-y-4 mt-4">
            <div className="stat-card">
              <Table><TableHeader><TableRow><TableHead>ვალუტა</TableHead><TableHead>სახელი</TableHead><TableHead>კურსი (GEL)</TableHead></TableRow></TableHeader>
                <TableBody>{currencies.map((c) => (
                  <TableRow key={c.id}><TableCell className="font-mono font-bold">{c.code}</TableCell><TableCell>{c.name}</TableCell>
                    <TableCell><Input type="number" value={c.rate} onChange={(e) => handleUpdateCurrency(c.code, parseFloat(e.target.value) || 0)} className="w-24" disabled={c.code === 'GEL'} /></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={whDialogOpen} onOpenChange={setWhDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>ახალი საწყობი</DialogTitle></DialogHeader>
          <div className="grid gap-3"><div className="space-y-1"><Label>სახელი</Label><Input value={whName} onChange={(e) => setWhName(e.target.value)} /></div><div className="space-y-1"><Label>მდებარეობა</Label><Input value={whLocation} onChange={(e) => setWhLocation(e.target.value)} /></div></div>
          <DialogFooter><Button onClick={handleAddWarehouse} disabled={addWarehouse.isPending}>{addWarehouse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}დამატება</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
