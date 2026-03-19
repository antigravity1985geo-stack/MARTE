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
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { useEmployees } from '@/hooks/useEmployees';
import { useI18n } from '@/hooks/useI18n';
import { FileDown, Loader2 } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addGeorgianFont } from '@/lib/pdfHelper';

export default function SalesPage() {
  const { transactions, isLoading } = useTransactions();
  const { clients } = useClients();
  const { receiptConfig: config } = useReceiptConfig();
  const { employees } = useEmployees();
  const { t } = useI18n();
  const [dateFilter, setDateFilter] = useState('');
  const [cashierFilter, setCashierFilter] = useState('all');
  const isMobile = useIsMobile();

  const methodLabel = (m: string) =>
    m === 'cash' ? t('sales_cash') : m === 'card' ? t('sales_card') : t('sales_combined');

  const getCashierName = (cashierId: string | null) => {
    if (!cashierId) return '—';
    const emp = employees.find((e) => e.id === cashierId);
    return emp ? emp.full_name : cashierId;
  };

  const salesOnly = transactions.filter((t) => t.type === 'sale');
  const filtered = salesOnly
    .filter((t) => !dateFilter || t.date.startsWith(dateFilter))
    .filter((t) => cashierFilter === 'all' || t.cashier_id === cashierFilter);

  const uniqueCashierIds = [...new Set(salesOnly.map((t) => t.cashier_id).filter(Boolean))] as string[];

  const handleExportExcel = () => {
    const data = filtered.map((tr) => ({
      [t('date')]: new Date(tr.date).toLocaleString('ka-GE'),
      [t('products_title')]: (tr.items || []).length,
      [t('total')]: tr.total,
      [t('sales_method')]: tr.payment_method,
      [t('status')]: tr.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, 'sales.xlsx');
    toast.success(t('excel_downloaded'));
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const hasGeorgianFont = await addGeorgianFont(doc);
    
    doc.text(t('sales_report'), 14, 16);
    autoTable(doc, {
      head: [[t('date'), t('products_title'), t('total'), t('sales_method')]],
      body: filtered.map((tr) => [
        new Date(tr.date).toLocaleString('ka-GE'),
        (tr.items || []).length,
        `₾${tr.total.toFixed(2)}`,
        tr.payment_method,
      ]),
      startY: 22,
      styles: {
        font: hasGeorgianFont ? 'NotoSansGeorgian' : undefined,
      },
    });
    doc.save('sales.pdf');
    toast.success(t('pdf_downloaded'));
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">{t('sales_title')}</h1>
          <div className="flex gap-2">
            <PrintButton title={t('sales_report')} />
            <ExportButtons onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="max-w-xs"
          />
          <select
            value={cashierFilter}
            onChange={(e) => setCashierFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">{t('sales_all_cashiers')}</option>
            {uniqueCashierIds.map((id) => (
              <option key={id} value={id}>{getCashierName(id)}</option>
            ))}
          </select>
        </div>

        {isMobile ? (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('sales_no_sales')}</p>
            ) : (
              filtered.map((tr) => (
                <div key={tr.id} className="stat-card p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{new Date(tr.date).toLocaleString('ka-GE')}</p>
                      <p className="font-medium mt-0.5">{(tr.items || []).length} {t('products_title')}</p>
                    </div>
                    <p className="text-lg font-bold text-primary">₾{tr.total.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{methodLabel(tr.payment_method)}</Badge>
                    <Badge variant={tr.status === 'refunded' ? 'destructive' : 'default'}>
                      {tr.status === 'refunded' ? t('sales_refunded') : t('sales_completed')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{t('sales_cashier')}: {getCashierName(tr.cashier_id)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div id="printable-area" className="stat-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('sales_cashier')}</TableHead>
                  <TableHead>{t('sales_products')}</TableHead>
                  <TableHead>{t('total')}</TableHead>
                  <TableHead>{t('sales_method')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t('sales_no_sales')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell className="text-xs">{new Date(tr.date).toLocaleString('ka-GE')}</TableCell>
                      <TableCell className="text-xs">{getCashierName(tr.cashier_id)}</TableCell>
                      <TableCell>{(tr.items || []).length} {t('sales_units')}</TableCell>
                      <TableCell className="font-semibold">₾{tr.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{methodLabel(tr.payment_method)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tr.status === 'refunded' ? 'destructive' : 'default'}>
                          {tr.status === 'refunded' ? t('sales_refunded') : t('sales_completed')}
                        </Badge>
                      </TableCell>
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
