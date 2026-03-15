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
  created_at?: string;
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

  return { patients, isLoading, error, addPatient, updatePatient, deletePatient };
}
