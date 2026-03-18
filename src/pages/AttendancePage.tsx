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
import { useI18n } from '@/hooks/useI18n';

export default function AttendancePage() {
  const { t, lang } = useI18n();
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
      toast.success(t('attendance_logged') || 'Attendance logged');
    } catch (e: any) {
      toast.error((t('error_colon') || 'Error: ') + e.message);
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
            {t('attendance_tab') || 'Attendance Tracking'}
          </h1>
          <p className="text-muted-foreground">{t('attendance_desc') || 'Clock in/out and working hours'}</p>
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
          <div><p className="text-2xl font-bold">{presentCount}</p><p className="text-xs text-muted-foreground">{t('present_label') || 'Present'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10"><AlertTriangle className="h-5 w-5 text-yellow-600" /></div>
          <div><p className="text-2xl font-bold">{lateCount}</p><p className="text-xs text-muted-foreground">{t('late_label') || 'Late'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><UserX className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{absentCount}</p><p className="text-xs text-muted-foreground">{t('absent_label') || 'Absent'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><Timer className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{presentCount > 0 ? '100%' : '0%'}</p><p className="text-xs text-muted-foreground">{t('attendance_rate') || 'Attendance Rate'}</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today"><Clock className="h-4 w-4 mr-1" />{t('today_label') || 'Today'}</TabsTrigger>
          <TabsTrigger value="clockin"><LogIn className="h-4 w-4 mr-1" />{t('tracking_label') || 'Tracking'}</TabsTrigger>
          <TabsTrigger value="history"><Calendar className="h-4 w-4 mr-1" />{t('history_label') || 'History'}</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t('search_placeholder') || 'Search...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('emp_col') || 'Employee'}</TableHead>
                    <TableHead>{t('clock_in_col') || 'Clock In'}</TableHead>
                    <TableHead>{t('clock_out_col') || 'Clock Out'}</TableHead>
                    <TableHead>{t('status_col') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRecords.map(({ emp, record }) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <p className="font-medium">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.position}</p>
                      </TableCell>
                      <TableCell className="font-mono">{record?.clock_in ? new Date(record.clock_in).toLocaleTimeString(lang === 'ka' ? 'ka-GE' : 'en-US') : '—'}</TableCell>
                      <TableCell className="font-mono">{record?.clock_out ? new Date(record.clock_out).toLocaleTimeString(lang === 'ka' ? 'ka-GE' : 'en-US') : '—'}</TableCell>
                      <TableCell>
                        {record ? (
                          <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                            {record.status === 'present' ? (t('present_label') || 'Present') : (t('absent_label') || 'Absent')}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t('status_pending') || 'Pending'}</Badge>
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
                    {hasClockedIn ? (t('already_logged') || 'Already Logged') : (t('mark_arrived') || 'Mark Arrival')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t('recent_activities') || 'Recent Activities'}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('date_col') || 'Date'}</TableHead>
                    <TableHead>{t('emp_col') || 'Employee'}</TableHead>
                    <TableHead>{t('status_col') || 'Status'}</TableHead>
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
                            {rec.status === 'present' ? (t('here') || 'Here') : (t('absent_short') || 'Absent')}
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