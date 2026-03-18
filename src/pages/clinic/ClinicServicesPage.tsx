import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2, Loader2, Stethoscope } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ClinicServicesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['clinic_services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_services')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingService) {
        const { error } = await supabase.from('clinic_services').update(payload).eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { data: tenantData } = await supabase.from('profiles').select('marte_active_tenant').single();
        // Fallback or use active tenant logic
        const { error } = await supabase.from('clinic_services').insert([{ ...payload, tenant_id: (tenantData as any)?.marte_active_tenant }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_services'] });
      toast.success(editingService ? 'სერვისი განახლდა' : 'სერვისი დაემატა');
      setIsModalOpen(false);
      setEditingService(null);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clinic_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_services'] });
      toast.success('სერვისი წაიშალა');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const filteredServices = services.filter((s: any) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">სამედიცინო სერვისები</h1>
            <p className="text-muted-foreground mt-1">მართეთ კლინიკის პროცედურები და ფასები</p>
          </div>
          <Button onClick={() => { setEditingService(null); setIsModalOpen(true); }} className="gap-2 shadow-sm font-semibold">
            <Plus className="h-4 w-4" /> სერვისის დამატება
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="ძიება..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service: any) => (
              <Card key={service.id} className="hover:shadow-md transition-shadow border-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-primary" /> {service.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingService(service); setIsModalOpen(true); }}>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if(confirm('ნამდვილად გსურთ წაშლა?')) deleteMutation.mutate(service.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                    {service.description || 'აღწერა არ არის მითითებული'}
                  </p>
                  <div className="flex justify-between items-center pt-2 border-t text-sm">
                    <div className="text-muted-foreground">ხანგრძლივობა: <span className="font-semibold text-foreground">{service.duration_minutes} წთ</span></div>
                    <div className="text-lg font-bold text-primary">{service.base_price} GEL</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? 'სერვისის რედაქტირება' : 'ახალი სერვისის დამატება'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const payload = {
                name: formData.get('name'),
                description: formData.get('description'),
                base_price: parseFloat(formData.get('base_price') as string),
                duration_minutes: parseInt(formData.get('duration_minutes') as string),
              };
              upsertMutation.mutate(payload);
            }} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">დასახელება</Label>
                <Input id="name" name="name" defaultValue={editingService?.name} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">აღწერა</Label>
                <Textarea id="description" name="description" defaultValue={editingService?.description} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="base_price">ფასი (GEL)</Label>
                  <Input id="base_price" name="base_price" type="number" step="0.01" defaultValue={editingService?.base_price || 0} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="duration_minutes">ხანგრძლივობა (წთ)</Label>
                  <Input id="duration_minutes" name="duration_minutes" type="number" defaultValue={editingService?.duration_minutes || 30} required />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>გაუქმება</Button>
                <Button type="submit" disabled={upsertMutation.isPending}>შენახვა</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
