// lib/exportShiftPDF.ts
// Uses jsPDF + jspdf-autotable (browser-side, no server needed)
// Install: npm install jspdf jspdf-autotable

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import { ShiftReport, ReportType } from '@/types/shiftReport'

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) =>
  format(new Date(d), 'd MMMM yyyy, HH:mm', { locale: ka })

const fmtTime = (d: string) =>
  format(new Date(d), 'HH:mm')

// ─── Colour palette ───────────────────────────────────────────
const C = {
  black:      [15,  17,  20]  as [number,number,number],
  white:      [255, 255, 255] as [number,number,number],
  slate50:    [248, 250, 252] as [number,number,number],
  slate100:   [241, 245, 249] as [number,number,number],
  slate300:   [203, 213, 225] as [number,number,number],
  slate600:   [71,  85,  105] as [number,number,number],
  slate800:   [30,  41,  59]  as [number,number,number],
  emerald600: [5,   150, 105] as [number,number,number],
  emerald100: [209, 250, 229] as [number,number,number],
  rose600:    [225, 29,  72]  as [number,number,number],
  rose100:    [255, 228, 230] as [number,number,number],
  blue600:    [37,  99,  235] as [number,number,number],
  blue100:    [219, 234, 254] as [number,number,number],
  amber100:   [254, 243, 199] as [number,number,number],
  amber700:   [180, 83,  9]   as [number,number,number],
}

export async function exportShiftPDF(
  report:     ShiftReport,
  reportType: ReportType,
  drawerName: string,
  companyName = 'საწყობი ERP',
) {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW    = 210   // page width
  const PH    = 297   // page height
  const ML    = 14    // margin left
  const MR    = 14    // margin right
  const CW    = PW - ML - MR   // content width
  let   y     = 0

  // ─── Helper: add new page if needed ─────────────────────────
  const checkPage = (needed: number) => {
    if (y + needed > PH - 14) {
      doc.addPage()
      y = 16
    }
  }

  // ─── Helper: section header ──────────────────────────────────
  const sectionHeader = (title: string) => {
    checkPage(12)
    doc.setFillColor(...C.slate800)
    doc.roundedRect(ML, y, CW, 8, 1, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...C.white)
    doc.text(title, ML + 3, y + 5.5)
    y += 11
  }

  // ─── Helper: KV row ──────────────────────────────────────────
  const kvRow = (
    label: string,
    value: string,
    opts?: { bold?: boolean; bg?: [number,number,number]; textColor?: [number,number,number] }
  ) => {
    checkPage(7)
    if (opts?.bg) {
      doc.setFillColor(...opts.bg)
      doc.rect(ML, y, CW, 6.5, 'F')
    }
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...(opts?.textColor ?? C.slate800))
    doc.text(label, ML + 3, y + 4.5)
    doc.text(value, ML + CW - 3, y + 4.5, { align: 'right' })
    y += 7
  }

  // ─── Helper: divider ─────────────────────────────────────────
  const divider = (dashed = false) => {
    checkPage(4)
    doc.setDrawColor(...C.slate300)
    doc.setLineWidth(0.2)
    if (dashed) (doc as any).setLineDash([1, 1])
    doc.line(ML, y, ML + CW, y)
    ;(doc as any).setLineDash([])
    y += 3
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — HEADER
  // ════════════════════════════════════════════════════════════
  y = 14

  // Company name bar
  doc.setFillColor(...C.slate800)
  doc.rect(0, 0, PW, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...C.white)
  doc.text(companyName, ML, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.slate300)
  doc.text(`${reportType === 'X' ? 'X-ანგარიში (მიმდინარე)' : 'Z-ანგარიში (საბოლოო)'}  ·  ${drawerName}`, ML, 19)
  y = 28

  // Report title block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...C.black)
  doc.text(
    reportType === 'X'
      ? 'სმენის X-ანგარიში'
      : 'სმენის Z-ანგარიში (Handover)',
    ML, y
  )
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.slate600)
  doc.text(`სმენა: ${fmtDate(report.shift_start)} — ${fmtDate(report.shift_end)}`, ML, y)
  y += 4
  doc.text(`ანგარიში შეიქმნა: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: ka })}`, ML, y)
  y += 10

  // ════════════════════════════════════════════════════════════
  // REVENUE SUMMARY
  // ════════════════════════════════════════════════════════════
  sectionHeader('გაყიდვების მიმოხილვა')

  kvRow('მთლიანი გაყიდვები (brutto)',  `₾${fmt(report.gross_sales)}`)
  divider(true)
  kvRow('ფასდაკლებები',                `− ₾${fmt(report.total_discounts)}`, { textColor: C.rose600 })
  kvRow('დაბრუნებები',                 `− ₾${fmt(report.total_refunds)}`,   { textColor: C.rose600 })
  divider()
  kvRow('წმინდა გაყიდვები (netto)',    `₾${fmt(report.net_sales)}`,
        { bold: true, bg: C.slate50 })
  kvRow('დღგ (18%)',                   `₾${fmt(report.total_tax)}`)
  y += 4

  // ════════════════════════════════════════════════════════════
  // TRANSACTION COUNTS
  // ════════════════════════════════════════════════════════════
  sectionHeader('ტრანზაქციების სტატისტიკა')

  kvRow('სულ ტრანზაქცია',   String(report.total_transactions))
  kvRow('გაყიდვა',
        String(report.total_transactions - report.refund_transactions - report.voided_transactions))
  kvRow('დაბრუნება',        String(report.refund_transactions),
        report.refund_transactions > 0 ? { textColor: C.rose600 } : undefined)
  kvRow('ანულირებული',      String(report.voided_transactions),
        report.voided_transactions > 0 ? { textColor: C.amber700 } : undefined)
  y += 4

  // ════════════════════════════════════════════════════════════
  // PAYMENT BREAKDOWN
  // ════════════════════════════════════════════════════════════
  sectionHeader('გადახდის მეთოდები')

  const payTotal = report.cash_sales + report.card_sales + report.other_sales || 1
  const cashPct  = ((report.cash_sales / payTotal) * 100).toFixed(1)
  const cardPct  = ((report.card_sales / payTotal) * 100).toFixed(1)

  // Visual split bar
  const barW = CW - 6
  const barH = 5
  const barX = ML + 3
  doc.setFillColor(...C.slate100)
  doc.roundedRect(barX, y, barW, barH, 1, 1, 'F')
  const cashBarW = (report.cash_sales / payTotal) * barW
  if (cashBarW > 0) {
    doc.setFillColor(...C.emerald600)
    doc.roundedRect(barX, y, cashBarW, barH, 1, 1, 'F')
  }
  const cardBarW = (report.card_sales / payTotal) * barW
  if (cardBarW > 0) {
    doc.setFillColor(...C.blue600)
    doc.roundedRect(barX + cashBarW, y, cardBarW, barH, 1, 1, 'F')
  }
  y += barH + 3

  kvRow(`ნაღდი (${cashPct}%)`,   `₾${fmt(report.cash_sales)}`,  { textColor: C.emerald600 })
  kvRow(`ბარათი (${cardPct}%)`,  `₾${fmt(report.card_sales)}`,  { textColor: C.blue600 })
  if (report.other_sales > 0)
    kvRow('სხვა',                `₾${fmt(report.other_sales)}`)
  y += 4

  // ════════════════════════════════════════════════════════════
  // CASH DRAWER
  // ════════════════════════════════════════════════════════════
  sectionHeader('სალაროს ანგარიში')

  kvRow('საწყისი ნაშთი',   `₾${fmt(report.opening_float)}`)
  kvRow('ნაღდი შემოსვლა',  `+ ₾${fmt(report.cash_in)}`)
  kvRow('ნაღდი გასვლა',    `− ₾${fmt(report.cash_out)}`)
  kvRow('ნაღდი გაყიდვები', `+ ₾${fmt(report.cash_sales)}`)
  kvRow('ნაღდი დაბრუნება', `− ₾${fmt(report.total_refunds)}`)
  divider()
  kvRow('მოსალოდნელი',     `₾${fmt(report.expected_cash)}`,
        { bold: true, bg: C.slate50 })

  if (report.declared_cash != null) {
    kvRow('რეალური (დათვლილი)', `₾${fmt(report.declared_cash)}`, { bold: true })
    const varAmt  = report.cash_variance ?? 0
    const isExact = Math.abs(varAmt) < 0.01
    kvRow(
      'სხვაობა',
      isExact ? '✓ ზუსტი' : `${varAmt >= 0 ? '+' : ''}₾${fmt(varAmt)}`,
      {
        bold: true,
        bg:   isExact ? C.emerald100 : C.rose100,
        textColor: isExact ? C.emerald600 : C.rose600,
      }
    )
  }
  y += 4

  // ════════════════════════════════════════════════════════════
  // CASHIER BREAKDOWN TABLE
  // ════════════════════════════════════════════════════════════
  if (report.cashier_breakdown?.length) {
    checkPage(20)
    sectionHeader('კასიერების ანგარიში')

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [['კასიერი', 'ტრანზ.', 'ფასდაკლება', 'გაყიდვები']],
      body: report.cashier_breakdown.map(c => [
        c.cashier_name ?? 'უცნობი',
        String(c.tx_count),
        `₾${fmt(c.discounts)}`,
        `₾${fmt(c.revenue)}`,
      ]),
      styles: {
        font:      'helvetica',
        fontSize:  8.5,
        cellPadding: 2.5,
        textColor: C.slate800,
      },
      headStyles: {
        fillColor: C.slate800,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize:  8.5,
      },
      alternateRowStyles: { fillColor: C.slate50 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — TOP PRODUCTS + HOURLY
  // ════════════════════════════════════════════════════════════
  if (report.top_products?.length || report.hourly_breakdown?.length) {
    doc.addPage()
    y = 16

    // ── Top products ──────────────────────────────────────────
    if (report.top_products?.length) {
      sectionHeader('ტოპ 10 პროდუქტი')
      autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        head: [['#', 'პროდუქტი', 'რაოდენობა', 'შემოსავალი']],
        body: report.top_products.map((p, i) => [
          String(i + 1),
          p.product_name,
          fmt(p.total_qty),
          `₾${fmt(p.total_revenue)}`,
        ]),
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, textColor: C.slate800 },
        headStyles: { fillColor: C.slate800, textColor: C.white, fontStyle: 'bold', fontSize: 8.5 },
        alternateRowStyles: { fillColor: C.slate50 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 95 },
          2: { cellWidth: 28, halign: 'right' },
          3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }

    // ── Hourly breakdown ──────────────────────────────────────
    if (report.hourly_breakdown?.length) {
      checkPage(20)
      sectionHeader('საათობრივი ანგარიში')

      // Mini bar chart
      const maxRev = Math.max(...report.hourly_breakdown.map(h => Number(h.revenue)), 1)
      const bw     = CW / report.hourly_breakdown.length
      report.hourly_breakdown.forEach((h, i) => {
        const barMaxH = 18
        const bh      = (Number(h.revenue) / maxRev) * barMaxH
        const bx      = ML + i * bw
        // Bar
        doc.setFillColor(...C.emerald600)
        doc.rect(bx + bw * 0.15, y + barMaxH - bh, bw * 0.7, bh, 'F')
        // Hour label
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...C.slate600)
        doc.text(fmtTime(h.hr), bx + bw / 2, y + barMaxH + 4, { align: 'center' })
      })
      y += 26

      autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        head: [['საათი', 'ტრანზ.', 'შემოსავალი']],
        body: report.hourly_breakdown.map(h => [
          fmtTime(h.hr),
          String(h.tx_count),
          `₾${fmt(Number(h.revenue))}`,
        ]),
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, textColor: C.slate800 },
        headStyles: { fillColor: C.slate800, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: C.slate50 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30, halign: 'center' },
          2: { halign: 'right', fontStyle: 'bold' },
        },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }
  }

  // ════════════════════════════════════════════════════════════
  // SIGNATURE BLOCK (Z-report only)
  // ════════════════════════════════════════════════════════════
  if (reportType === 'Z') {
    checkPage(40)
    y += 4
    sectionHeader('ხელმოწერები')
    y += 4

    const sigY = y
    ;[
      ['კასიერი', 'სახელი: ________________', '____________________'],
      ['მენეჯერი', 'სახელი: ________________', '____________________'],
    ].forEach((row, i) => {
      const x = ML + i * (CW / 2)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...C.slate800)
      doc.text(row[0], x, sigY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.slate600)
      doc.text(row[1], x, sigY + 8)
      doc.text(row[2], x, sigY + 20)
      doc.setDrawColor(...C.slate300)
      doc.setLineWidth(0.3)
      doc.line(x, sigY + 21, x + CW / 2 - 8, sigY + 21)
    })
    y = sigY + 30
  }

  // ════════════════════════════════════════════════════════════
  // PAGE FOOTER
  // ════════════════════════════════════════════════════════════
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...C.slate600)
    doc.text(
      `${companyName} · ${reportType}-ანგარიში · ${format(new Date(), 'dd.MM.yyyy HH:mm')}`,
      ML, PH - 6
    )
    doc.text(`გვ. ${p} / ${pageCount}`, PW - MR, PH - 6, { align: 'right' })
    doc.setDrawColor(...C.slate300)
    doc.setLineWidth(0.2)
    doc.line(ML, PH - 9, PW - MR, PH - 9)
  }

  // ─── Save ──────────────────────────────────────────────────
  const fileName = `${reportType}-Report_${format(new Date(report.shift_start), 'yyyy-MM-dd_HHmm')}.pdf`
  doc.save(fileName)
}
