import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateInternalWaybill = (data: {
    transferNumber: string;
    date: string;
    fromName: string;
    toName: string;
    items: { name: string; quantity: number; unit: string }[];
}) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('შიდა გადაადგილების ზედნადები', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`ნომერი: ${data.transferNumber}`, 20, 35);
    doc.text(`თარიღი: ${data.date}`, 20, 42);

    // From/To
    doc.line(20, 48, 190, 48);
    doc.text('გამგზავნი (საწყობი):', 20, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(data.fromName, 60, 55);

    doc.setFont('helvetica', 'normal');
    doc.text('მიმღები (საწყობი):', 20, 62);
    doc.setFont('helvetica', 'bold');
    doc.text(data.toName, 60, 62);
    doc.line(20, 68, 190, 68);

    // Table
    const tableData = data.items.map((item, index) => [
        index + 1,
        item.name,
        item.quantity,
        item.unit
    ]);

    (doc as any).autoTable({
        startY: 75,
        head: [['#', 'დასახელება', 'რაოდენობა', 'განზ.']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [63, 81, 181] }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.text('ჩააბარა: ____________________', 20, finalY);
    doc.text('ჩაიბარა: ____________________', 120, finalY);

    doc.save(`Waybill_${data.transferNumber}.pdf`);
};
