import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useClients, type SupabaseClient } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Phone, Mail, Loader2 } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { SwipeToDelete } from '@/components/SwipeToDelete';

export default function ClientsPage() {
  const { clients, isLoading, addClient, updateClient, deleteClient } = useClients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupabaseClient | null>(null);
  const [form, setForm] = useState({ name: '', tin: '', phone: '', email: '', address: '' });
  const isMobile = useIsMobile();

  const openNew = () => { setEditing(null); setForm({ name: '', tin: '', phone: '', email: '', address: '' }); setDialogOpen(true); };
  const openEdit = (c: SupabaseClient) => { setEditing(c); setForm({ name: c.name, tin: c.tin, phone: c.phone, email: c.email, address: c.address }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('სახელი აუცილებელია'); return; }
    try {
      if (editing) {
        await updateClient.mutateAsync({ id: editing.id, updates: form });
        toast.success('განახლდა');
      } else {
        await addClient.mutateAsync(form);
        toast.success('დაემატა');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClient.mutateAsync(id);
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
          <h1 className="text-2xl font-bold">კლიენტები</h1>
          <div className="flex gap-2">
            <PrintButton title="კლიენტების სია" />
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />დამატება</Button>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-2">
            {clients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">კლიენტები არ არის</p>
            ) : (
              clients.map((c) => (
                <SwipeToDelete key={c.id} onDelete={() => handleDelete(c.id)}>
                  <div className="stat-card p-3" onClick={() => openEdit(c)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{c.name}</p>
                        {c.tin && <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.tin}</p>}
                      </div>
                      <p className="text-sm font-bold text-primary">₾{(c.total_purchases || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                    </div>
                  </div>
                </SwipeToDelete>
              ))
            )}
          </div>
        ) : (
          <div className="stat-card overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>სახელი</TableHead><TableHead>საიდენტიფიკაციო</TableHead><TableHead>ტელეფონი</TableHead><TableHead>ელ-ფოსტა</TableHead><TableHead>ჯამური შესყიდვა</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.tin}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell className="font-semibold">₾{(c.total_purchases || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? 'რედაქტირება' : 'ახალი კლიენტი'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1"><Label>სახელი</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>საიდენტიფიკაციო (TIN)</Label><Input value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>ტელეფონი</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>ელ-ფოსტა</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>მისამართი</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={addClient.isPending || updateClient.isPending}>{editing ? 'განახლება' : 'დამატება'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
