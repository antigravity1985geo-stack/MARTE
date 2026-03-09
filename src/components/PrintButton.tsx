import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintButtonProps {
  title?: string;
  contentId?: string;
  className?: string;
}

export function PrintButton({ title, contentId = 'printable-area', className }: PrintButtonProps) {
  const handlePrint = () => {
    const content = document.getElementById(contentId);
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>${title || 'ბეჭდვა'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #111; }
          h1, h2, h3 { margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 13px; }
          th { background: #f5f5f5; font-weight: 600; }
          tr:nth-child(even) { background: #fafafa; }
          .print-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #333; }
          .print-header h1 { font-size: 18px; }
          .print-date { font-size: 12px; color: #666; }
          .print-summary { display: flex; gap: 24px; margin: 12px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          .print-summary div { font-size: 13px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; background: #e5e7eb; }
          .badge-green { background: #d1fae5; color: #065f46; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          .badge-blue { background: #dbeafe; color: #1e40af; }
          @media print { 
            @page { margin: 10mm; }
            body { padding: 0; }
          }
          .no-print { display: none !important; }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${title || ''}</h1>
          <span class="print-date">${new Date().toLocaleString('ka-GE')}</span>
        </div>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className={className}>
      <Printer className="h-4 w-4 mr-1" />
      ბეჭდვა
    </Button>
  );
}
