import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';

export interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  position: string;
  pin_code: string;
  phone: string;
  email: string;
  salary: number;
  is_active: boolean;
  is_doctor: boolean;
  specialization?: string;
  hire_date?: string;
  termination_date?: string;
  address?: string;
  emergency_contact?: string;
  iban?: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  status: 'present' | 'absent' | 'late' | 'on_leave';
  notes?: string;
}

export interface SalarySlip {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  bonus: number;
  deductions: number;
  income_tax: number;
  pension_contribution: number;
  gross_salary: number;
  net_salary: number;
  status: 'draft' | 'paid' | 'cancelled';
  paid_at?: string;
  journal_entry_id?: string;
}

export function useEmployees() {
  const queryClient = useQueryClient();
  const { log } = useActivityLog();

  // ---- Employees ----
  const query = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data || []) as Employee[];
    },
  });

  const addEmployee = useMutation({
    mutationFn: async (emp: Omit<Employee, 'id' | 'user_id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { data, error } = await supabase
        .from('employees')
        .insert({ ...emp, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Employee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      log({ action: 'create', entityType: 'employee', entityId: data?.id, entityName: data?.full_name });
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Employee> }) => {
      const { error } = await supabase.from('employees').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      log({ action: 'update', entityType: 'employee', entityId: vars.id });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      log({ action: 'delete', entityType: 'employee', entityId: id });
    },
  });

  // ---- Attendance ----
  const attendanceQuery = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_attendance')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []) as Attendance[];
    },
  });

  const logAttendance = useMutation({
    mutationFn: async (att: Omit<Attendance, 'id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('employee_attendance')
        .insert({ ...att, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  // ---- Salary Slips ----
  const salaryQuery = useQuery({
    queryKey: ['salary_slips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_slips')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      return (data || []) as SalarySlip[];
    },
  });

  const createSalarySlip = useMutation({
    mutationFn: async (slip: Omit<SalarySlip, 'id' | 'net_salary' | 'income_tax' | 'pension_contribution' | 'gross_salary'>) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate Georgian Taxes
      const grossSalary = slip.base_salary + slip.bonus;
      const pensionContribution = Math.round(grossSalary * 0.02 * 100) / 100;
      const taxableAmount = grossSalary - pensionContribution;
      const incomeTax = Math.round(taxableAmount * 0.20 * 100) / 100;

      // Net salary is logically (grossSalary - pensionContribution - incomeTax - other deductions)
      // The DB has a generated column (base_salary + bonus - deductions)
      // So 'deductions' in DB should store (manual_deductions + pension + income_tax)
      const totalDeductions = slip.deductions + pensionContribution + incomeTax;

      const { data, error } = await supabase
        .from('salary_slips')
        .insert({
          ...slip,
          user_id: user?.id,
          gross_salary: grossSalary,
          pension_contribution: pensionContribution,
          income_tax: incomeTax,
          deductions: totalDeductions
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary_slips'] });
    },
  });

  const paySalary = useMutation({
    mutationFn: async (slipId: string) => {
      // 1. Get slip data
      const { data: slip, error: fetchErr } = await supabase
        .from('salary_slips')
        .select('*, employees(full_name)')
        .eq('id', slipId)
        .single();
      if (fetchErr) throw fetchErr;

      // 2. Mark as paid
      const { error: updateErr } = await supabase
        .from('salary_slips')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', slipId);
      if (updateErr) throw updateErr;

      return slip;
    },
    onSuccess: (slip) => {
      queryClient.invalidateQueries({ queryKey: ['salary_slips'] });
      log({ action: 'update', entityType: 'salary', entityId: slip.id, details: { status: 'paid' } });
    },
  });

  const authenticateByPin = async (pin: string): Promise<Employee | null> => {
    const employees = query.data || [];
    return employees.find((e) => e.pin_code === pin && e.is_active) || null;
  };

  return {
    employees: query.data || [],
    isLoading: query.isLoading || attendanceQuery.isLoading || salaryQuery.isLoading,
    attendance: attendanceQuery.data || [],
    salarySlips: salaryQuery.data || [],
    addEmployee,
    updateEmployee,
    deleteEmployee,
    logAttendance,
    createSalarySlip,
    paySalary,
    authenticateByPin,
  };
}
