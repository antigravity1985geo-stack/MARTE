import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  companyName?: string;
}

export const generateInvoicePDF = (data: InvoiceData) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(20, 130, 110);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyName || 'საწყობი', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Saqyobi - Sakhroba', 14, 27);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE / ZEDNADEBI', pageW - 14, 18, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${data.invoiceNumber}`, pageW - 14, 27, { align: 'right' });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Tariqi / Tarigi:', 14, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, 60, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('Inv. N:', 14, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${data.invoiceNumber}`, 60, 60);

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 66, pageW - 14, 66);

  doc.setFillColor(245, 248, 250);
  doc.roundedRect(14, 70, pageW - 28, 32, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('KLIENTS / KLIENTI', 20, 79);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(data.clientName, 20, 88);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  const clientDetails = [data.clientPhone, data.clientAddress].filter(Boolean).join('  |  ');
  if (clientDetails) doc.text(clientDetails, 20, 96);

  autoTable(doc, {
    head: [['Produkti', 'Raodenoba', 'Fasi (GEL)', 'Jami (GEL)']],
    body: [
      [
        data.productName,
        data.quantity.toString(),
        `${data.price.toLocaleString()}`,
        `${data.total.toLocaleString()}`,
      ],
    ],
    startY: 110,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [20, 130, 110], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 252, 250] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFillColor(20, 130, 110);
  doc.roundedRect(pageW - 80, finalY, 66, 22, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Jami / Total:', pageW - 76, finalY + 10);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`GEL ${data.total.toLocaleString()}`, pageW - 18, finalY + 16, { align: 'right' });

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Gmadlobt tanamsqromlobistvis!  |  © 2026 Sakhroba', pageW / 2, 285, { align: 'center' });

  return doc;
};

export const printInvoicePDF = (data: InvoiceData) => {
  const doc = generateInvoicePDF(data);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url);
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

export const exportToExcel = (data: Record<string, string | number>[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (headers: string[], rows: (string | number)[][], title: string, filename: string) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 130, 110] },
  });
  doc.save(`${filename}.pdf`);
};
