import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  medications: Medication[];
  notes?: string;
  created_at: string;
  employees?: {
    full_name: string;
  };
}

export function usePrescriptions(patientId?: string) {
  const queryClient = useQueryClient();

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['clinic_prescriptions', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('clinic_prescriptions')
        .select('*, employees(full_name)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Prescription[];
    },
    enabled: !!patientId,
  });

  const createPrescription = useMutation({
    mutationFn: async (newPrescription: Omit<Prescription, 'id' | 'created_at' | 'employees'>) => {
      const { data, error } = await supabase
        .from('clinic_prescriptions')
        .insert([newPrescription])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_prescriptions', patientId] });
      toast.success('რეცეპტი წარმატებით შეინახა');
    },
    onError: (error) => {
      console.error('Error creating prescription:', error);
      toast.error('რეცეპტის შენახვა ვერ მოხერხდა');
    },
  });

  return {
    prescriptions,
    isLoading,
    createPrescription,
  };
}
