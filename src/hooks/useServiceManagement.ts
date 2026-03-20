import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

export interface CommissionRule {
  id: string;
  employee_id: string;
  service_id: string;
  percentage: number;
  fixed_amount: number;
}

export interface ServiceConsumable {
  id: string;
  service_id: string;
  product_id: string;
  quantity: number;
}

export interface MedicalRecord {
  id: string;
  client_id: string;
  employee_id: string;
  notes: string;
  treatment_plan?: string;
  photo_urls: string[];
  created_at: string;
}

export interface ClinicTreatment {
  id: string;
  tenant_id?: string;
  patient_id: string;
  doctor_id?: string;
  name: string;
  description?: string;
  cost: number;
  status: 'planned' | 'completed' | 'cancelled';
  tooth_number?: string;
  created_at?: string;
}

export function useServiceManagement() {
  const queryClient = useQueryClient();
  const { log } = useActivityLog();

  // --- Commissions ---
  const commissionRulesQuery = useQuery({
    queryKey: ['staff_commission_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_commission_rules').select('*');
      if (error) throw error;
      return data as CommissionRule[];
    },
  });

  const saveCommissionRule = useMutation({
    mutationFn: async (rule: Partial<CommissionRule>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('staff_commission_rules')
        .upsert({ ...rule, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_commission_rules'] });
      toast.success('საკომისიოს წესი შენახულია');
    },
  });

  // --- Consumables (Materials) ---
  const materialsQuery = (serviceId?: string) => useQuery({
    queryKey: ['service_materials', serviceId],
    enabled: !!serviceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_service_materials')
        .select('*')
        .eq('service_id', serviceId);
      if (error) throw error;
      return data as ServiceConsumable[];
    },
  });

  const saveMaterial = useMutation({
    mutationFn: async (material: Partial<ServiceConsumable>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('salon_service_materials')
        .upsert({ ...material, user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['service_materials', vars.service_id] });
      toast.success('მასალა დაემატა');
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('salon_service_materials')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_materials'] });
      toast.success('მასალა წაიშალა');
    },
  });

  // --- Medical Records (EMR) ---
  const medicalRecordsQuery = (clientId: string) => useQuery({
    queryKey: ['medical_records', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_medical_records')
        .select('*, employees(full_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (MedicalRecord & { employees: { full_name: string } })[];
    },
  });

  const addMedicalRecord = useMutation({
    mutationFn: async (record: Partial<MedicalRecord>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('client_medical_records')
        .insert({ ...record, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['medical_records', vars.client_id] });
      log({ action: 'create', entityType: 'client', entityId: vars.client_id, details: { type: 'medical_record' } });
      toast.success('ჩანაწერი დაემატა');
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

  // --- Clinic Treatments (Treatment Plan Builder) ---
  const treatmentsQuery = (clientId: string) => useQuery({
    queryKey: ['clinic_treatments', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_treatments')
        .select('*')
        .eq('patient_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClinicTreatment[];
    },
  });

  const saveTreatment = useMutation({
    mutationFn: async (treatment: Partial<ClinicTreatment>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('clinic_treatments')
        .upsert({ ...treatment, user_id: user?.id }) // Ensure tenant separation logic triggers or pass user_id if required by RLS
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['clinic_treatments', vars.patient_id] });
      toast.success('პროცედურა შენახულია');
    },
  });

  const deleteTreatment = useMutation({
    mutationFn: async (id: string) => {
      const { data, error: fetchErr } = await supabase.from('clinic_treatments').select('patient_id').eq('id', id).single();
      const { error } = await supabase.from('clinic_treatments').delete().eq('id', id);
      if (error) throw error;
      return data?.patient_id;
    },
    onSuccess: (patient_id) => {
      if(patient_id) {
          queryClient.invalidateQueries({ queryKey: ['clinic_treatments', patient_id] });
      }
      toast.success('პროცედურა წაიშალა');
    },
  });

  const calculateAndSaveCommission = useMutation({
    mutationFn: async ({ appointmentId, specialistId, serviceName }: { appointmentId: string, specialistId: string, serviceName: string }) => {
      // 1. Fetch service details
      const { data: service, error: serviceErr } = await supabase
        .from('salon_services')
        .select('id, price')
        .eq('name', serviceName)
        .single();
      
      if (serviceErr) throw new Error('სერვისის ფასი ვერ მოიძებნა');

      // 2. Fetch specialist commission rules
      const { data: specialist, error: specErr } = await supabase
        .from('salon_specialists')
        .select('commission_type, commission_rate, commission_fixed')
        .eq('id', specialistId)
        .single();
      
      if (specErr) throw new Error('სპეციალისტის საკომისიო ვერ მოიძებნა');

      // 3. Calculate commission amount
      let amount = 0;
      if (specialist.commission_type === 'percentage') {
        amount = (Number(service.price) * (Number(specialist.commission_rate) || 0)) / 100;
      } else if (specialist.commission_type === 'fixed') {
        amount = Number(specialist.commission_fixed) || 0;
      }

      // 4. Save to commissions
      const { data, error } = await supabase
        .from('salon_commissions')
        .insert({
          appointment_id: appointmentId,
          specialist_id: specialistId,
          amount: Math.max(0, amount),
          is_paid: false
        })
        .select()
        .single();

      if (error) throw error;

      // 5. Automatic Material Deduction
      const { data: materials, error: matErr } = await supabase
        .from('salon_service_materials')
        .select('*')
        .eq('service_id', service.id);

      if (!matErr && materials && materials.length > 0) {
        for (const mat of materials) {
          // Fetch current stock
          const { data: product, error: prodErr } = await supabase
            .from('products')
            .select('stock, name')
            .eq('id', mat.product_id)
            .single();

          if (!prodErr && product) {
            const newStock = Math.max(0, (Number(product.stock) || 0) - Number(mat.quantity));
            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', mat.product_id);
            
            // Log activity
            log({ 
              action: 'update', 
              entityType: 'product', 
              entityId: mat.product_id, 
              details: { 
                reason: `Salon service material deduction: ${serviceName}`,
                previous_stock: product.stock,
                new_stock: newStock
              } 
            });
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff_commission_rules'] });
      queryClient.invalidateQueries({ queryKey: ['salon_commissions'] });
    }
  });

  const commissionsQuery = (specialistId?: string) => useQuery({
    queryKey: ['salon_commissions', specialistId],
    queryFn: async () => {
      let query = supabase
        .from('salon_commissions')
        .select('*, salon_appointments(service_name, start_time)')
        .order('created_at', { ascending: false });
      
      if (specialistId) {
        query = query.eq('specialist_id', specialistId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const markCommissionAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('salon_commissions')
        .update({ is_paid: true })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salon_commissions'] });
      toast.success('საკომისიო მონიშნულია გადახდილად');
    },
  });

  return {
    commissionRules: commissionRulesQuery.data || [],
    saveCommissionRule,
    calculateAndSaveCommission,
    commissions: commissionsQuery,
    markCommissionAsPaid,
    materials: materialsQuery,
    saveMaterial,
    deleteMaterial,
    medicalRecords: medicalRecordsQuery,
    addMedicalRecord,
    uploadMedicalPhoto,
    treatmentsQuery,
    saveTreatment,
    deleteTreatment,
  };
}
