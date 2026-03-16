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
import { useEmployees, Employee, Attendance } from '@/hooks/useEmployees';
import { Users, Clock, CalendarDays, UserPlus, Search, Loader2, Save, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

const CLINIC_ROLES = [
  'ექიმი',
  'ექთანი',
  'სანიტარი',
  'რეგისტრატორი',
  'დაცვა',
  'მენეჯერი',
  'ბუღალტერი',
  'ლაბორანტი',
  'სხვა'
];

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState('employees');
  const [search, setSearch] = useState('');
  const { employees, attendance, isLoading, addEmployee, updateEmployee, logAttendance } = useEmployees();

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
        toast.success('თანამშრომელი განახლდა');
      } else {
        await addEmployee.mutateAsync(editEmp as any);
        toast.success('თანამშრომელი დაემატა');
      }
      setIsFormOpen(false);
      setEditEmp(null);
    } catch (e: any) {
      toast.error('შეცდომა შენახვისას: ' + e.message);
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
      toast.success('დასწრება დაფიქსირდა');
    } catch (e: any) {
      toast.error('შეცდომა: ' + e.message);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              თანამშრომლების მართვა (HR)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">პერსონალის აღრიცხვა და დასწრება</p>
          </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => { setEditEmp({}); setIsFormOpen(true); }}>
                <UserPlus className="h-4 w-4" />
                ახალი თანამშრომელი
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editEmp?.id ? 'რედაქტირება' : 'ახალი თანამშრომელი'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>სახელი და გვარი</Label>
                  <Input
                    value={editEmp?.full_name || ''}
                    onChange={e => setEditEmp({ ...editEmp, full_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>პოზიცია</Label>
                    <Select 
                      value={CLINIC_ROLES.includes(editEmp?.position || '') ? editEmp?.position : 'სხვა'} 
                      onValueChange={val => {
                        const updates: Partial<Employee> = { position: val === 'სხვა' ? '' : val };
                        if (val === 'ექიმი') {
                          updates.is_doctor = true;
                        }
                        setEditEmp({ ...editEmp, ...updates });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="აირჩიეთ პოზიცია" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLINIC_ROLES.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{editEmp?.position === 'სხვა' || !CLINIC_ROLES.includes(editEmp?.position || '') ? 'მიუთითეთ პოზიცია' : 'ხელფასი (NET)'}</Label>
                    {editEmp?.position === 'სხვა' || !CLINIC_ROLES.includes(editEmp?.position || '') ? (
                      <Input
                        placeholder="მაგ: მძღოლი"
                        value={editEmp?.position || ''}
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

                {(editEmp?.position === 'სხვა' || !CLINIC_ROLES.includes(editEmp?.position || '')) && (
                  <div className="grid gap-2">
                    <Label>ხელფასი (NET)</Label>
                    <Input
                      type="number"
                      value={editEmp?.salary || ''}
                      onChange={e => setEditEmp({ ...editEmp, salary: Number(e.target.value) })}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox 
                    id="is_doctor" 
                    checked={editEmp?.is_doctor || false}
                    onCheckedChange={(checked) => setEditEmp({ ...editEmp, is_doctor: !!checked })}
                  />
                  <Label htmlFor="is_doctor" className="cursor-pointer">ექიმია (კალენდარში გამოჩენა)</Label>
                </div>

                {editEmp?.is_doctor && (
                  <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      სპეციალიზაცია
                    </Label>
                    <Input
                      placeholder="მაგ: სტომატოლოგი, თერაპევტი"
                      value={editEmp?.specialization || ''}
                      onChange={e => setEditEmp({ ...editEmp, specialization: e.target.value })}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>PIN კოდი</Label>
                    <Input
                      value={editEmp?.pin_code || ''}
                      onChange={e => setEditEmp({ ...editEmp, pin_code: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>ტელეფონი</Label>
                    <Input
                      value={editEmp?.phone || ''}
                      onChange={e => setEditEmp({ ...editEmp, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editEmp?.email || ''}
                    onChange={e => setEditEmp({ ...editEmp, email: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">გაუქმება</Button>
                </DialogClose>
                <Button onClick={handleSaveEmployee} className="gap-2">
                  <Save className="h-4 w-4" />
                  შენახვა
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              თანამშრომლები
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <Clock className="h-4 w-4" />
              დასწრება
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ძებნა (სახელი, პოზიცია)..."
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
                        <TableHead>თანამშრომელი</TableHead>
                        <TableHead>პოზიცია</TableHead>
                        <TableHead>ხელფასი</TableHead>
                        <TableHead>სტატუსი</TableHead>
                        <TableHead className="text-right">მოქმედება</TableHead>
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
                                  {emp.specialization || 'ზოგადი პროფილი'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{emp.salary?.toLocaleString()} ₾</TableCell>
                          <TableCell>
                            <Badge variant={emp.is_active ? 'default' : 'secondary'}>
                              {emp.is_active ? 'აქტიური' : 'არააქტიური'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditEmp(emp); setIsFormOpen(true); }}
                            >
                              რედაქტირება
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
                  <CardTitle className="text-lg">დღევანდელი აღრიცხვა</CardTitle>
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
                              {todayLog.status === 'present' ? 'მოვიდა' : 'არ მოვიდა'}
                            </Badge>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleLogAttendance(emp.id, 'present')}>მოვიდა</Button>
                              <Button size="sm" variant="ghost" onClick={() => handleLogAttendance(emp.id, 'absent')}>გააცდინა</Button>
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
                    ისტორია
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>თარიღი</TableHead>
                        <TableHead>სახელი</TableHead>
                        <TableHead>სტატუსი</TableHead>
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
                                {log.status === 'present' ? 'აქ' : 'გაცდენა'}
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
        </Tabs>
      </div>
    </PageTransition>
  );
}
