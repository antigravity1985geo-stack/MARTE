import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, User, Phone, Mail, Droplets, AlertTriangle, FileText, CalendarDays, Shield, Pill, ClipboardList, CheckCircle2, Clock, Plus, Printer } from 'lucide-react';
import { TreatmentPlanner } from '@/components/clinic/TreatmentPlanner';
import { DentalChart } from '@/components/clinic/DentalChart';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { useClinicPatients } from '@/hooks/useClinicPatients';
import { useEmployees } from '@/hooks/useEmployees';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Image as ImageIcon, Save, Beaker, LayoutDashboard, History, Columns, Maximize2 } from 'lucide-react';
import { useLabOrders } from '@/hooks/useDentalLab';
import { STATUS_META } from '@/types/dentalLab';
import { PhotoComparisonModal } from '@/components/clinic/PhotoComparisonModal';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { PrescriptionDialog } from '@/components/clinic/PrescriptionDialog';
import { PrescriptionPrintTemplate } from '@/components/clinic/PrescriptionPrintTemplate';
import { AnamnesisDialog } from '@/components/clinic/AnamnesisDialog';
import { useRef } from 'react';

export default function ClinicPatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { clinicRecordsQuery, addClinicRecord, uploadMedicalPhoto } = useClinicPatients();
  const { employees = [] } = useEmployees();
  
  const [activeTab, setActiveTab] = useState('history');
  const [emrForm, setEmrForm] = useState({
    notes: '',
    employee_id: '',
    photo_urls: [] as string[],
    appointment_id: undefined as string | undefined
  });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonInitialPhoto, setComparisonInitialPhoto] = useState<any>(null);
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] = useState(false);
  const [isAnamnesisOpen, setIsAnamnesisOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: treatments = [], isLoading: isTreatmentsLoading } = useQuery({
    queryKey: ['clinic_treatments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_treatments')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: patient, isLoading: isPatientLoading } = useQuery({
    queryKey: ['clinic_patient', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      const { data, error } = await supabase.from('clinic_patients').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: records = [] } = clinicRecordsQuery(id || '');

  const { data: documents, isLoading: isDocsLoading } = useQuery({
    queryKey: ['clinic_documents', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided');
      const { data, error } = await supabase.from('clinic_documents').select('*').eq('patient_id', id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { prescriptions, isLoading: isPrescriptionsLoading, createPrescription } = usePrescriptions(id);

  const updatePatientAnamnesis = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('clinic_patients')
        .update({
          medical_history: JSON.stringify(data),
          allergies: data.allergies
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_patient', id] });
      toast.success('ანამნეზი განახლდა');
    }
  });

  const { data: appointments, isLoading: isAptsLoading } = useQuery({
    queryKey: ['clinic_patient_appointments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_appointments')
        .select(`
          *,
          employees (full_name, specialization),
          clinic_services (name)
        `)
        .eq('patient_id', id)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const queryClient = useQueryClient();
  const quickAddMutation = useMutation({
    mutationFn: async ({ tooth, name }: { tooth: number, name: string }) => {
      const { error } = await supabase.from('clinic_treatments').insert([
        { 
          patient_id: id, 
          tooth_number: tooth.toString(), 
          name, 
          status: 'planned', 
          cost: 0 
        }
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_treatments', id] });
      toast.success('მკურნალობა დაემატა გეგმას');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleQuickAction = (tooth: number, actionName: string) => {
    if (actionName === 'ლაბ. შეკვეთა') {
      navigate(`/app/clinic/lab-orders?patientId=${id}&tooth=${tooth}`);
      return;
    }
    quickAddMutation.mutate({ tooth, name: actionName });
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

  const handleAddEMR = async () => {
    if (!id) return;
    if (!emrForm.notes) { toast.error('ჩანაწერი ცარიელია'); return; }
    
    try {
      await addClinicRecord.mutateAsync({
        patient_id: id,
        notes: emrForm.notes,
        employee_id: emrForm.employee_id || undefined,
        photo_urls: emrForm.photo_urls,
        appointment_id: emrForm.appointment_id
      });
      setEmrForm({ notes: '', employee_id: '', photo_urls: [], appointment_id: undefined });
      toast.success('ჩანაწერი დაემატა');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const linkAppointmentToEHR = (apt: any) => {
    setEmrForm({
      notes: apt.notes || apt.reason || '',
      employee_id: apt.doctor_id || '',
      photo_urls: [],
      appointment_id: apt.id
    });
    setActiveTab('history');
    toast.info('ვიზიტის მონაცემები გადატანილია EHR ფორმაში');
  };

  const handlePrint = (pres?: any) => {
    const dataToPrint = pres || printData;
    if (!dataToPrint) return;
    
    setPrintData(dataToPrint);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (isPatientLoading) {
    return <PageTransition><div className="flex justify-center py-12 text-muted-foreground flex-col items-center gap-2"><Loader2 className="h-8 w-8 animate-spin text-primary" />იტვირთება...</div></PageTransition>;
  }

  if (!patient) {
    return <PageTransition><div className="text-center py-12">პაციენტი არ მოიძებნა</div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/app/clinic/patients')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary">{patient.first_name} {patient.last_name}</h1>
              <p className="text-sm text-muted-foreground mt-1 font-mono">პ/ნ: {patient.personal_id || 'არ არის მითითებული'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button style={{ background: 'var(--gradient-primary)' }}>EHR-ში გადასვლა</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar Info */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> ძირითადი ინფო
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4"/> ტელეფონი</span>
                <span className="font-medium">{patient.phone || '-'}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4"/> ელ-ფოსტა</span>
                <span className="font-medium">{patient.email || '-'}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4"/> დაბ. თარიღი</span>
                <span className="font-medium">{patient.date_of_birth || '-'}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground flex items-center gap-2"><Droplets className="h-4 w-4 text-red-500"/> სისხლის ჯგუფი</span>
                <span className="font-medium text-red-600">{patient.blood_type || '-'}</span>
              </div>
              <div className="flex flex-col gap-1 border-b pb-2">
                <span className="text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500"/> ალერგიები</span>
                <span className="font-medium text-amber-600 bg-amber-50 p-2 rounded-md">{patient.allergies || 'არ ფიქსირდება'}</span>
              </div>
              <div className="flex flex-col gap-1 border-b pb-2">
                <span className="text-muted-foreground flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500"/> დაზღვევა</span>
                <div className="bg-blue-50 p-2 rounded-md">
                  <p className="font-medium text-blue-700">{patient.insurance_provider || 'არ აქვს'}</p>
                  {patient.insurance_number && <p className="text-[10px] text-blue-600/70 font-mono mt-0.5">#{patient.insurance_number}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">საგანგებო კონტაქტი</span>
                <span className="font-medium">{patient.emergency_contact || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Area */}
          <div className="md:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="history">EHR (ისტორია/ფოტოები)</TabsTrigger>
                <TabsTrigger value="appointments">ვიზიტები</TabsTrigger>
                <TabsTrigger value="prescriptions">რეცეპტები</TabsTrigger>
                <TabsTrigger value="documents">ფაილები</TabsTrigger>
                <TabsTrigger value="lab_orders">ლაბ. შეკვეთები</TabsTrigger>
                <TabsTrigger value="treatments">ფინანსები</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Form & General History */}
                  <div className="md:col-span-1 space-y-6">
                    <Card>
                      <CardHeader className="py-4">
                        <CardTitle className="text-base font-semibold flex items-center justify-between">
                          <span>ახალი ჩანაწერი (EHR)</span>
                          {emrForm.appointment_id && (
                            <Badge variant="outline" className="text-[10px] bg-primary/5">ლინკი: ვიზიტი</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>ექიმი / სპეციალისტი</Label>
                          <select 
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                            value={emrForm.employee_id}
                            onChange={(e) => setEmrForm({ ...emrForm, employee_id: e.target.value })}
                          >
                            <option value="">არჩეული არ არის</option>
                            {employees?.map((emp: any) => (
                              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>ჩანაწერი / ობიექტური მონაცემები</Label>
                          <Textarea 
                            placeholder="აღწერეთ ვიზიტის მიზანი, დიაგნოზი..." 
                            className="min-h-[100px]"
                            value={emrForm.notes}
                            onChange={(e) => setEmrForm({ ...emrForm, notes: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
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
                          <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar">
                            {emrForm.photo_urls.map((url, i) => (
                               <div key={i} className="relative w-12 h-12 rounded-md border overflow-hidden flex-shrink-0">
                                 <img src={url} alt="Upload preview" className="object-cover w-full h-full" />
                               </div>
                            ))}
                          </div>
                        </div>
                        <Button className="w-full gap-2" onClick={handleAddEMR} disabled={addClinicRecord.isPending || isUploading}>
                          <Save className="h-4 w-4" /> ბარათში ჩაწერა
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-none shadow-lg">
                      <CardHeader className="py-4 bg-muted/30 border-b border-border/40 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-black flex items-center gap-2">
                           <ClipboardList className="w-4 h-4 text-primary" /> ზოგადი ანამნეზი
                        </CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 rounded-lg text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5"
                          onClick={() => setIsAnamnesisOpen(true)}
                        >
                          რედაქტირება
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/40">
                          {(() => {
                            try {
                              const history = JSON.parse(patient.medical_history || '{}');
                              if (typeof history !== 'object' || history === null) throw new Error();
                              
                              return (
                                <div className="grid grid-cols-1 gap-0">
                                  {Object.entries({
                                    'ქრონიკული': history.chronic_diseases,
                                    'ალერგია': history.allergies,
                                    'ოპერაციები': history.previous_surgeries,
                                    'მედიკამენტები': history.ongoing_medications,
                                    'ცხოვრების წესი': history.lifestyle,
                                  }).map(([label, value]: [string, any]) => value && (
                                    <div key={label} className="p-4 hover:bg-muted/10 transition-colors">
                                      <p className="text-[10px] font-black uppercase opacity-40 mb-1 tracking-widest">{label}</p>
                                      <p className="text-sm font-medium leading-relaxed">{value}</p>
                                    </div>
                                  ))}
                                  {!patient.medical_history && <div className="p-10 text-center text-muted-foreground text-xs italic">მონაცემები არ არის</div>}
                                </div>
                              );
                            } catch (e) {
                              return (
                                <div className="p-6 bg-muted/5 text-sm whitespace-pre-wrap leading-relaxed font-medium italic opacity-70">
                                  {patient.medical_history || 'მონაცემები არ არის'}
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Timeline */}
                  <div className="md:col-span-2">
                    <Card className="h-full">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">ვიზიტების ისტორია & ფოტოები</CardTitle>
                        {records.some((r: any) => r.photo_urls?.length > 0) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary transition-all font-bold uppercase tracking-tighter"
                            onClick={() => {
                              const allPhotos = records.flatMap((r: any) => 
                                (r.photo_urls || []).map((url: string) => ({
                                  url,
                                  date: r.created_at,
                                  doctor: r.employees?.full_name,
                                  notes: r.notes
                                }))
                              );
                              setComparisonInitialPhoto(allPhotos[0]);
                              setIsComparisonOpen(true);
                            }}
                          >
                            <Columns className="w-3.5 h-3.5" /> შედარება
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {records.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                              ჩანაწერები ჯერ არ არის
                            </div>
                          ) : (
                            records.map((record: any) => (
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
                                      {record.appointment_id && (
                                        <Badge variant="outline" className="mt-1 ml-2 text-[10px] opacity-70">
                                          მიბმულია ვიზიტზე
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                      {record.notes}
                                    </p>
                                    
                                    {record.photo_urls && record.photo_urls.length > 0 && (
                                      <div className="mt-4 pt-4 border-t border-border/50">
                                        <div className="flex items-center justify-between mb-3">
                                          <span className="font-semibold block text-xs text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                                            <ImageIcon className="w-3.5 h-3.5"/> მიმაგრებული ფოტოები
                                          </span>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-6 text-[10px] font-bold text-primary hover:bg-primary/5 uppercase tracking-wider"
                                            onClick={() => {
                                              const allPhotos = records.flatMap((r: any) => 
                                                (r.photo_urls || []).map((url: string) => ({
                                                  url,
                                                  date: r.created_at,
                                                  doctor: r.employees?.full_name,
                                                  notes: r.notes
                                                }))
                                              );
                                              setComparisonInitialPhoto({
                                                url: record.photo_urls[0],
                                                date: record.created_at,
                                                doctor: record.employees?.full_name,
                                                notes: record.notes
                                              });
                                              setIsComparisonOpen(true);
                                            }}
                                          >
                                            შედარებაში ჩასმა
                                          </Button>
                                        </div>
                                        <div className="flex gap-3 overflow-x-auto pb-2">
                                          {record.photo_urls.map((url: string, i: number) => (
                                            <a key={i} href={url} target="_blank" rel="noreferrer" className="shrink-0 group relative rounded-xl overflow-hidden border-2 border-transparent hover:border-primary/50 transition-all shadow-sm block">
                                              <img src={url} alt="Medical Record" className="h-32 w-32 object-cover" />
                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-sm">
                                                <Maximize2 className="h-6 w-6" />
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
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="treatments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-heading">მკურნალობის ეტაპები და ფინანსები</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <DentalChart 
                      treatments={treatments} 
                      onToothClick={(num) => {
                        setSelectedTooth(num);
                        toast.info(`არჩეულია კბილი #${num}`);
                      }} 
                      onQuickAction={handleQuickAction}
                    />
                    <div className="border-t pt-8">
                      <TreatmentPlanner patientId={patient.id} initialTooth={selectedTooth?.toString()} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ატვირთული ფაილები</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isDocsLoading ? (
                       <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    ) : documents && documents.length > 0 ? (
                      <div className="space-y-3">
                        {documents.map((doc: any) => (
                           <div key={doc.id} className="p-3 border rounded-lg flex items-start gap-4 hover:border-primary/50 transition-colors">
                             <div className="bg-primary/10 p-2 rounded-md text-primary">
                               <FileText className="h-5 w-5" />
                             </div>
                             <div className="flex-1">
                                <p className="font-semibold text-sm">{doc.title}</p>
                                <p className="text-xs text-muted-foreground">{doc.type.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString('ka-GE')}</p>
                             </div>
                             <Button variant="ghost" size="sm">ნახვა</Button>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        ფაილები არ მოიძებნა
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prescriptions" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">რეცეპტების ისტორია</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary transition-all font-bold uppercase tracking-tighter"
                      onClick={() => setIsPrescriptionDialogOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5"/> ახალი რეცეპტი
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isPrescriptionsLoading ? (
                       <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    ) : prescriptions && prescriptions.length > 0 ? (
                      <div className="space-y-4">
                        {prescriptions.map((pres: any) => (
                          <div key={pres.id} className="group p-6 border rounded-[1.5rem] bg-muted/20 hover:bg-muted/30 transition-all border-transparent hover:border-primary/10">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-2xl">
                                  <Pill className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-black text-sm uppercase tracking-wider">რეცეპტი #{pres.id.slice(0, 8)}</p>
                                  <p className="text-[11px] text-muted-foreground font-medium">
                                    {format(new Date(pres.created_at), 'dd MMM yyyy HH:mm', { locale: ka })} • ექიმი: {pres.employees?.full_name}
                                  </p>
                                </div>
                              </div>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-8 rounded-xl gap-2 font-bold px-4"
                                onClick={() => handlePrint(pres)}
                              >
                                <Printer className="w-3.5 h-3.5" /> ბეჭდვა
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {pres.medications.map((m: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-1 bg-background p-4 rounded-2xl border border-border/50 shadow-sm">
                                  <span className="font-black text-xs text-primary uppercase tracking-tight">{m.name}</span>
                                  <span className="text-[11px] text-muted-foreground font-bold">
                                    {m.dosage} • {m.frequency} • {m.duration}
                                  </span>
                                  {m.instructions && (
                                    <p className="text-[10px] italic opacity-70 mt-1 line-clamp-1">{m.instructions}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                            {pres.notes && (
                              <div className="mt-4 text-[11px] text-muted-foreground bg-primary/5 p-3 rounded-xl border-l-4 border-primary/20 italic">
                                <strong>შენიშვნა:</strong> {pres.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 text-muted-foreground border-4 border-dashed rounded-[2rem] opacity-50">
                         <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-muted rounded-full">
                               <Pill className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="font-bold uppercase tracking-widest text-xs">რეცეპტები არ მოიძებნა</p>
                         </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="lab_orders" className="mt-4">
                <PatientLabOrders patientId={id!} />
              </TabsContent>

              <TabsContent value="appointments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ვიზიტების ისტორია</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isAptsLoading ? (
                       <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    ) : appointments && appointments.length > 0 ? (
                      <div className="space-y-3">
                        {appointments.map((apt: any) => (
                          <div key={apt.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className={`p-2 rounded-full ${
                              apt.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                              apt.status === 'scheduled' ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'
                            }`}>
                              {apt.status === 'completed' ? <CheckCircle2 className="h-4 w-4"/> : <Clock className="h-4 w-4"/>}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold">{apt.clinic_services?.name || 'კონსულტაცია'}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {format(new Date(apt.start_time), 'PPp', { locale: ka })} • ექიმი: {apt.employees?.full_name}
                              </p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <p className="text-sm font-bold text-primary">{apt.total_price} GEL</p>
                              <div className="flex items-center gap-2">
                                {apt.status === 'completed' && !records.some(r => r.appointment_id === apt.id) && (
                                  <Button 
                                    size="sm" 
                                    variant="default" 
                                    className="gap-1.5 h-7 px-2 text-[10px] rounded-md font-medium bg-primary text-white hover:brightness-110 shadow-sm shadow-primary/20"
                                    onClick={() => linkAppointmentToEHR(apt)}
                                  >
                                    <ClipboardList className="h-3 w-3" /> EHR-ში დამატება
                                  </Button>
                                )}
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase">{apt.status}</Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                        ისტორია ჯერ ცარიელია
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <PhotoComparisonModal 
          isOpen={isComparisonOpen}
          onClose={() => setIsComparisonOpen(false)}
          initialPhoto={comparisonInitialPhoto}
          availablePhotos={records.flatMap((r: any) => 
            (r.photo_urls || []).map((url: string) => ({
              url,
              date: r.created_at,
              doctor: r.employees?.full_name,
              notes: r.notes
            }))
          )}
        />

        <PrescriptionDialog 
          isOpen={isPrescriptionDialogOpen}
          onClose={() => setIsPrescriptionDialogOpen(false)}
          onSave={(medications, notes) => {
            createPrescription.mutate({
              patient_id: id!,
              doctor_id: (window as any).currentUser?.id || '00000000-0000-0000-0000-000000000000',
              medications,
              notes
            }, {
              onSuccess: (data) => {
                setPrintData({
                  medications,
                  notes,
                  date: new Date().toISOString(),
                  patientName: `${patient.first_name} ${patient.last_name}`,
                  patientDob: patient.date_of_birth,
                  doctorName: (window as any).currentUser?.full_name || 'ექიმი',
                  clinicName: 'MARTE CLINIC'
                });
                // Small delay to ensure state update before print logic (if needed)
              }
            });
          }}
        />

        <div className="hidden">
           <PrescriptionPrintTemplate 
             ref={printRef}
             clinicName={printData?.clinicName || 'MARTE CLINIC'}
             doctorName={printData?.doctorName || printData?.employees?.full_name}
             patientName={printData?.patientName || `${patient.first_name} ${patient.last_name}`}
             patientDob={printData?.patientDob || patient.date_of_birth}
             medications={printData?.medications || []}
             notes={printData?.notes}
             date={printData?.date || printData?.created_at || new Date().toISOString()}
           />
        </div>

        <AnamnesisDialog 
          isOpen={isAnamnesisOpen}
          onClose={() => setIsAnamnesisOpen(false)}
          onSave={(data) => updatePatientAnamnesis.mutate(data)}
          initialData={(() => {
            try {
              return JSON.parse(patient.medical_history || '{}');
            } catch {
              return { chronic_diseases: patient.medical_history || '' };
            }
          })()}
        />
      </div>
    </PageTransition>
  );
}

function PatientLabOrders({ patientId }: { patientId: string }) {
  const { orders, loading } = useLabOrders({ patientId });
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">ლაბორატორიული შეკვეთები</CardTitle>
        <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={() => navigate('/app/clinic/lab-orders')}
        >
            <Plus className="h-3.5 w-3.5"/> ახალი შეკვეთა
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((o: any) => {
              const meta = STATUS_META[o.status as keyof typeof STATUS_META];
              return (
                <div key={o.id} className="p-4 border rounded-xl flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate('/app/clinic/lab-orders')}>
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Beaker className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{o.work_type_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{o.lab?.name || 'ლაბორატორია'}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <Badge className={meta?.color + ' ' + meta?.text + ' border-none text-[10px] uppercase'}>
                      {meta?.label}
                    </Badge>
                    <p className="text-xs font-mono text-muted-foreground">ვადა: {o.due_date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            ლაბორატორიული შეკვეთები ვერ მოიძებნა
          </div>
        )}
      </CardContent>
    </Card>
  );
}
