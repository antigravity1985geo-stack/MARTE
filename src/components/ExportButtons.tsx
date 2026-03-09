import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';

interface ExportButtonsProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
}

export function ExportButtons({ onExportExcel, onExportPDF }: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onExportExcel}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={onExportPDF}>
        <FileText className="mr-2 h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}
