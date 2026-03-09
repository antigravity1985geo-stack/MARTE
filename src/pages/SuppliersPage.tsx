import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useSuppliers, type SupabaseSupplier } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';
import { toast } from 'sonner';

export default function SuppliersPage() {
  const { suppliers, isLoading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupabaseSupplier | null>(null);
  const [form, setForm] = useState({ name: '', tin: '', contact_person: '', phone: '', email: '', address: '' });

  const openNew = () => { setEditing(null); setForm({ name: '', tin: '', contact_person: '', phone: '', email: '', address: '' }); setDialogOpen(true); };
  const openEdit = (s: SupabaseSupplier) => { setEditing(s); setForm({ name: s.name, tin: s.tin, contact_person: s.contact_person, phone: s.phone, email: s.email, address: s.address }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('სახელი აუცილებელია'); return; }
    try {
      if (editing) {
        await updateSupplier.mutateAsync({ id: editing.id, updates: form });
        toast.success('განახლდა');
      } else {
        await addSupplier.mutateAsync(form);
        toast.success('დაემატა');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSupplier.mutateAsync(id);
      toast.success('წაშლილია');
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
          <h1 className="text-2xl font-bold">მომწოდებლები</h1>
          <div className="flex gap-2">
            <PrintButton title="მომწოდებლების სია" />
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />დამატება</Button>
          </div>
        </div>
        <div id="printable-area" className="stat-card overflow-auto">
          <Table>
            <TableHeader><TableRow><TableHead>სახელი</TableHead><TableHead>საკონტაქტო</TableHead><TableHead>ტელეფონი</TableHead><TableHead>ელ-ფოსტა</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.contact_person}</TableCell><TableCell>{s.phone}</TableCell><TableCell>{s.email}</TableCell>
                  <TableCell><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? 'რედაქტირება' : 'ახალი მომწოდებელი'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>სახელი</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>საიდენტიფიკაციო (TIN)</Label><Input value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} /></div>
            <div className="space-y-1"><Label>საკონტაქტო პირი</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>ტელეფონი</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>ელ-ფოსტა</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>მისამართი</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={addSupplier.isPending || updateSupplier.isPending}>{editing ? 'განახლება' : 'დამატება'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
