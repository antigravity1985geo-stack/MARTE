import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Download, Database, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const EXPORT_TABLES = [
  { key: 'products', label: 'პროდუქტები', icon: '📦' },
  { key: 'categories', label: 'კატეგორიები', icon: '📁' },
  { key: 'transactions', label: 'ტრანზაქციები', icon: '💰' },
  { key: 'transaction_items', label: 'ტრანზაქციის აითემები', icon: '📋' },
  { key: 'clients', label: 'კლიენტები', icon: '👥' },
  { key: 'suppliers', label: 'მომწოდებლები', icon: '🏭' },
  { key: 'invoices', label: 'ინვოისები', icon: '🧾' },
  { key: 'expenses', label: 'ხარჯები', icon: '💸' },
  { key: 'shifts', label: 'ცვლები', icon: '🕐' },
  { key: 'shift_sales', label: 'ცვლის გაყიდვები', icon: '🛒' },
  { key: 'employees', label: 'თანამშრომლები', icon: '👤' },
  { key: 'warehouses', label: 'საწყობები', icon: '🏪' },
  { key: 'activity_logs', label: 'აქტივობის ლოგები', icon: '📝' },
] as const;

type TableKey = typeof EXPORT_TABLES[number]['key'];

export default function DataExportPage() {
  const [selected, setSelected] = useState<Set<TableKey>>(new Set(EXPORT_TABLES.map(t => t.key)));
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'excel' | 'json'>('excel');

  const toggleTable = (key: TableKey) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(EXPORT_TABLES.map(t => t.key)));
  const selectNone = () => setSelected(new Set());

  const handleExport = async () => {
    if (selected.size === 0) {
      toast.error('აირჩიეთ მინიმუმ ერთი ცხრილი');
      return;
    }

    setExporting(true);
    try {
      const allData: Record<string, any[]> = {};

      for (const key of selected) {
        const { data, error } = await supabase.from(key).select('*');
        if (error) {
          console.error(`Error fetching ${key}:`, error);
          allData[key] = [];
        } else {
          allData[key] = data || [];
        }
      }

      const date = new Date().toISOString().split('T')[0];

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const wb = XLSX.utils.book_new();
        for (const [key, rows] of Object.entries(allData)) {
          if (rows.length > 0) {
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, key.substring(0, 31)); // Excel sheet name max 31 chars
          }
        }
        XLSX.writeFile(wb, `backup_${date}.xlsx`);
      }

      const totalRows = Object.values(allData).reduce((s, arr) => s + arr.length, 0);
      toast.success(`ექსპორტი დასრულდა! ${selected.size} ცხრილი, ${totalRows} ჩანაწერი`);
    } catch (err: any) {
      toast.error('ექსპორტის შეცდომა: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">მონაცემთა ექსპორტი / ბექაფი</h1>
          <p className="text-sm text-muted-foreground mt-1">
            აირჩიეთ ცხრილები და ჩამოტვირთეთ სრული ბექაფი
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Table selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                ცხრილების არჩევა
              </CardTitle>
              <CardDescription className="flex gap-2">
                <Button variant="link" size="sm" className="h-auto p-0" onClick={selectAll}>ყველა</Button>
                <span className="text-muted-foreground">|</span>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={selectNone}>არცერთი</Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXPORT_TABLES.map((table) => (
                  <div
                    key={table.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${selected.has(table.key) ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                    onClick={() => toggleTable(table.key)}
                  >
                    <Checkbox checked={selected.has(table.key)} />
                    <span className="text-lg">{table.icon}</span>
                    <Label className="cursor-pointer flex-1">{table.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                ექსპორტი
              </CardTitle>
              <CardDescription>
                არჩეული: <Badge variant="secondary">{selected.size} ცხრილი</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">ფორმატი</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={format === 'excel' ? 'default' : 'outline'}
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => setFormat('excel')}
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                    <span className="text-xs">Excel (.xlsx)</span>
                  </Button>
                  <Button
                    variant={format === 'json' ? 'default' : 'outline'}
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => setFormat('json')}
                  >
                    <FileJson className="h-5 w-5" />
                    <span className="text-xs">JSON</span>
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleExport}
                disabled={exporting || selected.size === 0}
              >
                {exporting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> ექსპორტირება...</>
                ) : (
                  <><Download className="mr-2 h-4 w-4" /> ჩამოტვირთვა</>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                ექსპორტი მოიცავს მხოლოდ თქვენს მონაცემებს. პაროლები და სენსიტიური ინფორმაცია არ შედის.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
