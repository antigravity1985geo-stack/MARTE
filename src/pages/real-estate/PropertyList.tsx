import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Home, MapPin, Building2, Trash2, Globe, Eye, MoreVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const propertyTypes = [
  { id: 'apartment', label: 'ბინა' },
  { id: 'house', label: 'სახლი' },
  { id: 'villa', label: 'აგარაკი' },
  { id: 'private', label: 'კერძო სახლი' },
  { id: 'block', label: 'კორპუსი' },
  { id: 'land', label: 'მიწის ნაკვეთი' },
  { id: 'commercial', label: 'კომერციული' },
];

export default function PropertyList() {
  const { activeTenantId } = useAuthStore();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'apartment',
    price: '',
    address: '',
    city: 'თბილისი',
    district: '',
    area: '',
    rooms: '',
    construction_status: 'old',
    listing_type: 'sale',
    is_public: true,
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ['my-properties', activeTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('re_properties')
        .select('*')
        .eq('tenant_id', activeTenantId);
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId
  });

  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      // Cast numeric strings to actual numbers to avoid Postgres type errors
      const sanitizedData = {
        ...newData,
        price: newData.price === '' ? 0 : Number(newData.price),
        area: newData.area === '' ? 0 : Number(newData.area),
        rooms: newData.rooms === '' ? 0 : parseInt(newData.rooms, 10),
        tenant_id: activeTenantId
      };

      const { error } = await supabase.from('re_properties').insert([
        sanitizedData
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      toast.success('განცხადება წარმატებით დაემატა');
      setIsOpen(false);
      setFormData({
        title: '',
        description: '',
        type: 'apartment',
        price: '',
        address: '',
        city: 'თბილისი',
        district: '',
        area: '',
        rooms: '',
        construction_status: 'old',
        listing_type: 'sale',
        is_public: true,
      });
    },
    onError: (error: any) => {
      toast.error('შეცდომა: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('re_properties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      toast.success('განცხადება წაიშალა');
    }
  });

  return (
    <PageTransition>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              განცხადებები / ბინები
            </h1>
            <p className="text-muted-foreground mt-1">მართეთ თქვენი უძრავი ქონების პორტფოლიო</p>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                <Plus className="h-5 w-5" /> ახალი განცხადება
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>ახალი განცხადების დამატება</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-2 col-span-2">
                  <Label>სათაური</Label>
                  <Input 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="მაგ: სამოთახიანი ბინა საბურთალოზე" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>ტიპი</Label>
                  <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>გარიგების ტიპი</Label>
                  <Select value={formData.listing_type} onValueChange={v => setFormData({...formData, listing_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">იყიდება</SelectItem>
                      <SelectItem value="rent">ქირავდება</SelectItem>
                      <SelectItem value="pawn">გირავდება</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ქალაქი</Label>
                  <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="თბილისი" />
                </div>

                <div className="space-y-2">
                  <Label>რაიონი / უბანი</Label>
                  <Input value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} placeholder="ვაკე" />
                </div>

                <div className="space-y-2">
                  <Label>ფასი ($)</Label>
                  <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="50000" />
                </div>

                <div className="space-y-2">
                  <Label>ფართი (მ²)</Label>
                  <Input type="number" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} placeholder="75" />
                </div>

                <div className="space-y-2">
                  <Label>ოთახების რაოდენობა</Label>
                  <Input type="number" value={formData.rooms} onChange={e => setFormData({...formData, rooms: e.target.value})} placeholder="3" />
                </div>

                <div className="space-y-2">
                  <Label>მშენებლობის სტატუსი</Label>
                  <Select value={formData.construction_status} onValueChange={v => setFormData({...formData, construction_status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="old">აშენებული</SelectItem>
                      <SelectItem value="new">მშენებარე / ახალი</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>მისამართი</Label>
                  <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="ჭავჭავაძის გამზ. 25" />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>აღწერა</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="დამატებითი ინფორმაცია..." 
                  />
                </div>

                <div className="flex items-center justify-between col-span-2 p-4 bg-muted/50 rounded-xl">
                  <div className="space-y-0.5">
                    <Label>საჯარო გამოქვეყნება</Label>
                    <p className="text-xs text-muted-foreground italic">თუ ჩართულია, განცხადება გამოჩნდება MarteHome Marketplace-ზე</p>
                  </div>
                  <Switch 
                    checked={formData.is_public} 
                    onCheckedChange={v => setFormData({...formData, is_public: v})} 
                  />
                </div>
              </div>
              <Button 
                onClick={() => createMutation.mutate(formData)} 
                className="w-full mt-4 h-12 text-lg font-bold"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'ემატება...' : 'გამოქვეყნება'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* List View */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full h-40 flex items-center justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : properties && properties.length > 0 ? (
            properties.map((prop: any) => (
              <div key={prop.id} className="group glass-card border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="aspect-video bg-muted relative">
                  {prop.images?.[0] ? (
                    <img src={prop.images[0]} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground/30">
                      <Home className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-primary/90">{prop.listing_type === 'sale' ? 'იყიდება' : 'ქირავდება'}</Badge>
                    {prop.is_public && (
                      <Badge variant="outline" className="bg-white/80 backdrop-blur-md text-slate-900 border-none gap-1">
                        <Globe className="h-3 w-3" /> საჯარო
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg line-clamp-1">{prop.title}</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {prop.city}, {prop.district}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="font-black text-xl text-primary">
                      ${Number(prop.price).toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => window.open(`/martehome/property/${prop.id}`, '_blank')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => deleteMutation.mutate(prop.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 bg-muted/20 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center opacity-70">
              <Home className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
              <p className="text-xl font-medium text-muted-foreground">ჯერჯერობით განცხადებები არ არის დამატებული.</p>
              <p className="text-sm text-muted-foreground">დაამატეთ თქვენი პირველი განცხადება ზემოთ მოცემული ღილაკით</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
