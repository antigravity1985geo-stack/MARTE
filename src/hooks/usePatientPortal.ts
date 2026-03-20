import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

export const usePatientPortal = () => {
  const { tenant_slug } = useParams();

  // 1. Get auth data from localStorage
  const authStr = localStorage.getItem(`portal_auth_${tenant_slug}`);
  const auth = authStr ? JSON.parse(authStr) : null;
  const phone = auth?.phone;

  // 2. Fetch tenant to get ID
  const { data: tenant } = useQuery({
    queryKey: ['portal-tenant', tenant_slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, industry')
        .eq('slug', tenant_slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenant_slug
  });

  // 3. Fetch clinic patient record by phone
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['portal-patient', tenant?.id, phone],
    queryFn: async () => {
      if (!tenant?.id || !phone) return null;
      const { data, error } = await supabase
        .from('clinic_patients')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('phone', phone)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id && !!phone && tenant.industry === 'clinic'
  });

  // 4. Fetch medical records
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['portal-medical-records', patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];
      const { data, error } = await supabase
        .from('clinic_medical_records')
        .select(`*, employees(full_name)`)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!patient?.id
  });

  // 5. Fetch prescriptions
  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['portal-prescriptions', patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];
      const { data, error } = await supabase
        .from('clinic_prescriptions')
        .select(`*, employees(full_name)`)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!patient?.id
  });

  // 6. Fetch consent forms
  const { data: consentForms, isLoading: consentLoading } = useQuery({
    queryKey: ['portal-consent-forms', patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];
      const { data, error } = await supabase
        .from('consent_forms')
        .select(`*, template:consent_form_templates(*)`)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!patient?.id
  });

  return {
    patient,
    records,
    prescriptions,
    consentForms,
    loading: patientLoading || recordsLoading || prescriptionsLoading || consentLoading,
    isClinic: tenant?.industry === 'clinic'
  };
};
