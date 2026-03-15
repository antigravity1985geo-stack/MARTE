-- MARTE Clinic Module Tables

-- 1. Patients
CREATE TABLE IF NOT EXISTS public.clinic_patients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    personal_id text,
    phone text,
    email text,
    date_of_birth date,
    blood_type text,
    allergies text,
    medical_history text,
    emergency_contact text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Clinic Doctors (Specialists)
CREATE TABLE IF NOT EXISTS public.clinic_doctors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    first_name text NOT NULL,
    last_name text NOT NULL,
    specialization text,
    phone text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Appointments
CREATE TABLE IF NOT EXISTS public.clinic_appointments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES public.clinic_patients(id) ON DELETE CASCADE,
    doctor_id uuid REFERENCES public.clinic_doctors(id) ON DELETE SET NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'arrived', 'in_consultation', 'completed', 'cancelled', 'no_show')),
    reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Documents / EHR (Electronic Health Records)
CREATE TABLE IF NOT EXISTS public.clinic_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES public.clinic_patients(id) ON DELETE CASCADE,
    doctor_id uuid REFERENCES public.clinic_doctors(id) ON DELETE CASCADE,
    appointment_id uuid REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
    type text DEFAULT 'note' CHECK (type IN ('note', 'prescription', 'lab_result', 'imaging', 'other')),
    title text NOT NULL,
    content text,
    file_url text, -- For uploaded documents in Supabase Storage
    diagnosis_code text, -- ICD-10 code
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Treatments / Interventions
CREATE TABLE IF NOT EXISTS public.clinic_treatments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES public.clinic_patients(id) ON DELETE CASCADE,
    doctor_id uuid REFERENCES public.clinic_doctors(id) ON DELETE SET NULL,
    name text NOT NULL,
    description text,
    cost numeric(10, 2) NOT NULL DEFAULT 0,
    status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    tooth_number text, -- Specific for dentistry
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- RLS Policies (Multi-Tenant Secure)
-- ========================================
ALTER TABLE public.clinic_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_treatments ENABLE ROW LEVEL SECURITY;

-- Patients RLS
CREATE POLICY "crud_multi_tenant_clinic_patients" ON public.clinic_patients
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Doctors RLS
CREATE POLICY "crud_multi_tenant_clinic_doctors" ON public.clinic_doctors
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Appointments RLS
CREATE POLICY "crud_multi_tenant_clinic_appointments" ON public.clinic_appointments
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Documents RLS
CREATE POLICY "crud_multi_tenant_clinic_documents" ON public.clinic_documents
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Treatments RLS
CREATE POLICY "crud_multi_tenant_clinic_treatments" ON public.clinic_treatments
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Enable Realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE clinic_patients;
ALTER PUBLICATION supabase_realtime ADD TABLE clinic_appointments;
