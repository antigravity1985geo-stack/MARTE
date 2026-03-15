import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, User, Phone, Mail, Droplets, AlertTriangle, FileText, CalendarDays } from 'lucide-react';
import { TreatmentPlanner } from '@/components/clinic/TreatmentPlanner';

export default function ClinicPatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  if (isPatientLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
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
            <Button variant="outline">ვიზიტის დამატება</Button>
            <Button style={{ background: 'var(--gradient-primary)' }}>ახალი ჩანაწერი (EHR)</Button>
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
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">საგანგებო კონტაქტი</span>
                <span className="font-medium">{patient.emergency_contact || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Area */}
          <div className="md:col-span-2">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="history">ანამნეზი</TabsTrigger>
                <TabsTrigger value="treatments">მკურნალობის გეგმა</TabsTrigger>
                <TabsTrigger value="documents">EHR (დოკ.)</TabsTrigger>
                <TabsTrigger value="appointments">ვიზიტები</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">შემოკლებული სამედიცინო ანამნეზი</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap leading-relaxed text-sm">
                      {patient.medical_history || 'ანამნეზი ცარიელია.'}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="treatments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-heading">მკურნალობის ეტაპები და ფინანსები</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TreatmentPlanner patientId={patient.id} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">სამედიცინო ჩანაწერები და ფორმები</CardTitle>
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
                                {doc.diagnosis_code && <p className="text-xs font-mono bg-muted inline-block px-1.5 rounded mt-1">ICD-10: {doc.diagnosis_code}</p>}
                             </div>
                             <Button variant="ghost" size="sm">ნახვა</Button>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        ჩანაწერები ჯერ არ არის ატვირთული
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appointments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ვიზიტების ისტორია</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        აქ გამოჩნდება კალენდრიდან შემოსული ჯავშნები...
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
