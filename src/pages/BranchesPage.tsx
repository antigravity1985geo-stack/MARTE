import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, MapPin, Building2, ArrowRightLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  isActive: boolean;
  createdAt: string;
}

interface Transfer {
  id: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'in_transit' | 'received';
  date: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([
    { id: '1', name: 'მთავარი ფილიალი', address: 'თბილისი, რუსთაველის 1', phone: '+995 555 123456', manager: 'გიორგი', isActive: true, createdAt: new Date().toISOString() },
  ]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [branchDialog, setBranchDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '', manager: '' });
  const [transferForm, setTransferForm] = useState({ fromBranchId: '', toBranchId: '', productName: '', quantity: '' });

  const handleSaveBranch = () => {
    if (!branchForm.name || !branchForm.address) { toast.error('შეავსეთ ყველა ველი'); return; }
    if (editing) {
      setBranches(prev => prev.map(b => b.id === editing.id ? { ...b, ...branchForm } : b));
      toast.success('ფილიალი განახლდა');
    } else {
      setBranches(prev => [...prev, { id: crypto.randomUUID(), ...branchForm, isActive: true, createdAt: new Date().toISOString() }]);
      toast.success('ფილიალი დაემატა');
    }
    setBranchDialog(false);
    setBranchForm({ name: '', address: '', phone: '', manager: '' });
    setEditing(null);
  };

  const handleTransfer = () => {
    if (!transferForm.fromBranchId || !transferForm.toBranchId || !transferForm.productName || !transferForm.quantity) {
      toast.error('შეავსეთ ყველა ველი'); return;
    }
    if (transferForm.fromBranchId === transferForm.toBranchId) {
      toast.error('ფილიალები ერთნაირია'); return;
    }
    const from = branches.find(b => b.id === transferForm.fromBranchId);
    const to = branches.find(b => b.id === transferForm.toBranchId);
    setTransfers(prev => [...prev, {
      id: crypto.randomUUID(),
      fromBranchId: transferForm.fromBranchId,
      fromBranchName: from?.name || '',
      toBranchId: transferForm.toBranchId,
      toBranchName: to?.name || '',
      productName: transferForm.productName,
      quantity: parseInt(transferForm.quantity),
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
    }]);
    setTransferDialog(false);
    setTransferForm({ fromBranchId: '', toBranchId: '', productName: '', quantity: '' });
    toast.success('ტრანსფერი შეიქმნა');
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">ფილიალები</h1>
          <div className="flex gap-2">
            <Button onClick={() => { setEditing(null); setBranchForm({ name: '', address: '', phone: '', manager: '' }); setBranchDialog(true); }}>
              <Plus className="mr-2 h-4 w-4" />ახალი ფილიალი
            </Button>
            <Button variant="outline" onClick={() => setTransferDialog(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />ტრანსფერი
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">ფილიალები</p><p className="text-xl font-bold">{branches.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-success" /><div><p className="text-xs text-muted-foreground">აქტიური</p><p className="text-xl font-bold">{branches.filter(b => b.isActive).length}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-info" /><div><p className="text-xs text-muted-foreground">ტრანსფერები</p><p className="text-xl font-bold">{transfers.length}</p></div></div></CardContent></Card>
        </div>

        {/* Branches Table */}
        <div className="stat-card overflow-auto">
          <h3 className="font-semibold p-3 border-b">ფილიალების სია</h3>
          <Table>
            <TableHeader>
              <TableRow><TableHead>ფილიალი</TableHead><TableHead>მისამართი</TableHead><TableHead>ტელეფონი</TableHead><TableHead>მენეჯერი</TableHead><TableHead>სტატუსი</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {branches.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.address}</TableCell>
                  <TableCell>{b.phone}</TableCell>
                  <TableCell>{b.manager}</TableCell>
                  <TableCell><Badge variant={b.isActive ? 'default' : 'secondary'}>{b.isActive ? 'აქტიური' : 'არააქტიური'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setBranchForm({ name: b.name, address: b.address, phone: b.phone, manager: b.manager }); setBranchDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setBranches(prev => prev.filter(x => x.id !== b.id)); toast.success('წაშლილია'); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Transfers Table */}
        {transfers.length > 0 && (
          <div className="stat-card overflow-auto">
            <h3 className="font-semibold p-3 border-b">ტრანსფერები</h3>
            <Table>
              <TableHeader>
                <TableRow><TableHead>თარიღი</TableHead><TableHead>საიდან</TableHead><TableHead>სად</TableHead><TableHead>პროდუქტი</TableHead><TableHead>რაოდენობა</TableHead><TableHead>სტატუსი</TableHead><TableHead></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>{t.fromBranchName}</TableCell>
                    <TableCell>{t.toBranchName}</TableCell>
                    <TableCell className="font-medium">{t.productName}</TableCell>
                    <TableCell>{t.quantity}</TableCell>
                    <TableCell><Badge variant={t.status === 'received' ? 'default' : 'secondary'}>{t.status === 'received' ? 'მიღებული' : t.status === 'in_transit' ? 'გზაში' : 'მოლოდინში'}</Badge></TableCell>
                    <TableCell>
                      {t.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => setTransfers(prev => prev.map(x => x.id === t.id ? { ...x, status: 'in_transit' } : x))}>გაგზავნა</Button>}
                      {t.status === 'in_transit' && <Button size="sm" variant="ghost" onClick={() => setTransfers(prev => prev.map(x => x.id === t.id ? { ...x, status: 'received' } : x))}>მიღება</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Branch Dialog */}
      <Dialog open={branchDialog} onOpenChange={setBranchDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'ფილიალის რედაქტირება' : 'ახალი ფილიალი'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>სახელი</Label><Input value={branchForm.name} onChange={e => setBranchForm(prev => ({ ...prev, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>მისამართი</Label><Input value={branchForm.address} onChange={e => setBranchForm(prev => ({ ...prev, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>ტელეფონი</Label><Input value={branchForm.phone} onChange={e => setBranchForm(prev => ({ ...prev, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>მენეჯერი</Label><Input value={branchForm.manager} onChange={e => setBranchForm(prev => ({ ...prev, manager: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveBranch}>{editing ? 'განახლება' : 'დამატება'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>ფილიალთაშორისი ტრანსფერი</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>საიდან</Label>
              <Select value={transferForm.fromBranchId} onValueChange={v => setTransferForm(prev => ({ ...prev, fromBranchId: v }))}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>სად</Label>
              <Select value={transferForm.toBranchId} onValueChange={v => setTransferForm(prev => ({ ...prev, toBranchId: v }))}>
                <SelectTrigger><SelectValue placeholder="აირჩიეთ" /></SelectTrigger>
                <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>პროდუქტი</Label><Input value={transferForm.productName} onChange={e => setTransferForm(prev => ({ ...prev, productName: e.target.value }))} /></div>
            <div className="space-y-1"><Label>რაოდენობა</Label><Input type="number" value={transferForm.quantity} onChange={e => setTransferForm(prev => ({ ...prev, quantity: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleTransfer}><ArrowRightLeft className="mr-2 h-4 w-4" />ტრანსფერი</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
