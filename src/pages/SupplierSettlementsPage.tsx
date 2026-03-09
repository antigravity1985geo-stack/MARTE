import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierPaymentStore } from '@/stores/useSupplierPaymentStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SupplierSettlementsPage() {
  const { suppliers } = useSuppliers();
  const { payments, addPayment } = useSupplierPaymentStore();
  const [supplierId, setSupplierId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'transfer' | 'cash' | 'card'>('transfer');
  const [note, setNote] = useState('');

  const handlePay = () => {
    if (!supplierId || !amount) { toast.error('შეავსეთ ყველა ველი'); return; }
    const supplier = suppliers.find((s) => s.id === supplierId);
    addPayment({ id: crypto.randomUUID(), supplierId, supplierName: supplier?.name || '', amount: parseFloat(amount), method, date: new Date().toISOString(), note });
    toast.success('გადახდა დაფიქსირდა');
    setAmount(''); setNote('');
  };

  const methodMap = { transfer: 'გადარიცხვა', cash: 'ნაღდი', card: 'ბარათი' };

  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">მომწოდებლებთან ანგარიშსწორება</h1>
        <div className="stat-card grid gap-3 md:grid-cols-5">
          <div className="space-y-1"><Label>მომწოდებელი</Label><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger><SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>თანხა</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-1"><Label>მეთოდი</Label><Select value={method} onValueChange={(v: any) => setMethod(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(methodMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>შენიშვნა</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={handlePay} className="w-full">გადახდა</Button></div>
        </div>
        <div className="stat-card overflow-auto">
          <Table>
            <TableHeader><TableRow><TableHead>თარიღი</TableHead><TableHead>მომწოდებელი</TableHead><TableHead>თანხა</TableHead><TableHead>მეთოდი</TableHead><TableHead>შენიშვნა</TableHead></TableRow></TableHeader>
            <TableBody>
              {payments.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">გადახდები არ არის</TableCell></TableRow> :
              payments.slice().reverse().map((p) => (
                <TableRow key={p.id}><TableCell className="text-xs">{new Date(p.date).toLocaleDateString('ka-GE')}</TableCell><TableCell>{p.supplierName}</TableCell><TableCell className="font-semibold">₾{p.amount.toFixed(2)}</TableCell><TableCell><Badge variant="secondary">{methodMap[p.method]}</Badge></TableCell><TableCell className="text-xs">{p.note}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageTransition>
  );
}
