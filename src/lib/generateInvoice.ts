import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReceiptConfig } from '@/stores/useReceiptStore';
import type { TransactionWithItems } from '@/hooks/useTransactions';
import type { SupabaseClient } from '@/hooks/useClients';

interface InvoiceData {
  transaction: TransactionWithItems;
  client?: SupabaseClient | null;
  config: ReceiptConfig;
  invoiceNumber: string;
}

async function loadFontFile(doc: jsPDF, url: string, fileName: string, fontName: string, style: string) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  doc.addFileToVFS(fileName, base64);
  doc.addFont(fileName, fontName, style);
}

async function loadFont(doc: jsPDF) {
  try {
    await Promise.all([
      loadFontFile(doc, '/fonts/NotoSansGeorgian-Regular.ttf', 'NotoSansGeorgian-Regular.ttf', 'NotoSansGeorgian', 'normal'),
      loadFontFile(doc, '/fonts/NotoSansGeorgian-Bold.ttf', 'NotoSansGeorgian-Bold.ttf', 'NotoSansGeorgian', 'bold'),
    ]);
    doc.setFont('NotoSansGeorgian', 'normal');
    return true;
  } catch {
    return false;
  }
}

async function loadLogo(doc: jsPDF, logoUrl: string, x: number, y: number, maxW: number, maxH: number) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = logoUrl;
    });
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h);
    return h;
  } catch {
    return 0;
  }
}

export async function generateInvoice({ transaction, client, config, invoiceNumber }: InvoiceData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const hasGeorgianFont = await loadFont(doc);

  const setFont = (size: number, color: [number, number, number], style?: string) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  let headerY = 14;

  // Logo
  if (config.logoUrl) {
    const logoH = await loadLogo(doc, config.logoUrl, 14, headerY, 30, 20);
    if (logoH > 0) headerY += logoH + 4;
  }

  // Company name
  setFont(16, [17, 24, 39]);
  doc.text(config.companyName || '', 14, headerY + 8);

  setFont(8, [107, 114, 128]);
  const addr = config.address || config.companyAddress || '';
  const phone = config.phone || config.companyPhone || '';
  const tin = config.tin || config.companyTin || '';
  if (addr) doc.text(addr, 14, headerY + 14);
  if (phone) doc.text(phone, 14, headerY + 19);
  if (tin) doc.text(`ს/კ: ${tin}`, 14, headerY + 24);

  // Invoice badge (right side)
  const badgeW = 52;
  const badgeH = 22;
  const badgeX = pageWidth - 14 - badgeW;
  const badgeY = headerY;
  doc.setFillColor(22, 163, 74);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, 'F');
  setFont(14, [255, 255, 255]);
  doc.text('ინვოისი', badgeX + badgeW / 2, badgeY + 10, { align: 'center' });
  setFont(8, [220, 252, 231]);
  doc.text(invoiceNumber, badgeX + badgeW / 2, badgeY + 17, { align: 'center' });

  // Date & status (right)
  setFont(9, [107, 114, 128]);
  doc.text(`თარიღი: ${new Date(transaction.date).toLocaleDateString('ka-GE')}`, pageWidth - 14, badgeY + badgeH + 8, { align: 'right' });

  // Divider
  const dividerY = headerY + 32;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, dividerY, pageWidth - 14, dividerY);

  // Client section
  let yPos = dividerY + 8;
  
  // Left: Buyer info
  setFont(7, [156, 163, 175]);
  doc.text('მიმღები / BILL TO', 14, yPos);
  yPos += 5;

  if (client) {
    setFont(11, [17, 24, 39]);
    doc.text(client.name, 14, yPos);
    yPos += 5;
    setFont(8, [107, 114, 128]);
    if (client.tin) { doc.text(`ს/კ: ${client.tin}`, 14, yPos); yPos += 4; }
    if (client.address) { doc.text(client.address, 14, yPos); yPos += 4; }
    if (client.phone) { doc.text(`ტელ: ${client.phone}`, 14, yPos); yPos += 4; }
    if (client.email) { doc.text(client.email, 14, yPos); yPos += 4; }
  } else {
    setFont(10, [107, 114, 128]);
    doc.text('არაიდენტიფიცირებული მყიდველი', 14, yPos);
    yPos += 5;
  }

  // Payment method badge (right side)
  const methodLabel = transaction.payment_method === 'cash' ? 'ნაღდი' : transaction.payment_method === 'card' ? 'ბარათი' : 'კომბინირებული';
  const pmBadgeW = 28;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(pageWidth - 14 - pmBadgeW, dividerY + 6, pmBadgeW, 8, 2, 2, 'F');
  setFont(7, [22, 163, 74]);
  doc.text(methodLabel, pageWidth - 14 - pmBadgeW / 2, dividerY + 12, { align: 'center' });

  yPos = Math.max(yPos, dividerY + 22) + 4;

  // Items table
  const items = transaction.items || [];
  autoTable(doc, {
    startY: yPos,
    head: [['#', 'დასახელება', 'რაოდ.', 'ფასი', 'ჯამი']],
    body: items.map((item, i) => [
      i + 1,
      item.name,
      item.quantity,
      `₾${item.price.toFixed(2)}`,
      `₾${(item.price * item.quantity).toFixed(2)}`,
    ]),
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      ...(hasGeorgianFont ? { font: 'NotoSansGeorgian' } : {}),
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      ...(hasGeorgianFont ? { font: 'NotoSansGeorgian' } : {}),
    },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  // Totals section
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  let totalY = finalY;

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  // Background for totals
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(pageWidth - 90, totalY - 4, 76, 
    30 + (transaction.coupon_discount ? 7 : 0) + (transaction.loyalty_discount ? 7 : 0), 
    3, 3, 'F');

  setFont(8, [107, 114, 128]);
  doc.text('ქვეჯამი:', pageWidth - 55, totalY + 2);
  setFont(9, [17, 24, 39]);
  doc.text(`₾${subtotal.toFixed(2)}`, pageWidth - 16, totalY + 2, { align: 'right' });
  totalY += 7;

  if (transaction.coupon_discount && transaction.coupon_discount > 0) {
    setFont(8, [239, 68, 68]);
    doc.text('ფასდაკლება:', pageWidth - 55, totalY + 2);
    doc.text(`-₾${transaction.coupon_discount.toFixed(2)}`, pageWidth - 16, totalY + 2, { align: 'right' });
    totalY += 7;
  }
  if (transaction.loyalty_discount && transaction.loyalty_discount > 0) {
    setFont(8, [239, 68, 68]);
    doc.text('ლოიალობა:', pageWidth - 55, totalY + 2);
    doc.text(`-₾${transaction.loyalty_discount.toFixed(2)}`, pageWidth - 16, totalY + 2, { align: 'right' });
    totalY += 7;
  }

  // Grand total
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 88, totalY + 1, pageWidth - 16, totalY + 1);
  totalY += 8;
  setFont(8, [107, 114, 128]);
  doc.text('სულ:', pageWidth - 55, totalY + 2);
  setFont(14, [22, 163, 74]);
  doc.text(`₾${transaction.total.toFixed(2)}`, pageWidth - 16, totalY + 2, { align: 'right' });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(14, footerY - 8, pageWidth - 14, footerY - 8);
  setFont(7, [156, 163, 175]);
  doc.text(config.footer || config.footerText || 'გმადლობთ შენაძენისთვის!', pageWidth / 2, footerY - 2, { align: 'center' });
  doc.text(`გენერირებულია: ${new Date().toLocaleString('ka-GE')}`, pageWidth / 2, footerY + 3, { align: 'center' });

  return doc;
}
