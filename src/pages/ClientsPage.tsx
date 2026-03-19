import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useClients, type SupabaseClient } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Phone, Mail, Loader2, Stethoscope, History, User, Save, Clock, Image as ImageIcon, Upload, CheckCircle2, Circle, Activity } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { useServiceManagement } from '@/hooks/useServiceManagement';
import { format } from 'date-fns';
import { useEmployees } from '@/hooks/useEmployees';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function ClientsPage() {
  const { clients, isLoading, addClient, updateClient, deleteClient } = useClients();
  const { medicalRecords, addMedicalRecord, uploadMedicalPhoto, treatmentsQuery, saveTreatment, deleteTreatment } = useServiceManagement();
  const { employees } = useEmployees();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emrDialogOpen, setEmrDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SupabaseClient | null>(null);
  const [editing, setEditing] = useState<SupabaseClient | null>(null);
  const [activeEmrTab, setActiveEmrTab] = useState('records');
  const [isUploading, setIsUploading] = useState(false);
  
  const [form, setForm] = useState({ 
    name: '', tin: '', phone: '', email: '', address: '', referral_code: '', referred_by_code: '' 
  });
  
  const [emrForm, setEmrForm] = useState({
    notes: '',
    treatment_plan: '',
    employee_id: '',
    photo_urls: [] as string[]
  });

  const [treatmentForm, setTreatmentForm] = useState({ 
    name: '', tooth_number: '', cost: 0, status: 'planned' as 'planned' | 'completed' | 'cancelled' 
  });

  const isMobile = useIsMobile();

  const openNew = () => { 
    setEditing(null); 
    setForm({ name: '', tin: '', phone: '', email: '', address: '', referral_code: '', referred_by_code: '' }); 
    setDialogOpen(true); 
  };

  const openEdit = (c: any) => { 
    setEditing(c); 
    setForm({ 
      name: c.name, tin: c.tin, phone: c.phone, email: c.email, 
      address: c.address, referral_code: c.referral_code || '', referred_by_code: '' 
    }); 
    setDialogOpen(true); 
  };

  const openEMR = (c: SupabaseClient) => {
    setSelectedClient(c);
    setEmrForm({ notes: '', treatment_plan: '', employee_id: '', photo_urls: [] });
    setTreatmentForm({ name: '', tooth_number: '', cost: 0, status: 'planned' });
    setActiveEmrTab('records');
    setEmrDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('სახელი აუცილებელია'); return; }
    try {
      if (editing) {
        await updateClient.mutateAsync({ id: editing.id, updates: { 
          name: form.name, tin: form.tin, phone: form.phone, email: form.email, address: form.address 
        }});
        toast.success('განახლდა');
      } else {
        let referredById = null;
        if (form.referred_by_code) {
          const { data } = await supabase
            .from('clients')
            .select('id')
            .eq('referral_code', form.referred_by_code)
            .maybeSingle();
          referredById = data?.id;
        }

        await addClient.mutateAsync({
          ...form,
          referred_by: referredById
        });
        toast.success('დაემატა');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddEMR = async () => {
    if (!selectedClient) return;
    if (!emrForm.notes) { toast.error('ჩანაწერი ცარიელია'); return; }
    
    try {
      await addMedicalRecord.mutateAsync({
        client_id: selectedClient.id,
        notes: emrForm.notes,
        treatment_plan: emrForm.treatment_plan,
        employee_id: emrForm.employee_id || undefined,
        photo_urls: emrForm.photo_urls
      });
      setEmrForm({ notes: '', treatment_plan: '', employee_id: '', photo_urls: [] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadMedicalPhoto(files[i]);
        urls.push(url);
      }
      setEmrForm(prev => ({ ...prev, photo_urls: [...prev.photo_urls, ...urls] }));
      toast.success('ფოტო აიტვირთა');
    } catch (err: any) {
      toast.error('ფოტოს ატვირთვა ვერ მოხერხდა: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTreatment = async () => {
    if (!selectedClient) return;
    if (!treatmentForm.name) { toast.error('პროცედურის სახელი სავალდებულოა'); return; }
    try {
      await saveTreatment.mutateAsync({
        patient_id: selectedClient.id,
        name: treatmentForm.name,
        tooth_number: treatmentForm.tooth_number,
        cost: treatmentForm.cost,
        status: treatmentForm.status
      });
      setTreatmentForm({ name: '', tooth_number: '', cost: 0, status: 'planned' });
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
    return (
      <PageTransition>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageTransition>
    );
  }

  const currentRecords = selectedClient ? medicalRecords(selectedClient.id).data || [] : [];
  const currentTreatments = selectedClient ? treatmentsQuery(selectedClient.id).data || [] : [];

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
                  <div className="stat-card p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0" onClick={() => openEdit(c)}>
                        <p className="font-medium">{c.name}</p>
                        {c.tin && <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.tin}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" className="text-primary" onClick={() => openEMR(c)}>
                          <Stethoscope className="h-4 w-4" />
                        </Button>
                        <p className="text-sm font-bold text-primary">₾{(c.total_purchases || 0).toFixed(2)}</p>
                      </div>
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
          <div className="stat-card overflow-auto text-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>სახელი</TableHead>
                  <TableHead>საიდენტიფიკაციო</TableHead>
                  <TableHead>ტელეფონი</TableHead>
                  <TableHead>ელ-ფოსტა</TableHead>
                  <TableHead>ჯამური შესყიდვა</TableHead>
                  <TableHead className="text-right">მოქმედებები</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.tin}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell className="font-semibold">₾{(c.total_purchases || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="text-blue-500 border-blue-200 hover:bg-blue-50" 
                          title="სამედიცინო ბარათი / EMR"
                          onClick={() => openEMR(c)}
                        >
                          <Stethoscope className="h-4 w-4" />
                        </Button>
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

      {/* Client Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'რედაქტირება' : 'ახალი კლიენტი'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>სახელი</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>საიდენტიფიკაციო (TIN)</Label>
              <Input value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ტელეფონი</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>ელ-ფოსტა</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>მისამართი</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-primary flex items-center gap-1">თქვენი რეფერალური კოდი</Label>
                <Input value={form.referral_code} disabled placeholder="ავტომატური" />
              </div>
              <div className="space-y-1">
                <Label>ვინ მოიყვანა? (რეფერალური კოდი)</Label>
                <Input 
                  value={form.referred_by_code} 
                  onChange={(e) => setForm({ ...form, referred_by_code: e.target.value })}
                  placeholder="მაგ: ABC123"
                  className="border-dashed"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={addClient.isPending || updateClient.isPending}>
              {editing ? 'განახლება' : 'დამატება'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EMR / Medical Records Dialog */}
      <Dialog open={emrDialogOpen} onOpenChange={setEmrDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">{selectedClient?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> სამედიცინო ისტორია / პროცედურების ჟურნალი
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/10 border-b px-6 pt-4">
            <Tabs value={activeEmrTab} onValueChange={setActiveEmrTab} className="w-full">
              <TabsList className="mb-0 rounded-b-none border-b-0 h-auto p-0 bg-transparent flex gap-4">
                <TabsTrigger 
                  value="records" 
                  className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-semibold"
                >
                  ისტორია & ფოტოები
                </TabsTrigger>
                <TabsTrigger 
                  value="treatments" 
                  className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-semibold"
                >
                  მკურნალობის გეგმა (Treatments)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1 p-6">
            {activeEmrTab === 'records' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* New Record Form */}
                <div className="md:col-span-1 space-y-4 border-r pr-6">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4" /> ახალი ჩანაწერი
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>ექიმი / სპეციალისტი</Label>
                      <select 
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        value={emrForm.employee_id}
                        onChange={(e) => setEmrForm({ ...emrForm, employee_id: e.target.value })}
                      >
                        <option value="">არჩეული არ არის</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>ჩანაწერი / ობიექტური მონაცემები</Label>
                      <Textarea 
                        placeholder="აღწერეთ ვიზიტის მიზანი..." 
                        className="min-h-[100px]"
                        value={emrForm.notes}
                        onChange={(e) => setEmrForm({ ...emrForm, notes: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>ფოტოების ატვირთვა (Before/After)</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          onChange={handlePhotoUpload} 
                          disabled={isUploading}
                          className="file:border-0 file:bg-transparent file:text-sm file:font-medium"
                        />
                        {isUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                      <div className="flex gap-2 mt-2 py-2 overflow-x-auto hide-scrollbar">
                        {emrForm.photo_urls.map((url, i) => (
                           <div key={i} className="relative w-16 h-16 rounded-md border overflow-hidden flex-shrink-0">
                             <img src={url} alt="Upload preview" className="object-cover w-full h-full" />
                           </div>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full gap-2" onClick={handleAddEMR} disabled={addMedicalRecord.isPending || isUploading}>
                      <Save className="h-4 w-4" /> ბარათში ჩაწერა
                    </Button>
                  </div>
                </div>

                {/* Records Timeline */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="h-4 w-4" /> ისტორია
                  </h3>
                  <div className="space-y-4">
                    {currentRecords.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        ჩანაწერები ჯერ არ არის
                      </div>
                    ) : (
                      currentRecords.map((record) => (
                        <div key={record.id} className="relative pl-6 pb-6 border-l last:pb-0">
                          <div className="absolute left-[-5px] top-1 h-2 w-2 rounded-full bg-primary" />
                          <div className="bg-muted/20 p-4 rounded-xl border">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-xs text-muted-foreground font-medium">
                                  {format(new Date(record.created_at), 'dd.MM.yyyy HH:mm')}
                                </p>
                                {record.employees?.full_name && (
                                  <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary hover:bg-primary/20">
                                    {record.employees.full_name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                <span className="font-semibold block text-xs underline decoration-primary/30 mb-1 tracking-tight uppercase">ჩანაწერი:</span>
                                {record.notes}
                              </p>
                              {record.treatment_plan && (
                                <p className="text-sm bg-background/50 p-2 rounded border-l-2 border-primary/50 text-muted-foreground italic">
                                  <span className="font-semibold block text-xs not-italic mb-1">გეგმა/რეკომენდაცია:</span>
                                  {record.treatment_plan}
                                </p>
                              )}
                              {record.photo_urls && record.photo_urls.length > 0 && (
                                <div className="mt-4 pt-3 border-t">
                                  <span className="font-semibold block text-xs text-muted-foreground mb-2 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> ფოტო მასალა:</span>
                                  <div className="flex gap-3 overflow-x-auto pb-2">
                                    {record.photo_urls.map((url, i) => (
                                      <a key={i} href={url} target="_blank" rel="noreferrer" className="shrink-0 group relative rounded-lg overflow-hidden border">
                                        <img src={url} alt="Medical Record" className="h-32 w-32 object-cover group-hover:scale-110 transition-transform" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                          <ImageIcon className="h-6 w-6" />
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeEmrTab === 'treatments' && (
              <div className="space-y-6">
                <div className="bg-muted/20 rounded-xl p-4 border flex items-end gap-4 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <Label>პროცედურა / მკურნალობა</Label>
                    <Input 
                      placeholder="მაგ: კარიესის დაბჟენა" 
                      value={treatmentForm.name}
                      onChange={(e) => setTreatmentForm({ ...treatmentForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 w-24">
                    <Label>კბილი/ლოკ.</Label>
                    <Input 
                      placeholder="მაგ: 14" 
                      value={treatmentForm.tooth_number}
                      onChange={(e) => setTreatmentForm({ ...treatmentForm, tooth_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 w-28">
                    <Label>ფასი (₾)</Label>
                    <Input 
                      type="number" 
                      value={treatmentForm.cost}
                      onChange={(e) => setTreatmentForm({ ...treatmentForm, cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1 w-32">
                    <Label>სტატუსი</Label>
                    <select 
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={treatmentForm.status}
                      onChange={(e) => setTreatmentForm({ ...treatmentForm, status: e.target.value as any })}
                    >
                      <option value="planned">გეგმაშია</option>
                      <option value="completed">დასრულდა</option>
                      <option value="cancelled">გაუქმდა</option>
                    </select>
                  </div>
                  <Button onClick={handleAddTreatment} disabled={saveTreatment.isPending} className="gap-2">
                    <Plus className="h-4 w-4" /> დაგეგმვა
                  </Button>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead>პროცედურა</TableHead>
                        <TableHead>კბილი/ლოკ.</TableHead>
                        <TableHead>დრო</TableHead>
                        <TableHead>ფასი</TableHead>
                        <TableHead>სტატუსი</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTreatments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            მკურნალობის გეგმა ცარიელია
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentTreatments.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium text-primary">{t.name}</TableCell>
                            <TableCell className="font-mono text-xs">{t.tooth_number || '-'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{t.created_at ? format(new Date(t.created_at), 'dd.MM.yyyy') : '-'}</TableCell>
                            <TableCell className="font-mono font-semibold">₾{t.cost}</TableCell>
                            <TableCell>
                              {t.status === 'completed' && <Badge variant="default" className="bg-success text-success-foreground hover:bg-success">დასრულდა</Badge>}
                              {t.status === 'planned' && <Badge variant="secondary" className="bg-warning/20 text-warning hover:bg-warning/30 border-warning/30">გეგმაშია</Badge>}
                              {t.status === 'cancelled' && <Badge variant="outline" className="text-destructive border-destructive">გაუქმდა</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {t.status === 'planned' && (
                                  <Button size="icon" variant="ghost" className="text-success" onClick={() => saveTreatment.mutateAsync({ ...t, status: 'completed'})}><CheckCircle2 className="h-4 w-4" /></Button>
                                )}
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteTreatment.mutateAsync(t.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </ScrollArea>
          
          <div className="p-4 border-t bg-muted/10 flex justify-end">
            <Button variant="ghost" onClick={() => setEmrDialogOpen(false)}>დახურვა</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
