import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployees, SalarySlip } from '@/hooks/useEmployees';
import { useAccounting } from '@/hooks/useAccounting';
import { Banknote, Calculator, CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SalaryPage() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = useState(currentMonth.toString());
  const [year, setYear] = useState(currentYear.toString());

  const { employees, salarySlips, isLoading, createSalarySlip, paySalary } = useEmployees();
  const { addMultiLineEntry } = useAccounting();

  const filteredSlips = salarySlips.filter(s => s.month === Number(month) && s.year === Number(year));

  const handleGeneratePayroll = async () => {
    try {
      const activeEmployees = employees.filter(e => e.is_active);
      if (activeEmployees.length === 0) {
        toast.error('აქტიური თანამშრომლები ვერ მოიძებნა');
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
      toast.success('სახელფასო უწყისები დაგენერირდა');
    } catch (e: any) {
      toast.error('შეცდომა გენერაციისას: ' + e.message);
    }
  };

  const handlePay = async (slip: SalarySlip) => {
    try {
      const emp = employees.find(e => e.id === slip.employee_id);

      // 1. Create Journal Entry in Accounting
      // Debit Expense (Gross), Credit Liability (Tax, Pension, Bank/Net)
      await addMultiLineEntry.mutateAsync({
        date: new Date().toISOString().split('T')[0],
        description: `ხელფასის გაცემა: ${emp?.full_name} (${month}/${year})`,
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

      toast.success('ხელფასი გაიცა და გადასახადები აისახა ბუღალტერიაში');
    } catch (e: any) {
      toast.error('შეცდომა გადახდისას: ' + e.message);
    }
  };

  const totalPayroll = filteredSlips.reduce((sum, s) => sum + s.net_salary, 0);
  const paidCount = filteredSlips.filter(s => s.status === 'paid').length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Banknote className="h-6 w-6 text-primary" />
              ხელფასები & პეიროლი
            </h1>
            <p className="text-sm text-muted-foreground mt-1">სახელფასო უწყისები და გადახდები</p>
          </div>

          <div className="flex gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="წელი" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="თვე" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {new Date(2000, i).toLocaleString('ka-GE', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleGeneratePayroll} variant="outline" className="gap-2">
              <Calculator className="h-4 w-4" />
              დაგენერირება
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ჯამური დარიცხვა</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalPayroll.toLocaleString()} ₾</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">სტატუსი</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{paidCount} / {filteredSlips.length} გაცემული</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">დარჩენილი გადასახდელი</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                {(totalPayroll - filteredSlips.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.net_salary, 0)).toLocaleString()} ₾
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>სახელფასო უწყისი - {new Date(2000, Number(month) - 1).toLocaleString('ka-GE', { month: 'long' })} {year}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredSlips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>ამ პერიოდისთვის უწყისები არ მოიძებნა. დააჭირეთ 'დაგენერირება'-ს.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>თანამშრომელი</TableHead>
                    <TableHead>დარიცხული (Gross)</TableHead>
                    <TableHead>საპენსიო (2%)</TableHead>
                    <TableHead>საშემოსავლო (20%)</TableHead>
                    <TableHead>დაქვითვა</TableHead>
                    <TableHead>ხელზე (Net)</TableHead>
                    <TableHead>სტატუსი</TableHead>
                    <TableHead className="text-right">მოქმედება</TableHead>
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
                          <Badge variant={slip.status === 'paid' ? 'default' : 'outline'}>
                            {slip.status === 'paid' ? (
                              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> გაცემულია</span>
                            ) : 'დარიცხული'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {slip.status !== 'paid' && (
                            <Button size="sm" onClick={() => handlePay(slip)} className="gap-2">
                              <CreditCard className="h-4 w-4" />
                              გაცემა
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
