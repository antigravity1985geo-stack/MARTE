import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useClinicPatients, type ClinicPatient } from '@/hooks/useClinicPatients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Phone, Mail, Loader2, AlertTriangle, FileText, Shield } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';

const emptyForm: Omit<ClinicPatient, 'id' | 'created_at'> = {
  first_name: '',
  last_name: '',
  personal_id: '',
  phone: '',
  email: '',
  date_of_birth: '',
  blood_type: '',
  allergies: '',
  emergency_contact: '',
  medical_history: '',
  insurance_provider: '',
  insurance_number: '',
  insurance_expiry: ''
};

export default function ClinicPatientsPage() {
  const { patients, isLoading, addPatient, updatePatient, deletePatient } = useClinicPatients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicPatient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();
  const { t } = useI18n();

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  
  const openEdit = (p: ClinicPatient) => { 
    setEditing(p); 
    setForm({ 
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      personal_id: p.personal_id || '',
      phone: p.phone || '',
      email: p.email || '',
      date_of_birth: p.date_of_birth || '',
      blood_type: p.blood_type || '',
      allergies: p.allergies || '',
      emergency_contact: p.emergency_contact || '',
      medical_history: p.medical_history || '',
      insurance_provider: p.insurance_provider || '',
      insurance_number: p.insurance_number || '',
      insurance_expiry: p.insurance_expiry || ''
    }); 
    setDialogOpen(true); 
  };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) { 
      toast.error('სახელი და გვარი აუცილებელია'); 
      return; 
    }
    
    try {
      if (editing) {
        await updatePatient.mutateAsync({ id: editing.id, updates: form });
        toast.success('პაციენტის მონაცემები განახლდა');
      } else {
        await addPatient.mutateAsync(form);
        toast.success('პაციენტი წარმატებით დაემატა');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('ნამდვილად გსურთ წაშლა? მონაცემების აღდგენა შეუძლებელია.')) {
      try {
        await deletePatient.mutateAsync(id);
        toast.success('წაშლილია');
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  const filteredPatients = patients.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (p.personal_id && p.personal_id.includes(search)) ||
    (p.phone && p.phone.includes(search))
  );

  if (isLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">{t('nav_patients')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('total')}: {patients.length} {t('nav_patients').toLowerCase()}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input 
              placeholder="ძებნა (სახელი, გვარი, პ/ნ)" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:w-[300px]"
            />
            <Button onClick={openNew} className="shrink-0"><Plus className="mr-2 h-4 w-4" />ახალი პაციენტი</Button>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-2">
            {filteredPatients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">პაციენტები არ მოიძებნა</p>
            ) : (
              filteredPatients.map((p) => (
                <SwipeToDelete key={p.id} onDelete={() => handleDelete(p.id)}>
                  <div className="stat-card p-4 relative" onClick={() => openEdit(p)}>
                    {p.allergies && (
                      <div className="absolute top-3 right-3 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg text-primary">{p.first_name} {p.last_name}</p>
                        {p.personal_id && <p className="text-xs text-muted-foreground font-mono mt-0.5">პ/ნ: {p.personal_id}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-foreground/80">
                      {p.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-muted-foreground" />{p.phone}</span>}
                    </div>
                  </div>
                </SwipeToDelete>
              ))
            )}
          </div>
        ) : (
          <div className="stat-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>სახელი გვარი</TableHead>
                  <TableHead>პირადი ნომერი</TableHead>
                  <TableHead>ტელეფონი</TableHead>
                  <TableHead>დაბ. თარიღი</TableHead>
                  <TableHead>დაზღვევა</TableHead>
                  <TableHead className="text-right">მოქმედება</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((p) => (
                  <TableRow key={p.id} className="hover:bg-primary/5 transition-colors">
                    <TableCell className="font-bold text-primary">{p.first_name} {p.last_name}</TableCell>
                    <TableCell className="font-mono text-sm">{p.personal_id || '-'}</TableCell>
                    <TableCell>{p.phone || '-'}</TableCell>
                    <TableCell>{p.date_of_birth || '-'}</TableCell>
                    <TableCell>
                      {p.insurance_provider ? (
                        <div className="flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-sm font-medium">{p.insurance_provider}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="EHR-ის ნახვა" asChild>
                           <Link to={`/app/clinic/patients/${p.id}`}>
                             <FileText className="h-4 w-4 text-blue-500" />
                           </Link>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPatients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      პაციენტები არ მოიძებნა.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-primary text-xl">{editing ? 'პაციენტის რედაქტირება' : 'ახალი პაციენტის რეგისტრაცია'}</DialogTitle>
            </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-1.5"><Label>სახელი <span className="text-destructive">*</span></Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>გვარი <span className="text-destructive">*</span></Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            
            <div className="space-y-1.5"><Label>პირადი ნომერი</Label><Input value={form.personal_id} onChange={(e) => setForm({ ...form, personal_id: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>დაბადების თარიღი</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
            
            <div className="space-y-1.5"><Label>ტელეფონი</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>ელ-ფოსტა</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            
            <div className="space-y-1.5"><Label>სისხლის ჯგუფი / რეზუსი</Label><Input placeholder="მაგ: II (A) Rh+" value={form.blood_type} onChange={(e) => setForm({ ...form, blood_type: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>საკონტაქტო პირი (საგანგებო)</Label><Input placeholder="სახელი, ტელეფონი" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></div>

            {/* Insurance Section */}
            <div className="space-y-1.5"><Label>დაზღვევის პროვაიდერი</Label><Input placeholder="მაგ: არდი, იმედი L" value={form.insurance_provider} onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>პოლისის ნომერი</Label><Input placeholder="P-XXXXXXX" value={form.insurance_number} onChange={(e) => setForm({ ...form, insurance_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>დაზღვევის ვადა</Label><Input type="date" value={form.insurance_expiry} onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })} /></div>
            
            <div className="space-y-1.5 md:col-span-2">
                <Label className="text-destructive font-semibold flex items-center gap-1"><AlertTriangle className="h-4 w-4"/> ალერგიები</Label>
                <Textarea placeholder="მიუთითეთ თუ პაციენტს აქვს ალერგია მედიკამენტებზე..." value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
                <Label>სამედიცინო ანამნეზი (მოკლედ)</Label>
                <Textarea placeholder="ქრონიკული დაავადებები, ოპერაციები..." value={form.medical_history} onChange={(e) => setForm({ ...form, medical_history: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>გაუქმება</Button>
            <Button onClick={handleSave} disabled={addPatient.isPending || updatePatient.isPending} className="bg-primary">{editing ? 'განახლება' : 'დამატება'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
