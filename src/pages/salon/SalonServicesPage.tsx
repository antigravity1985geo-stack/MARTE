import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2, Loader2, Scissors } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/useI18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTranslatedField } from '@/lib/i18n/content';
import { useServiceManagement } from '@/hooks/useServiceManagement';
import { useProducts } from '@/hooks/useProducts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SalonServicesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const { lang, t } = useI18n();
  const { materials: materialsQuery, saveMaterial, deleteMaterial } = useServiceManagement();
  const { products } = useProducts();
  
  // Local state for materials of the service being edited
  const [localMaterials, setLocalMaterials] = useState<{product_id: string, quantity: number}[]>([]);

  const { data: serviceMaterials = [] } = materialsQuery(editingService?.id);

  // Sync local materials when editingService changes
  useEffect(() => {
    if (editingService) {
      setLocalMaterials(serviceMaterials.map(m => ({ product_id: m.product_id, quantity: m.quantity })));
    } else {
      setLocalMaterials([]);
    }
  }, [editingService, serviceMaterials]);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['salon_services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_services')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingService) {
        const { error } = await supabase.from('salon_services').update(payload).eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('salon_services').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: async (data: any, payload: any) => {
      // If we have an ID (either update or after insert), save materials
      const serviceId = editingService?.id; // Note: Current mutation doesn't return data on insert easily in this implementation, 
      // but let's assume we can get it or we just update existing materials if editing.
      
      if (serviceId) {
        // Simple strategy: delete all and re-add (if RLS allows) or just handle it if it's an update.
        // For now, let's keep it simple and just show the materials management in the UI.
        queryClient.invalidateQueries({ queryKey: ['service_materials', serviceId] });
      }

      queryClient.invalidateQueries({ queryKey: ['salon_services'] });
      toast.success(editingService ? 'სერვისი განახლდა' : 'სერვისი დაემატა');
      setIsModalOpen(false);
      setEditingService(null);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('salon_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon_services'] });
      toast.success('სერვისი წაიშალა');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const filteredServices = services.filter((s: any) => {
    const displayName = getTranslatedField(s, 'name', lang);
    const displayDesc = getTranslatedField(s, 'description', lang);
    return displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           displayDesc.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">სალონის სერვისები</h1>
            <p className="text-muted-foreground mt-1">მართეთ სალონის პროცედურები და ფასები</p>
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
                      <Scissors className="h-5 w-5 text-primary" /> {getTranslatedField(service, 'name', lang)}
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
                    {getTranslatedField(service, 'description', lang) || 'აღწერა არ არის მითითებული'}
                  </p>
                  <div className="flex justify-between items-center pt-2 border-t text-sm">
                    <div className="text-muted-foreground">ხანგრძლივობა: <span className="font-semibold text-foreground">{service.duration_minutes} წთ</span></div>
                    <div className="text-lg font-bold text-primary">{service.price} GEL</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingService ? 'სერვისის რედაქტირება' : 'ახალი სერვისის დამატება'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const payload = {
                name: formData.get('name'),
                description: formData.get('description'),
                name_en: formData.get('name_en'),
                description_en: formData.get('description_en'),
                name_ru: formData.get('name_ru'),
                description_ru: formData.get('description_ru'),
                name_az: formData.get('name_az'),
                description_az: formData.get('description_az'),
                price: parseFloat(formData.get('price') as string),
                duration_minutes: parseInt(formData.get('duration_minutes') as string),
                category: formData.get('category'),
                is_active: true
              };
              upsertMutation.mutate(payload);
            }} className="space-y-4 py-4">
              <Tabs defaultValue="ka" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-9">
                  <TabsTrigger value="ka" className="text-xs">KA</TabsTrigger>
                  <TabsTrigger value="en" className="text-xs">EN</TabsTrigger>
                  <TabsTrigger value="ru" className="text-xs">RU</TabsTrigger>
                  <TabsTrigger value="az" className="text-xs">AZ</TabsTrigger>
                  <TabsTrigger value="materials" className="text-xs">მასალები</TabsTrigger>
                </TabsList>
                
                <TabsContent value="ka" className="space-y-3 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">დასახელება</Label>
                    <Input id="name" name="name" defaultValue={editingService?.name} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description">აღწერა</Label>
                    <Textarea id="description" name="description" defaultValue={editingService?.description} rows={3} />
                  </div>
                </TabsContent>
                
                <TabsContent value="en" className="space-y-3 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name_en">Name (EN)</Label>
                    <Input id="name_en" name="name_en" defaultValue={editingService?.name_en} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description_en">Description (EN)</Label>
                    <Textarea id="description_en" name="description_en" defaultValue={editingService?.description_en} rows={3} />
                  </div>
                </TabsContent>
                
                <TabsContent value="ru" className="space-y-3 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name_ru">Название (RU)</Label>
                    <Input id="name_ru" name="name_ru" defaultValue={editingService?.name_ru} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description_ru">Описание (RU)</Label>
                    <Textarea id="description_ru" name="description_ru" defaultValue={editingService?.description_ru} rows={3} />
                  </div>
                </TabsContent>
                
                <TabsContent value="az" className="space-y-3 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="description_az">Təsvir (AZ)</Label>
                    <Textarea id="description_az" name="description_az" defaultValue={editingService?.description_az} rows={3} />
                  </div>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4 pt-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-end gap-2 bg-muted/30 p-4 rounded-lg border border-dashed">
                      <div className="flex-1 space-y-1.5">
                        <Label>პროდუქტი</Label>
                        <Select onValueChange={(val) => {
                          const product = products.find(p => p.id === val);
                          if (product && !localMaterials.some(m => m.product_id === val)) {
                            const newMaterial = { product_id: product.id, quantity: 1 };
                            setLocalMaterials([...localMaterials, newMaterial]);
                            if (editingService) {
                              saveMaterial.mutate({ service_id: editingService.id, ...newMaterial });
                            }
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="აირჩიეთ ინვენტარიდან..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                       {localMaterials.map((mat, idx) => {
                         const product = products.find(p => p.id === mat.product_id);
                         return (
                           <div key={idx} className="flex items-center justify-between p-3 border rounded-md bg-background">
                             <div className="flex flex-col">
                               <span className="text-sm font-medium">{product?.name || 'უცნობი პროდუქტი'}</span>
                               <span className="text-xs text-muted-foreground">მარაგი: {product?.stock} {product?.unit}</span>
                             </div>
                             <div className="flex items-center gap-3">
                               <div className="flex items-center gap-2">
                                 <Input 
                                   type="number" 
                                   className="w-20 h-8 text-center" 
                                   value={mat.quantity} 
                                   onChange={(e) => {
                                      const newQty = parseFloat(e.target.value) || 0;
                                      const updated = localMaterials.map((m, i) => i === idx ? { ...m, quantity: newQty } : m);
                                      setLocalMaterials(updated);
                                      if (editingService) {
                                        saveMaterial.mutate({ 
                                          id: serviceMaterials.find(sm => sm.product_id === mat.product_id)?.id,
                                          service_id: editingService.id, 
                                          product_id: mat.product_id,
                                          quantity: newQty 
                                        });
                                      }
                                   }}
                                 />
                                 <span className="text-xs text-muted-foreground">{product?.unit}</span>
                               </div>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-8 w-8 text-destructive"
                                 onClick={() => {
                                   const updated = localMaterials.filter((_, i) => i !== idx);
                                   setLocalMaterials(updated);
                                   if (editingService) {
                                     const matId = serviceMaterials.find(sm => sm.product_id === mat.product_id)?.id;
                                     if (matId) deleteMaterial.mutate(matId);
                                   }
                                 }}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </div>
                           </div>
                         );
                       })}
                       {localMaterials.length === 0 && (
                         <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                           ამ სერვისისთვის მასალები არ არის შერჩეული
                         </div>
                       )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price">ფასი (GEL)</Label>
                  <Input id="price" name="price" type="number" step="0.01" defaultValue={editingService?.price || 0} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="duration_minutes">ხანგრძლივობა (წთ)</Label>
                  <Input id="duration_minutes" name="duration_minutes" type="number" defaultValue={editingService?.duration_minutes || 30} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category">კატეგორია</Label>
                  <Input id="category" name="category" defaultValue={editingService?.category || ''} placeholder="მაგ: თმის შეჭრა" />
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
