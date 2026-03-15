import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function TreatmentPlanner({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [toothNumber, setToothNumber] = useState('');

  const { data: treatments = [], isLoading } = useQuery({
    queryKey: ['clinic_treatments', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_treatments')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        patient_id: patientId,
        name,
        description,
        cost: parseFloat(cost) || 0,
        tooth_number: toothNumber || null,
        status: 'planned'
      };
      const { error } = await supabase.from('clinic_treatments').insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_treatments', patientId] });
      toast.success('პროცედურა დაემატა გეგმას');
      setIsModalOpen(false);
      setName(''); setDescription(''); setCost(''); setToothNumber('');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase.from('clinic_treatments').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_treatments', patientId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clinic_treatments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_treatments', patientId] });
      toast.success('წაიშალა');
    }
  });

  const totalCost = treatments.reduce((sum, t) => sum + Number(t.cost), 0);
  const completedCost = treatments.filter(t => t.status === 'completed').reduce((sum, t) => sum + Number(t.cost), 0);

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary h-6 w-6" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-border/50">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">ფინანსური მიმოხილვა</p>
          <div className="flex items-center gap-6 mt-1">
            <p className="text-2xl font-bold text-primary">₾{completedCost.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">გადახდილი/დასრულებული</span></p>
            <p className="text-xl font-bold text-muted-foreground border-l pl-6">₾{totalCost.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">ჯამური ფასი</span></p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> დაგეგმვა
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>სტატუსი</TableHead>
              <TableHead>პროცედურა / მკურნალობა</TableHead>
              <TableHead>კბილი N</TableHead>
              <TableHead>დეტალები</TableHead>
              <TableHead className="text-right">ღირებულება</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treatments.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">მკურნალობის გეგმა ცარიელია</TableCell></TableRow>
            ) : (
              treatments.map((t: any) => (
                <TableRow key={t.id} className={t.status === 'completed' ? 'opacity-60 bg-muted/20' : ''}>
                  <TableCell>
                    {t.status === 'completed' ? (
                      <span className="flex items-center gap-1.5 text-success font-medium text-xs bg-success/10 px-2.5 py-1 rounded-full w-fit">
                        <CheckCircle2 className="h-3.5 w-3.5" /> დასრულდა
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-primary font-medium text-xs bg-primary/10 px-2.5 py-1 rounded-full w-fit cursor-pointer hover:bg-primary/20 transition-colors"
                            onClick={() => updateStatusMutation.mutate({ id: t.id, status: 'completed' })}>
                        <CircleDashed className="h-3.5 w-3.5" /> დაგეგმილი
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{t.name}</TableCell>
                  <TableCell>
                    {t.tooth_number ? <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{t.tooth_number}</span> : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={t.description}>{t.description || '-'}</TableCell>
                  <TableCell className="text-right font-bold">₾{Number(t.cost).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteMutation.mutate(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ახალი პროცედურის დაგეგმვა</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>პროცედურის დასახელება <span className="text-destructive">*</span></Label>
              <Input placeholder="მაგ: კარიესის მკურნალობა, იმპლანტაცია..." value={name} onChange={e => setName(e.target.value)} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>კბილის ნომერი (არასავალდ.)</Label>
                <Input placeholder="მაგ: 46, 11, 28" value={toothNumber} onChange={e => setToothNumber(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ღირებულება (₾) <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="0.00" value={cost} onChange={e => setCost(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>შენიშვნები</Label>
              <Input placeholder="დამატებითი დეტალები, მასალა..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>გაუქმება</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!name || !cost || addMutation.isPending}>დამატება</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
