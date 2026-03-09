import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Clock, LogIn, LogOut, Users, AlertTriangle, CheckCircle,
  Calendar, Timer, BarChart3, Search, UserX, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useEmployees, Attendance } from '@/hooks/useEmployees';

export default function AttendancePage() {
  const { employees, attendance, isLoading, logAttendance } = useEmployees();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = attendance.filter(r => r.date === selectedDate);
  const displayRecords = employees.map(emp => {
    const record = filteredRecords.find(r => r.employee_id === emp.id);
    return { emp, record };
  }).filter(({ emp }) => {
    if (!emp.is_active) return false;
    if (searchTerm && !emp.full_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleClockIn = async (employeeId: string) => {
    try {
      await logAttendance.mutateAsync({
        employee_id: employeeId,
        date: new Date().toISOString().split('T')[0],
        clock_in: new Date().toISOString(),
        status: 'present'
      });
      toast.success('მოსვლა დაფიქსირდა');
    } catch (e: any) {
      toast.error('შეცდომა: ' + e.message);
    }
  };

  const presentCount = filteredRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const lateCount = filteredRecords.filter(r => r.status === 'late').length;
  const absentCount = employees.filter(e => e.is_active).length - presentCount;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            დასწრების აღრიცხვა
          </h1>
          <p className="text-muted-foreground">მოსვლა/წასვლა და სამუშაო საათები</p>
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="w-44"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{presentCount}</p><p className="text-xs text-muted-foreground">დამსწრე</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10"><AlertTriangle className="h-5 w-5 text-yellow-600" /></div>
          <div><p className="text-2xl font-bold">{lateCount}</p><p className="text-xs text-muted-foreground">დაგვიანებული</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><UserX className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{absentCount}</p><p className="text-xs text-muted-foreground">არმოსული</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><Timer className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{presentCount > 0 ? '100%' : '0%'}</p><p className="text-xs text-muted-foreground">დასწრების კოეფ.</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today"><Clock className="h-4 w-4 mr-1" />დღევანდელი</TabsTrigger>
          <TabsTrigger value="clockin"><LogIn className="h-4 w-4 mr-1" />აღრიცხვა</TabsTrigger>
          <TabsTrigger value="history"><Calendar className="h-4 w-4 mr-1" />ისტორია</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="ძიება..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>თანამშრომელი</TableHead>
                    <TableHead>მოსვლა</TableHead>
                    <TableHead>წასვლა</TableHead>
                    <TableHead>სტატუსი</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRecords.map(({ emp, record }) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <p className="font-medium">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.position}</p>
                      </TableCell>
                      <TableCell className="font-mono">{record?.clock_in ? new Date(record.clock_in).toLocaleTimeString('ka-GE') : '—'}</TableCell>
                      <TableCell className="font-mono">{record?.clock_out ? new Date(record.clock_out).toLocaleTimeString('ka-GE') : '—'}</TableCell>
                      <TableCell>
                        {record ? (
                          <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                            {record.status === 'present' ? 'დამსწრე' : 'გაცდენა'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">მოლოდინში</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clockin" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {employees.filter(e => e.is_active).map(emp => {
            const hasClockedIn = attendance.find(a => a.employee_id === emp.id && a.date === new Date().toISOString().split('T')[0]);
            return (
              <Card key={emp.id} className={hasClockedIn ? 'opacity-60' : ''}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{emp.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{emp.position}</p>
                    </div>
                    {hasClockedIn && <CheckCircle className="h-5 w-5 text-green-500" />}
                  </div>
                  <Button
                    className="w-full"
                    variant={hasClockedIn ? 'outline' : 'default'}
                    disabled={!!hasClockedIn}
                    onClick={() => handleClockIn(emp.id)}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    {hasClockedIn ? 'აღრიცხულია' : 'მოსვლის დაფიქსირება'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-lg">ბოლო აქტივობები</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>თარიღი</TableHead>
                    <TableHead>თანამშრომელი</TableHead>
                    <TableHead>სტატუსი</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.slice(0, 20).map(rec => {
                    const emp = employees.find(e => e.id === rec.employee_id);
                    return (
                      <TableRow key={rec.id}>
                        <TableCell>{rec.date}</TableCell>
                        <TableCell>{emp?.full_name}</TableCell>
                        <TableCell>
                          <Badge variant={rec.status === 'present' ? 'secondary' : 'outline'}>
                            {rec.status === 'present' ? 'აქ იყო' : 'გააცდინა'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}