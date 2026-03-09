import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useActivityLogs, ACTION_LABELS, ENTITY_LABELS } from '@/hooks/useActivityLog';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Activity, Search, User, Clock, FileDown, FileSpreadsheet } from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/export';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  update: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  delete: 'bg-red-500/10 text-red-600 border-red-500/20',
  sale: 'bg-primary/10 text-primary border-primary/20',
  refund: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  login: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  logout: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  open_shift: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  close_shift: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  invite: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  role_change: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export default function ActivityLogPage() {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: logs, isLoading } = useActivityLogs(200, entityFilter === 'all' ? undefined : entityFilter);

  const getDateThreshold = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    }
    if (dateFilter === '7days') {
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }
    if (dateFilter === '30days') {
      return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }
    return 0;
  };

  const dateThreshold = getDateThreshold();

  const filtered = (logs || []).filter((l) => {
    if (dateThreshold && new Date(l.created_at).getTime() < dateThreshold) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.user_name.toLowerCase().includes(q) ||
        l.entity_name.toLowerCase().includes(q) ||
        (ACTION_LABELS[l.action] || l.action).toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'ახლახანს';
    if (diffMin < 60) return `${diffMin} წუთის წინ`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} საათის წინ`;
    return d.toLocaleDateString('ka-GE') + ' ' + d.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
  };

  const buildDescription = (log: typeof filtered[0]) => {
    const action = ACTION_LABELS[log.action] || log.action;
    const entity = ENTITY_LABELS[log.entity_type] || log.entity_type;
    const name = log.entity_name ? ` "${log.entity_name}"` : '';
    return `${action} — ${entity}${name}`;
  };

  const handleExportExcel = () => {
    const data = filtered.map((l) => ({
      'დრო': new Date(l.created_at).toLocaleString('ka-GE'),
      'მომხმარებელი': l.user_name,
      'მოქმედება': ACTION_LABELS[l.action] || l.action,
      'ტიპი': ENTITY_LABELS[l.entity_type] || l.entity_type,
      'სახელი': l.entity_name || '',
    }));
    exportToExcel(data, 'activity-log');
  };

  const handleExportPDF = () => {
    const headers = ['დრო', 'მომხმარებელი', 'მოქმედება', 'ტიპი', 'სახელი'];
    const rows = filtered.map((l) => [
      new Date(l.created_at).toLocaleString('ka-GE'),
      l.user_name,
      ACTION_LABELS[l.action] || l.action,
      ENTITY_LABELS[l.entity_type] || l.entity_type,
      l.entity_name || '',
    ]);
    exportToPDF(headers, rows, 'აქტივობის ლოგი', 'activity-log');
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            აქტივობის ლოგი
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filtered.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filtered.length === 0}>
              <FileDown className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ძებნა..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="პერიოდი" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ყველა დრო</SelectItem>
              <SelectItem value="today">დღეს</SelectItem>
              <SelectItem value="7days">ბოლო 7 დღე</SelectItem>
              <SelectItem value="30days">ბოლო 30 დღე</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="ფილტრი" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ყველა</SelectItem>
              <SelectItem value="product">პროდუქტები</SelectItem>
              <SelectItem value="transaction">ტრანზაქციები</SelectItem>
              <SelectItem value="shift">ცვლები</SelectItem>
              <SelectItem value="employee">თანამშრომლები</SelectItem>
              <SelectItem value="user">მომხმარებლები</SelectItem>
              <SelectItem value="invoice">ინვოისები</SelectItem>
              <SelectItem value="expense">ხარჯები</SelectItem>
              <SelectItem value="warehouse">საწყობები</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Log Table */}
        <Card>
          <CardContent className="p-0 overflow-auto">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">აქტივობა არ არის</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">დრო</TableHead>
                    <TableHead className="w-[140px]">მომხმარებელი</TableHead>
                    <TableHead className="w-[110px]">მოქმედება</TableHead>
                    <TableHead>აღწერა</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(log.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium truncate max-w-[120px]">{log.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${ACTION_COLORS[log.action] || ''}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{buildDescription(log)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
