import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClinicPatient {
  id: string;
  first_name: string;
  last_name: string;
  personal_id: string | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  blood_type: string | null;
  allergies: string | null;
  medical_history: string | null;
  emergency_contact: string | null;
  insurance_provider: string | null;
  insurance_number: string | null;
  insurance_expiry: string | null;
  created_at?: string;
}

export interface ClinicMedicalRecord {
  id: string;
  patient_id: string;
  employee_id: string;
  notes: string;
  photo_urls: string[];
  created_at: string;
}

export function useClinicPatients() {
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading, error } = useQuery({
    queryKey: ['clinic_patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_patients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClinicPatient[];
    },
  });

  const addPatient = useMutation({
    mutationFn: async (newPatient: Omit<ClinicPatient, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('clinic_patients')
        .insert([newPatient])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_patients'] });
    },
  });

  const updatePatient = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClinicPatient> }) => {
      const { data, error } = await supabase
        .from('clinic_patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_patients'] });
    },
  });

  const deletePatient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clinic_patients')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_patients'] });
    },
  });

  // --- Clinic Medical Records (EMR) ---
  const clinicRecordsQuery = (patientId: string) => useQuery({
    queryKey: ['clinic_medical_records', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_medical_records')
        .select(`*, employees(full_name)`)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addClinicRecord = useMutation({
    mutationFn: async (record: Partial<ClinicMedicalRecord>) => {
      const { data: { user } } = await supabase.auth.getUser();
      // Assume tenant_id is handled by database triggers or policies as for other tables
      const { data, error } = await supabase
        .from('clinic_medical_records')
        .insert({ ...record, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['clinic_medical_records', vars.patient_id] });
    },
  });

  const uploadMedicalPhoto = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `records/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('medical_files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('medical_files')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  return { 
    patients, isLoading, error, 
    addPatient, updatePatient, deletePatient,
    clinicRecordsQuery, addClinicRecord, uploadMedicalPhoto
  };
}
