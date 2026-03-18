import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useEmployees, SalarySlip } from '@/hooks/useEmployees';
import { useAccounting } from '@/hooks/useAccounting';
import { useI18n } from '@/hooks/useI18n';
import { Banknote, Calculator, CreditCard, Loader2, CheckCircle2, AlertCircle, Wallet2, RefreshCw, DollarSign, Clock, Users, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function SalaryPage() {
  const { t } = useI18n();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = useState(currentMonth.toString());
  const [year, setYear] = useState(currentYear.toString());
  const [searchTerm, setSearchTerm] = useState('');

  const { employees, salarySlips, isLoading, createSalarySlip, paySalary } = useEmployees();
  const { addMultiLineEntry } = useAccounting();

  const filteredSlips = salarySlips.filter(s =>
    s.month === Number(month) &&
    s.year === Number(year) &&
    (employees.find(e => e.id === s.employee_id)?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGeneratePayroll = async () => {
    try {
      const activeEmployees = employees.filter(e => e.is_active);
      if (activeEmployees.length === 0) {
        toast.error(t('no_active_employees') || 'No active employees found');
        return;
      }

      for (const emp of activeEmployees) {
        // Check if already exists
        const exists = salarySlips.find(s => s.employee_id === emp.id && s.month === Number(month) && s.year === Number(year));
        if (exists) continue;

        await createSalarySlip.mutateAsync({
          employee_id: emp.id,
          month: Number(month),
          year: Number(year),
          base_salary: emp.salary,
          bonus: 0,
          deductions: 0,
          status: 'draft'
        });
      }
      toast.success(t('salaries_calculated') || 'Salaries calculated successfully');
    } catch (e: any) {
      toast.error((t('error_colon') || 'Error: ') + e.message);
    }
  };

  const handlePay = async (slip: SalarySlip) => {
    try {
      const emp = employees.find(e => e.id === slip.employee_id);

      // 1. Create Journal Entry in Accounting
      // Debit Expense (Gross), Credit Liability (Tax, Pension, Bank/Net)
      await addMultiLineEntry.mutateAsync({
        date: new Date().toISOString().split('T')[0],
        description: `${t('salary_payment_for') || 'Salary payment for'}: ${emp?.full_name} (${month}/${year})`,
        lines: [
          { accountCode: '6210', debit: slip.gross_salary, credit: 0 }, // Expense
          { accountCode: '3310', debit: 0, credit: slip.income_tax }, // Tax Liability
          { accountCode: '3320', debit: 0, credit: slip.pension_contribution }, // Pension Liability
          { accountCode: '2320', debit: 0, credit: slip.net_salary } // Bank Payment
        ],
        reference: `PAYROLL-${slip.id.slice(0, 8)}`
      });

      // 2. Mark slip as paid
      await paySalary.mutateAsync(slip.id);

      toast.success(t('salary_paid_accounting_updated') || 'Salary paid and accounting updated');
    } catch (e: any) {
      toast.error((t('error_on_payment') || 'Error on payment: ') + e.message);
    }
  };

  const totalPayroll = filteredSlips.reduce((sum, s) => sum + s.net_salary, 0);
  const paidCount = filteredSlips.filter(s => s.status === 'paid').length;
  const pendingCount = filteredSlips.filter(s => s.status === 'draft').length;


  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet2 className="h-6 w-6 text-primary" />
              {t('payroll_tab') || 'Payroll Management'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('payroll_desc') || 'Salaries, bonuses and payments'}</p>
          </div>

          <div className="flex gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder={t('year_placeholder') || 'Year'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t('month_placeholder') || 'Month'} />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {new Date(2000, i).toLocaleString('ka-GE', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleGeneratePayroll} disabled={createSalarySlip.isPending} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${createSalarySlip.isPending ? 'animate-spin' : ''}`} />
              {t('generate_salaries') || 'Generate Salaries'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{totalPayroll.toLocaleString()} ₾</p><p className="text-xs text-muted-foreground">{t('total_payroll') || 'Total Payroll'}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-2xl font-bold">{paidCount}</p><p className="text-xs text-muted-foreground">{t('paid_slips') || 'Paid Slips'}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-xs text-muted-foreground">{t('pending_slips') || 'Pending Slips'}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold">{employees.length}</p><p className="text-xs text-muted-foreground">{t('total_employees') || 'Total Employees'}</p></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('payroll_statement') || 'Payroll Statement'} - {new Date(2000, Number(month) - 1).toLocaleString('ka-GE', { month: 'long' })} {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder={t('search_placeholder') || 'Search...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                {t('export_csv') || 'Export CSV'}
              </Button>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredSlips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('no_slips_found') || "No slips found for this period. Click 'Generate' to create them."}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('emp_col') || 'Employee'}</TableHead>
                    <TableHead>{t('gross_col') || 'Gross'}</TableHead>
                    <TableHead>{t('pension_col') || 'Pension (2%)'}</TableHead>
                    <TableHead>{t('income_tax_col') || 'Income Tax (20%)'}</TableHead>
                    <TableHead>{t('deduction_col') || 'Deduction'}</TableHead>
                    <TableHead>{t('net_salary_col') || 'Net'}</TableHead>
                    <TableHead>{t('status_col') || 'Status'}</TableHead>
                    <TableHead className="text-right">{t('actions_col') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlips.map((slip) => {
                    const emp = employees.find(e => e.id === slip.employee_id);
                    return (
                      <TableRow key={slip.id}>
                        <TableCell className="font-medium">{emp?.full_name}</TableCell>
                        <TableCell>{(slip.gross_salary || (slip.base_salary + slip.bonus)).toLocaleString()} ₾</TableCell>
                        <TableCell className="text-orange-600">-{slip.pension_contribution || 0} ₾</TableCell>
                        <TableCell className="text-orange-600">-{slip.income_tax || 0} ₾</TableCell>
                        <TableCell className="text-red-600">-{slip.deductions - (slip.income_tax || 0) - (slip.pension_contribution || 0)} ₾</TableCell>
                        <TableCell className="font-bold">{slip.net_salary.toLocaleString()} ₾</TableCell>
                        <TableCell>
                          <Badge variant={slip.status === 'paid' ? 'default' : 'secondary'}>
                            {slip.status === 'paid' ? (t('paid_status') || 'Paid') : (t('draft_status') || 'Draft')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {slip.status !== 'paid' && (
                            <Button size="sm" onClick={() => handlePay(slip)} className="gap-2">
                              <CreditCard className="h-4 w-4" />
                              {t('pay_button') || 'Pay'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
