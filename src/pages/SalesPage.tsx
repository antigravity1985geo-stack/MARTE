import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { useTransactions } from '@/hooks/useTransactions';
import { useClients } from '@/hooks/useClients';
import { ExportButtons } from '@/components/ExportButtons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { useReceiptStore } from '@/stores/useReceiptStore';
import { useEmployees } from '@/hooks/useEmployees';
import { FileDown, Loader2 } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const methodLabel = (m: string) => m === 'cash' ? 'ნაღდი' : m === 'card' ? 'ბარათი' : 'კომბინ.';

export default function SalesPage() {
  const { transactions, isLoading } = useTransactions();
  const { clients } = useClients();
  const config = useReceiptStore((s) => s.receiptConfig);
  const { employees } = useEmployees();
  const [dateFilter, setDateFilter] = useState('');
  const [cashierFilter, setCashierFilter] = useState('all');
  const isMobile = useIsMobile();

  const getCashierName = (cashierId: string | null) => {
    if (!cashierId) return '—';
    const emp = employees.find((e) => e.id === cashierId);
    return emp ? emp.full_name : cashierId;
  };

  const salesOnly = transactions.filter((t) => t.type === 'sale');
  const filtered = salesOnly
    .filter((t) => !dateFilter || t.date.startsWith(dateFilter))
    .filter((t) => cashierFilter === 'all' || t.cashier_id === cashierFilter);

  // Unique cashier IDs from sales
  const uniqueCashierIds = [...new Set(salesOnly.map((t) => t.cashier_id).filter(Boolean))] as string[];

  const handleExportExcel = () => {
    const data = filtered.map((t) => ({ თარიღი: new Date(t.date).toLocaleString('ka-GE'), პროდუქტები: (t.items || []).length, ჯამი: t.total, მეთოდი: t.payment_method, სტატუსი: t.status }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, 'sales.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('გაყიდვების ანგარიში', 14, 16);
    autoTable(doc, {
      head: [['თარიღი', 'პროდუქტები', 'ჯამი', 'მეთოდი']],
      body: filtered.map((t) => [new Date(t.date).toLocaleString('ka-GE'), (t.items || []).length, `₾${t.total.toFixed(2)}`, t.payment_method]),
      startY: 22,
    });
    doc.save('sales.pdf');
  };

  if (isLoading) {
    return <PageTransition><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageTransition>;
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">გაყიდვები</h1>
          <div className="flex gap-2">
            <PrintButton title="გაყიდვების ანგარიში" />
            <ExportButtons onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="max-w-xs" />
          <select
            value={cashierFilter}
            onChange={(e) => setCashierFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">ყველა მოლარე</option>
            {uniqueCashierIds.map((id) => (
              <option key={id} value={id}>{getCashierName(id)}</option>
            ))}
          </select>
        </div>

        {isMobile ? (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">გაყიდვები არ არის</p>
            ) : (
              filtered.map((t) => (
                <div key={t.id} className="stat-card p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleString('ka-GE')}</p>
                      <p className="font-medium mt-0.5">{(t.items || []).length} პროდუქტი</p>
                    </div>
                    <p className="text-lg font-bold text-primary">₾{t.total.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{methodLabel(t.payment_method)}</Badge>
                    <Badge variant={t.status === 'refunded' ? 'destructive' : 'default'}>
                      {t.status === 'refunded' ? 'სტორნო' : 'დასრულ.'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">მოლარე: {getCashierName(t.cashier_id)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div id="printable-area" className="stat-card overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>თარიღი</TableHead><TableHead>მოლარე</TableHead><TableHead>პროდუქტები</TableHead><TableHead>ჯამი</TableHead><TableHead>მეთოდი</TableHead><TableHead>სტატუსი</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">გაყიდვები არ არის</TableCell></TableRow>
                ) : (
                  filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{new Date(t.date).toLocaleString('ka-GE')}</TableCell>
                      <TableCell className="text-xs">{getCashierName(t.cashier_id)}</TableCell>
                      <TableCell>{(t.items || []).length} ერთ.</TableCell>
                      <TableCell className="font-semibold">₾{t.total.toFixed(2)}</TableCell>
                      <TableCell><Badge variant="secondary">{methodLabel(t.payment_method)}</Badge></TableCell>
                      <TableCell><Badge variant={t.status === 'refunded' ? 'destructive' : 'default'}>{t.status === 'refunded' ? 'სტორნო' : 'დასრულ.'}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
