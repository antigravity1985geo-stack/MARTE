import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployees, Employee, Attendance, SalarySlip, Leave, PerformanceReview, StaffWorkingHours } from '@/hooks/useEmployees';
import { useServiceManagement } from '@/hooks/useServiceManagement';
import { useProducts } from '@/hooks/useProducts';
import { Users, Clock, CalendarDays, UserPlus, Search, Loader2, Save, Stethoscope, DollarSign, Star, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/stores/useAuthStore';
import { useI18n } from '@/hooks/useI18n';

export default function EmployeesPage() {
  const { t, lang } = useI18n();
  const { activeTenantId, tenants } = useAuthStore();

  // Common roles available in all industries
  const COMMON_ROLES = [
    { key: 'role_manager', label: t('role_manager') },
    { key: 'role_accountant', label: t('role_accountant') },
    { key: 'role_admin', label: t('role_admin') },
    { key: 'role_cleaner', label: t('role_cleaner') },
    { key: 'role_security', label: t('role_security') },
    { key: 'role_other', label: t('role_other') }
  ];

  // Industry-specific roles
  const ROLES_BY_INDUSTRY: Record<string, { key: string, label: string }[]> = {
    retail: [
      { key: 'role_cashier', label: t('role_cashier') },
      { key: 'role_senior_cashier', label: t('role_senior_cashier') },
      { key: 'role_consultant', label: t('role_consultant') },
      { key: 'role_distributor', label: t('role_distributor') },
      { key: 'role_warehouse_manager', label: t('role_warehouse_manager') },
      { key: 'role_worker', label: t('role_worker') },
      { key: 'role_loader', label: t('role_loader') },
      ...COMMON_ROLES
    ],
    clinic: [
      { key: 'role_doctor', label: t('role_doctor') },
      { key: 'role_nurse', label: t('role_nurse') },
      { key: 'role_sanitary', label: t('role_sanitary') },
      { key: 'role_registrar', label: t('role_registrar') },
      { key: 'role_lab_tech', label: t('role_lab_tech') },
      ...COMMON_ROLES
    ],
    pharmacy: [
      { key: 'role_pharmacist', label: t('role_pharmacist') },
      { key: 'role_consultant', label: t('role_consultant') },
      ...COMMON_ROLES
    ],
    fnb: [
      { key: 'role_waiter', label: t('role_waiter') },
      { key: 'role_cook', label: t('role_cook') },
      { key: 'role_barman', label: t('role_barman') },
      { key: 'role_courier', label: t('role_courier') },
      { key: 'role_coffee_tech', label: t('role_coffee_tech') },
      ...COMMON_ROLES
    ],
    salon: [
      { key: 'role_stylist', label: t('role_stylist') },
      { key: 'role_aestheticist', label: t('role_aestheticist') },
      { key: 'role_makeup_artist', label: t('role_makeup_artist') },
      { key: 'role_manicure_specialist', label: t('role_manicure_specialist') },
      ...COMMON_ROLES
    ],
    auto: [
      { key: 'role_mechanic', label: t('role_mechanic') },
      { key: 'role_electrician', label: t('role_electrician') },
      { key: 'role_diagnostic_tech', label: t('role_diagnostic_tech') },
      { key: 'role_warehouse_manager', label: t('role_warehouse_manager') },
      ...COMMON_ROLES
    ],
    logistics: [
      { key: 'role_driver', label: t('role_driver') },
      { key: 'role_warehouse_manager', label: t('role_warehouse_manager') },
      { key: 'role_loader', label: t('role_loader') },
      { key: 'role_distributor', label: t('role_distributor') },
      ...COMMON_ROLES
    ],
    construction: [
      { key: 'role_worker', label: t('role_worker') },
      { key: 'role_brigadier', label: t('role_brigadier') },
      { key: 'role_warehouse_manager', label: t('role_warehouse_manager') },
      { key: 'role_loader', label: t('role_loader') },
      { key: 'role_driver', label: t('role_driver') },
      ...COMMON_ROLES
    ],
    real_estate: [
      { key: 'role_agent', label: t('role_agent') },
      { key: 'role_broker', label: t('role_broker') },
      { key: 'role_lawyer', label: t('role_lawyer') },
      ...COMMON_ROLES
    ],
    other: [...COMMON_ROLES]
  };

  const currentTenant = tenants.find(t => t.id === activeTenantId);
  const currentIndustry = currentTenant?.industry || 'retail';
  
  const [activeTab, setActiveTab] = useState('employees');
  const [search, setSearch] = useState('');
  const { employees, attendance, salarySlips, leaves, reviews, isLoading, addEmployee, updateEmployee, logAttendance, createSalarySlip, paySalary, requestLeave, updateLeaveStatus, addPerformanceReview, workingHours, saveWorkingHours } = useEmployees();
  const { commissionRules, saveCommissionRule } = useServiceManagement();
  const { products } = useProducts();

  const currentRoles = ROLES_BY_INDUSTRY[currentIndustry] || COMMON_ROLES;
  const isClinic = currentIndustry === 'clinic';

  // Employee Form State
  const [editEmp, setEditEmp] = useState<Partial<Employee> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveEmployee = async () => {
    try {
      if (editEmp?.id) {
        await updateEmployee.mutateAsync({ id: editEmp.id, updates: editEmp });
        toast.success(t('emp_updated') || 'Employee updated');
      } else {
        await addEmployee.mutateAsync(editEmp as any);
        toast.success(t('emp_added') || 'Employee added');
      }
      setIsFormOpen(false);
      setEditEmp(null);
    } catch (e: any) {
      toast.error((t('emp_save_error') || 'Error saving: ') + e.message);
    }
  };

  const handleLogAttendance = async (empId: string, status: Attendance['status']) => {
    try {
      await logAttendance.mutateAsync({
        employee_id: empId,
        date: new Date().toISOString().split('T')[0],
        status,
        clock_in: status === 'present' ? new Date().toISOString() : undefined
      });
      toast.success(t('attendance_logged') || 'Attendance logged');
    } catch (e: any) {
      toast.error((t('error_colon') || 'Error: ') + e.message);
    }
  };

  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState<Partial<Leave>>({ leave_type: 'vacation' });
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState<Partial<PerformanceReview>>({ performance_score: 3 });
  const [slipFormOpen, setSlipFormOpen] = useState(false);
  const [slipForm, setSlipForm] = useState<{ employee_id: string; month: number; year: number; base_salary: number; bonus: number; deductions: number }>({
    employee_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), base_salary: 0, bonus: 0, deductions: 0
  });

  const handleRequestLeave = async () => {
    if (!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date) {
      toast.error(t('field_required') || 'Fill all fields');
      return;
    }
    try {
      await requestLeave.mutateAsync(leaveForm as Omit<Leave, 'id' | 'status'>);
      setLeaveFormOpen(false);
      setLeaveForm({ leave_type: 'vacation' });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddReview = async () => {
    if (!reviewForm.employee_id || !reviewForm.review_date) {
      toast.error(t('field_required') || 'Fill all fields');
      return;
    }
    try {
      await addPerformanceReview.mutateAsync(reviewForm as Omit<PerformanceReview, 'id'>);
      setReviewFormOpen(false);
      setReviewForm({ performance_score: 3 });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateSlip = async () => {
    if (!slipForm.employee_id) { toast.error(t('select_emp') || 'Select employee'); return; }
    try {
      await createSalarySlip.mutateAsync({ ...slipForm, status: 'draft' } as any);
      setSlipFormOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const LEAVE_TYPE_LABELS: Record<string, string> = {
    vacation: t('vacation') || 'Vacation', sick_leave: t('sick_leave') || 'Sick Leave', unpaid: t('unpaid') || 'Unpaid', other: t('emp_other') || 'Other'
  };
  const LEAVE_STATUS_LABELS: Record<string, string> = {
    pending: t('status_pending') || 'Pending', approved: t('status_approved') || 'Approved', rejected: t('status_rejected') || 'Rejected'
  };
  const MONTHS = [t('jan'), t('feb'), t('mar'), t('apr'), t('may'), t('jun'), t('jul'), t('aug'), t('sep'), t('oct'), t('nov'), t('dec')].map(s => s || '');

  const WEEK_DAYS = ['ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი', 'კვირა'];
  const [selectedScheduleEmp, setSelectedScheduleEmp] = useState<string | null>(null);
  const [selectedCommEmp, setSelectedCommEmp] = useState<string | null>(null);


  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {t('hr_management') || 'Employee Management (HR)'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('hr_desc') || 'Personnel tracking and attendance'}</p>
          </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => { setEditEmp({}); setIsFormOpen(true); }}>
                <UserPlus className="h-4 w-4" />
                {t('new_employee') || 'New Employee'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editEmp?.id ? (t('edit_employee') || 'Edit') : (t('new_employee') || 'New Employee')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t('full_name_label') || 'Full Name'}</Label>
                  <Input
                    value={editEmp?.full_name || ''}
                    onChange={e => setEditEmp({ ...editEmp, full_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>{t('position_label') || 'Position'}</Label>
                    <Select 
                      value={currentRoles.some(r => r.key === editEmp?.position || r.label === editEmp?.position) ? (currentRoles.find(r => r.key === editEmp?.position || r.label === editEmp?.position)?.key) : 'role_other'} 
                      onValueChange={val => {
                        const roleObj = currentRoles.find(r => r.key === val);
                        const updates: Partial<Employee> = { position: val === 'role_other' ? '' : (roleObj?.label || val) };
                        // Only set is_doctor if it's a doctor in a clinic setting
                        if (val === 'role_doctor' && isClinic) {
                          updates.is_doctor = true;
                        } else {
                          updates.is_doctor = false;
                        }
                        setEditEmp({ ...editEmp, ...updates });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_position') || 'Select position'} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Map(currentRoles.map(r => [r.key, r])).values()).map(role => (
                          <SelectItem key={role.key} value={role.key}>{role.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{editEmp?.position === 'role_other' || !editEmp?.position || !currentRoles.some(r => r.label === editEmp?.position || r.key === editEmp?.position) ? (t('specify_position') || 'Specify position') : (t('salary_net') || 'Salary (NET)')}</Label>
                    {editEmp?.position === 'role_other' || !editEmp?.position || !currentRoles.some(r => r.label === editEmp?.position || r.key === editEmp?.position) ? (
                      <Input
                        placeholder={t('eg_driver') || 'e.g. Driver'}
                        value={editEmp?.position === 'role_other' ? '' : editEmp?.position || ''}
                        onChange={e => setEditEmp({ ...editEmp, position: e.target.value })}
                      />
                    ) : (
                      <Input
                        type="number"
                        value={editEmp?.salary || ''}
                        onChange={e => setEditEmp({ ...editEmp, salary: Number(e.target.value) })}
                      />
                    )}
                  </div>
                </div>

                {(editEmp?.position === 'role_other' || !editEmp?.position || !currentRoles.some(r => r.label === editEmp?.position || r.key === editEmp?.position)) && (
                  <div className="grid gap-2">
                    <Label>{t('salary_net') || 'Salary (NET)'}</Label>
                    <Input
                      type="number"
                      value={editEmp?.salary || ''}
                      onChange={e => setEditEmp({ ...editEmp, salary: Number(e.target.value) })}
                    />
                  </div>
                )}

                {isClinic && (
                  <>
                    <div className="flex items-center space-x-2 py-2">
                      <Checkbox 
                        id="is_doctor" 
                        checked={editEmp?.is_doctor || false}
                        onCheckedChange={(checked) => setEditEmp({ ...editEmp, is_doctor: !!checked })}
                      />
                      <Label htmlFor="is_doctor" className="cursor-pointer">{t('is_doctor') || 'Is doctor'}</Label>
                    </div>

                    {editEmp?.is_doctor && (
                      <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                        <Label className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-primary" />
                          {t('specialization') || 'Specialization'}
                        </Label>
                        <Input
                          placeholder={t('eg_dentist') || 'e.g. Dentist'}
                          value={editEmp?.specialization || ''}
                          onChange={e => setEditEmp({ ...editEmp, specialization: e.target.value })}
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>{t('pin_code') || 'PIN Code'}</Label>
                    <Input
                      value={editEmp?.pin_code || ''}
                      onChange={e => setEditEmp({ ...editEmp, pin_code: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('phone') || 'Phone'}</Label>
                    <Input
                      value={editEmp?.phone || ''}
                      onChange={e => setEditEmp({ ...editEmp, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>{t('email_address') || 'Email'}</Label>
                  <Input
                    type="email"
                    value={editEmp?.email || ''}
                    onChange={e => setEditEmp({ ...editEmp, email: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t('cancel') || 'Cancel'}</Button>
                </DialogClose>
                <Button onClick={handleSaveEmployee} className="gap-2">
                  <Save className="h-4 w-4" />
                  {t('save') || 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex gap-1 h-auto flex-wrap">
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              {t('employees_tab') || 'Employees'}
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <Clock className="h-4 w-4" />
              {t('attendance_tab') || 'Attendance'}
            </TabsTrigger>
            <TabsTrigger value="payroll" className="gap-2">
              <DollarSign className="h-4 w-4" />
              {t('payroll_tab') || 'Payroll'}
            </TabsTrigger>
            <TabsTrigger value="leaves" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {t('leaves_tab') || 'Leaves'}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="h-4 w-4" />
              {t('reviews_tab') || 'Reviews'}
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-2 text-primary font-bold">
              <CalendarDays className="h-4 w-4" />
              {t('schedules_tab') || 'გრაფიკები'}
            </TabsTrigger>
            <TabsTrigger value="commissions" className="gap-2 text-primary font-bold">
              <Star className="h-4 w-4" />
              {t('commissions_tab') || 'საკომისიოები'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('search_emp') || 'Search (name, position)...'}
                    className="pl-9"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('emp_name_col') || 'Employee'}</TableHead>
                        <TableHead>{t('emp_position_col') || 'Position'}</TableHead>
                        <TableHead>{t('emp_salary_col') || 'Salary'}</TableHead>
                        <TableHead>{t('emp_status_col') || 'Status'}</TableHead>
                        <TableHead className="text-right">{t('emp_action_col') || 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.full_name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{emp.position}</span>
                              {emp.is_doctor && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Stethoscope className="h-3 w-3" />
                                  {emp.specialization || (t('general_profile') || 'General Profile')}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{emp.salary?.toLocaleString()} ₾</TableCell>
                          <TableCell>
                            <Badge variant={emp.is_active ? 'default' : 'secondary'}>
                              {emp.is_active ? (t('active_status') || 'Active') : (t('inactive_status') || 'Inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditEmp(emp); setIsFormOpen(true); }}
                            >
                              {t('emp_edit_btn') || 'Edit'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('today_attendance') || 'Today Attendance'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {employees.filter(e => e.is_active).map(emp => {
                    const todayLog = attendance.find(a =>
                      a.employee_id === emp.id &&
                      a.date === new Date().toISOString().split('T')[0]
                    );

                    return (
                      <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.position}</p>
                        </div>
                        <div className="flex gap-2">
                          {todayLog ? (
                            <Badge variant={todayLog.status === 'present' ? 'default' : 'destructive'}>
                              {todayLog.status === 'present' ? (t('arrived') || 'Arrived') : (t('missed') || 'Absent')}
                            </Badge>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleLogAttendance(emp.id, 'present')}>{t('mark_arrived') || 'Mark Arrived'}</Button>
                              <Button size="sm" variant="ghost" onClick={() => handleLogAttendance(emp.id, 'absent')}>{t('mark_missed') || 'Mark Absent'}</Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    {t('history') || 'History'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('date_col') || 'Date'}</TableHead>
                        <TableHead>{t('name_col') || 'Name'}</TableHead>
                        <TableHead>{t('status_col') || 'Status'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.slice(0, 10).map((log) => {
                        const emp = employees.find(e => e.id === log.employee_id);
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">{log.date}</TableCell>
                            <TableCell className="text-xs font-medium">{emp?.full_name}</TableCell>
                            <TableCell>
                              <Badge variant={log.status === 'present' ? 'secondary' : 'outline'} className="text-[10px]">
                                {log.status === 'present' ? (t('here') || 'Here') : (t('absent_short') || 'Absent')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ PAYROLL TAB ============ */}
          <TabsContent value="payroll" className="mt-6 space-y-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                {t('salary_slips') || 'Salary Slips'}
              </h3>
              <Button onClick={() => setSlipFormOpen(true)} size="sm"><FileText className="h-4 w-4 mr-2" />{t('new_slip') || 'New Slip'}</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('emp_name_col') || 'Employee'}</TableHead>
                    <TableHead>{t('period_col') || 'Period'}</TableHead>
                    <TableHead>{t('base_col') || 'Base'}</TableHead>
                    <TableHead>{t('bonus_col') || 'Bonus'}</TableHead>
                    <TableHead>{t('deduction_col') || 'Deduction'}</TableHead>
                    <TableHead>{t('net_salary_col') || 'Net Salary'}</TableHead>
                    <TableHead>{t('status_col') || 'Status'}</TableHead>
                    <TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {salarySlips.map(slip => {
                      const emp = employees.find(e => e.id === slip.employee_id);
                      return (
                        <TableRow key={slip.id}>
                          <TableCell className="font-medium">{emp?.full_name || '—'}</TableCell>
                          <TableCell>{MONTHS[slip.month - 1]} {slip.year}</TableCell>
                          <TableCell>{slip.base_salary.toLocaleString()} ₾</TableCell>
                          <TableCell className="text-green-600">+{(slip.bonus || 0).toLocaleString()} ₾</TableCell>
                          <TableCell className="text-red-500">-{(slip.deductions || 0).toLocaleString()} ₾</TableCell>
                          <TableCell className="font-bold">{slip.net_salary.toLocaleString()} ₾</TableCell>
                          <TableCell><Badge variant={slip.status === 'paid' ? 'default' : 'secondary'}>{slip.status === 'paid' ? (t('paid_status') || 'Paid') : slip.status === 'draft' ? (t('draft_status') || 'Draft') : (t('cancelled_status') || 'Cancelled')}</Badge></TableCell>
                          <TableCell>{slip.status === 'draft' && <Button size="sm" onClick={() => paySalary.mutateAsync(slip.id)}><CheckCircle2 className="h-4 w-4 mr-1" />{t('pay_btn') || 'Pay'}</Button>}</TableCell>
                        </TableRow>
                      );
                    })}
                    {salarySlips.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('no_slips') || 'No slips yet'}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ LEAVES TAB ============ */}
          <TabsContent value="leaves" className="mt-6 space-y-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                {t('leaves_title') || 'Leaves'}
              </h3>
              <Button onClick={() => setLeaveFormOpen(true)} size="sm">{t('request_leave') || '+ Request'}</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('emp_name_col') || 'Employee'}</TableHead>
                    <TableHead>{t('leave_type_col') || 'Type'}</TableHead>
                    <TableHead>{t('leave_start_col') || 'Start'}</TableHead>
                    <TableHead>{t('leave_end_col') || 'End'}</TableHead>
                    <TableHead>{t('status_col') || 'Status'}</TableHead>
                    <TableHead>{t('emp_action_col') || 'Action'}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {leaves.map(leave => {
                      const emp = employees.find(e => e.id === leave.employee_id);
                      return (
                        <TableRow key={leave.id}>
                          <TableCell>{emp?.full_name || '—'}</TableCell>
                          <TableCell>{LEAVE_TYPE_LABELS[leave.leave_type]}</TableCell>
                          <TableCell>{new Date(leave.start_date).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US')}</TableCell>
                          <TableCell>{new Date(leave.end_date).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US')}</TableCell>
                          <TableCell>
                            <Badge variant={leave.status === 'approved' ? 'default' : leave.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {LEAVE_STATUS_LABELS[leave.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {leave.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => updateLeaveStatus.mutateAsync({ id: leave.id, status: 'approved' })}>✓</Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateLeaveStatus.mutateAsync({ id: leave.id, status: 'rejected' })}>✗</Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {leaves.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('no_leaves') || 'No leaves yet'}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ SCHEDULES TAB ============ */}
          <TabsContent value="schedules" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="md:col-span-1">
                <CardHeader><CardTitle className="text-sm">თანამშრომელი</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {employees.map(emp => (
                    <Button 
                      key={emp.id} 
                      variant={selectedScheduleEmp === emp.id ? "default" : "ghost"}
                      className="w-full justify-start text-xs"
                      onClick={() => setSelectedScheduleEmp(emp.id)}
                    >
                      {emp.full_name}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {selectedScheduleEmp ? (
                <Card className="md:col-span-3">
                  <CardHeader><CardTitle className="text-lg">კვირის გრაფიკი: {employees.find(e => e.id === selectedScheduleEmp)?.full_name}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {WEEK_DAYS.map((day, idx) => {
                        const existing = workingHours(selectedScheduleEmp).data?.find(h => h.day_of_week === idx);
                        return (
                          <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/20">
                            <span className="w-24 font-bold text-sm">{day}</span>
                            <div className="flex items-center gap-2">
                              <Input 
                                type="time" 
                                className="w-32 h-8 text-xs" 
                                disabled={existing?.is_off}
                                value={existing?.start_time || "09:00"}
                                onChange={(e) => saveWorkingHours.mutate({ employee_id: selectedScheduleEmp, day_of_week: idx, start_time: e.target.value, is_off: false })}
                              />
                              <span>-</span>
                              <Input 
                                type="time" 
                                className="w-32 h-8 text-xs" 
                                disabled={existing?.is_off}
                                value={existing?.end_time || "18:00"}
                                onChange={(e) => saveWorkingHours.mutate({ employee_id: selectedScheduleEmp, day_of_week: idx, end_time: e.target.value, is_off: false })}
                              />
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                              <Checkbox 
                                checked={existing?.is_off || false} 
                                onCheckedChange={(checked) => saveWorkingHours.mutate({ employee_id: selectedScheduleEmp, day_of_week: idx, is_off: !!checked })}
                              />
                              <Label className="text-xs">დასვენება</Label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="md:col-span-3 flex items-center justify-center p-20 border-2 border-dashed rounded-xl grayscale opacity-50">
                   <p className="text-muted-foreground">აირჩიეთ თანამშრომელი გრაფიკის სანახავად</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============ COMMISSIONS TAB ============ */}
          <TabsContent value="commissions" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="md:col-span-1">
                <CardHeader><CardTitle className="text-sm">თანამშრომელი</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {employees.map(emp => (
                    <Button 
                      key={emp.id} 
                      variant={selectedCommEmp === emp.id ? "default" : "ghost"}
                      className="w-full justify-start text-xs"
                      onClick={() => setSelectedCommEmp(emp.id)}
                    >
                      {emp.full_name}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {selectedCommEmp ? (
                <Card className="md:col-span-3">
                  <CardHeader><CardTitle className="text-lg">საკომისიოს წესები: {employees.find(e => e.id === selectedCommEmp)?.full_name}</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>სერვისი</TableHead>
                          <TableHead>პროცენტი (%)</TableHead>
                          <TableHead>ფიქსირებული (₾)</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.filter(p => p.type === 'service').map(service => {
                          const rule = commissionRules.find(r => r.employee_id === selectedCommEmp && r.service_id === service.id);
                          return (
                            <TableRow key={service.id}>
                              <TableCell className="text-xs font-medium">{service.name}</TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="w-20 h-8 text-xs font-mono" 
                                  defaultValue={rule?.percentage || 0}
                                  onBlur={(e) => saveCommissionRule.mutate({ employee_id: selectedCommEmp, service_id: service.id, percentage: Number(e.target.value) })}
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="w-20 h-8 text-xs font-mono" 
                                  defaultValue={rule?.fixed_amount || 0}
                                  onBlur={(e) => saveCommissionRule.mutate({ employee_id: selectedCommEmp, service_id: service.id, fixed_amount: Number(e.target.value) })}
                                />
                              </TableCell>
                              <TableCell>
                                {(rule?.percentage! > 0 || rule?.fixed_amount! > 0) && <Badge variant="secondary" className="bg-green-100 text-green-700">აქტიური</Badge>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="md:col-span-3 flex items-center justify-center p-20 border-2 border-dashed rounded-xl grayscale opacity-50">
                   <p className="text-muted-foreground">აირჩიეთ თანამშრომელი წესების დასამატებლად</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Leave Request Dialog */}
        <Dialog open={leaveFormOpen} onOpenChange={setLeaveFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{t('leave_request_title') || 'Request Leave'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t('select_emp') || 'Select Employee'}</Label>
                <Select onValueChange={val => setLeaveForm({ ...leaveForm, employee_id: val })}>
                  <SelectTrigger><SelectValue placeholder={t('select_emp_placeholder') || 'Select employee'} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('leave_type_label') || 'Type'}</Label>
                  <Select value={leaveForm.leave_type} onValueChange={val => setLeaveForm({ ...leaveForm, leave_type: val as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t('start_date') || 'Start Date'}</Label>
                  <Input type="date" onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('end_date') || 'End Date'}</Label>
                  <Input type="date" onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>{t('comment') || 'Comment'}</Label>
                  <Input onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleRequestLeave}>{t('send_btn') || 'Send'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Performance Review Dialog */}
        <Dialog open={reviewFormOpen} onOpenChange={setReviewFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{t('add_review_title') || 'Add Review'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t('select_emp') || 'Select Employee'}</Label>
                <Select onValueChange={val => setReviewForm({ ...reviewForm, employee_id: val })}>
                  <SelectTrigger><SelectValue placeholder={t('select_emp_placeholder') || 'Select employee'} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('review_date') || 'Date'}</Label>
                  <Input type="date" onChange={e => setReviewForm({ ...reviewForm, review_date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>{t('score_label') || 'Score (1-5)'}</Label>
                  <Select onValueChange={val => setReviewForm({ ...reviewForm, performance_score: Number(val) })}>
                    <SelectTrigger><SelectValue placeholder="3" /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{t('review_comment') || 'Comment'}</Label>
                <Input onChange={e => setReviewForm({ ...reviewForm, comments: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddReview}>{t('add_btn') || 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Salary Slip Dialog */}
        <Dialog open={slipFormOpen} onOpenChange={setSlipFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{t('salary_accrual_title') || 'Accrue Salary'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t('select_emp') || 'Select Employee'}</Label>
                <Select onValueChange={val => {
                  const emp = employees.find(e => e.id === val);
                  setSlipForm({ ...slipForm, employee_id: val, base_salary: emp?.salary || 0 });
                }}>
                  <SelectTrigger><SelectValue placeholder={t('select_emp_placeholder') || 'Select employee'} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('month_label') || 'Month'}</Label>
                  <Select value={slipForm.month.toString()} onValueChange={val => setSlipForm({ ...slipForm, month: Number(val) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t('year_label') || 'Year'}</Label>
                  <Input type="number" value={slipForm.year} onChange={e => setSlipForm({ ...slipForm, year: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('base_salary_label') || 'Base Salary'}</Label>
                  <Input type="number" value={slipForm.base_salary} onChange={e => setSlipForm({ ...slipForm, base_salary: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label>{t('bonus_label') || 'Bonus'}</Label>
                  <Input type="number" value={slipForm.bonus} onChange={e => setSlipForm({ ...slipForm, bonus: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('deduction_label') || 'Deduction'}</Label>
                  <Input type="number" value={slipForm.deductions} onChange={e => setSlipForm({ ...slipForm, deductions: Number(e.target.value) })} />
                </div>
                <div className="grid gap-2">
                  <Label>{t('total_label') || 'Total'}</Label>
                  <Input disabled value={(slipForm.base_salary + slipForm.bonus - slipForm.deductions).toLocaleString() + ' ₾'} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSlip}>{t('accrue_btn') || 'Accrue'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

// ============ DIALOGS ============
// These are rendered in the same component tree via state variables above
function EmployeesPageDialogs() { return null; } // placeholder - dialogs inlined above
