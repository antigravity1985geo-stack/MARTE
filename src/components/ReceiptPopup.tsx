import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReceiptStore } from '@/stores/useReceiptStore';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Share2, Download, MessageCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptPopupProps {
  open: boolean;
  onClose: () => void;
  items: ReceiptItem[];
  total: number;
  cashAmount?: number;
  change?: number;
  paymentMethod: string;
  cashierName?: string;
  invoiceNumber?: string;
  clientName?: string;
  couponDiscount?: number;
  loyaltyDiscount?: number;
  pointsEarned?: number;
  autoCloseMs?: number;
}

export function ReceiptPopup({
  open,
  onClose,
  items,
  total,
  cashAmount,
  change,
  paymentMethod,
  cashierName,
  invoiceNumber,
  clientName,
  couponDiscount,
  loyaltyDiscount,
  pointsEarned,
  autoCloseMs = 5000,
}: ReceiptPopupProps) {
  const config = useReceiptStore((s) => s.receiptConfig);
  const [countdown, setCountdown] = useState(Math.ceil(autoCloseMs / 1000));
  const receiptRef = useRef<HTMLDivElement>(null);
  const methodLabel = paymentMethod === 'cash' ? 'ნაღდი' : paymentMethod === 'card' ? 'ბარათი' : 'კომბინირებული';
  const now = new Date();

  useEffect(() => {
    if (!open) return;
    setCountdown(Math.ceil(autoCloseMs / 1000));
    const timer = setTimeout(onClose, autoCloseMs);
    const interval = setInterval(() => setCountdown((p) => Math.max(0, p - 1)), 1000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [open, autoCloseMs, onClose]);

  const generateReceiptText = useCallback(() => {
    const lines: string[] = [];
    lines.push(config.companyName);
    if (config.address) lines.push(config.address);
    if (config.phone) lines.push(config.phone);
    if (config.tin) lines.push(`ს/კ: ${config.tin}`);
    lines.push('─'.repeat(30));
    lines.push(`თარიღი: ${now.toLocaleDateString('ka-GE')} ${now.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}`);
    if (invoiceNumber) lines.push(`ინვოისი: ${invoiceNumber}`);
    if (cashierName) lines.push(`მოლარე: ${cashierName}`);
    if (clientName) lines.push(`კლიენტი: ${clientName}`);
    lines.push('─'.repeat(30));
    items.forEach((item) => {
      lines.push(`${item.name}`);
      lines.push(`  ${item.quantity} x ₾${item.price.toFixed(2)} = ₾${(item.quantity * item.price).toFixed(2)}`);
    });
    lines.push('─'.repeat(30));
    if (couponDiscount && couponDiscount > 0) {
      lines.push(`კუპონი: -₾${couponDiscount.toFixed(2)}`);
    }
    if (loyaltyDiscount && loyaltyDiscount > 0) {
      lines.push(`ლოიალობა: -₾${loyaltyDiscount.toFixed(2)}`);
    }
    lines.push(`ჯამი: ₾${total.toFixed(2)}`);
    if (pointsEarned && pointsEarned > 0) {
      lines.push(`დაირიცხა: +${pointsEarned} ქულა`);
    }
    lines.push(`გადახდა: ${methodLabel}`);
    if (paymentMethod === 'cash' && cashAmount && cashAmount > 0) {
      lines.push(`მიღებული: ₾${cashAmount.toFixed(2)}`);
      if (change && change > 0) lines.push(`ხურდა: ₾${change.toFixed(2)}`);
    }
    lines.push('─'.repeat(30));
    lines.push(config.footer || config.thankYouMessage || '');
    return lines.join('\n');
  }, [config, items, total, cashAmount, change, paymentMethod, invoiceNumber, cashierName, clientName, couponDiscount, loyaltyDiscount, pointsEarned]);

  const handlePrint = useCallback(() => {
    if (!receiptRef.current) return;
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>ჩეკი</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: monospace; font-size: 12px; width: 80mm; color: #111; }
        .receipt-print { padding: 8px; }
        .receipt-print img { max-height: 32px; display: block; margin: 0 auto 4px; }
        .text-center { text-align: center; }
        .flex { display: flex; justify-content: space-between; }
        .font-bold { font-weight: bold; }
        .text-sm { font-size: 14px; }
        .text-xs { font-size: 10px; }
        .border-dashed { border-top: 1px dashed #ccc; margin: 6px 0; }
        .border-double { border-top: 2px double #888; padding-top: 6px; margin-top: 4px; }
        .text-red { color: red; }
        .text-green { color: green; }
        .pl-2 { padding-left: 8px; }
        .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
        .space-y > * + * { margin-top: 4px; }
        svg { display: block; margin: 4px auto; }
        @media print { @page { margin: 0; size: 80mm auto; } }
      </style></head>
      <body><div class="receipt-print">${printContent}</div></body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  }, []);

  const [copied, setCopied] = useState(false);

  const handleCopyText = useCallback(() => {
    const text = generateReceiptText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('ჩეკი დაკოპირდა');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generateReceiptText]);

  const handleWhatsApp = useCallback(() => {
    const text = generateReceiptText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }, [generateReceiptText]);

  const handleShare = useCallback(async () => {
    const text = generateReceiptText();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ელექტრონული ჩეკი', text });
      } catch { /* user cancelled */ }
    } else {
      handleCopyText();
    }
  }, [generateReceiptText, handleCopyText]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-[320px] max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close & countdown */}
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 z-10 bg-card border rounded-full p-1.5 shadow-lg hover:bg-muted transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Receipt paper */}
            <div ref={receiptRef} className="bg-white text-gray-900 rounded-lg shadow-2xl font-mono text-xs relative overflow-hidden">
              {/* Zigzag top */}
              <div className="h-3 bg-[repeating-linear-gradient(90deg,transparent,transparent_8px,#e5e7eb_8px,#e5e7eb_9px)]" />

              <div className="px-5 py-4 space-y-3">
                {/* Header */}
                <div className="text-center space-y-0.5">
                  {config.logoUrl && (
                    <img src={config.logoUrl} alt="" className="h-8 mx-auto mb-1 object-contain" />
                  )}
                  <p className="font-bold text-sm">{config.companyName}</p>
                  <p className="text-[10px] text-gray-500">{config.address}</p>
                  <p className="text-[10px] text-gray-500">{config.phone}</p>
                  {config.tin && <p className="text-[10px] text-gray-500">ს/კ: {config.tin}</p>}
                </div>

                {/* Separator */}
                <div className="border-t border-dashed border-gray-300" />

                {/* Meta */}
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>{now.toLocaleDateString('ka-GE')}</span>
                  <span>{now.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {invoiceNumber && (
                  <p className="text-[10px] text-gray-500">ინვოისი: {invoiceNumber}</p>
                )}
                {cashierName && (
                  <p className="text-[10px] text-gray-500">მოლარე: {cashierName}</p>
                )}
                {clientName && (
                  <p className="text-[10px] text-gray-500">კლიენტი: {clientName}</p>
                )}

                {/* Separator */}
                <div className="border-t border-dashed border-gray-300" />

                {/* Items */}
                <div className="space-y-1">
                  {items.map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between">
                        <span className="truncate max-w-[180px]">{item.name}</span>
                      </div>
                      <div className="flex justify-between text-gray-500 pl-2">
                        <span>{item.quantity} x ₾{item.price.toFixed(2)}</span>
                        <span className="font-medium text-gray-900">₾{(item.quantity * item.price).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Separator */}
                <div className="border-t border-dashed border-gray-300" />

                {/* Discounts */}
                {couponDiscount && couponDiscount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>კუპონის ფასდაკლება</span>
                    <span>-₾{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                {loyaltyDiscount && loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>ლოიალობის ფასდაკლება</span>
                    <span>-₾{loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between text-base font-bold border-t border-double border-gray-400 pt-2">
                  <span>ჯამი</span>
                  <span>₾{total.toFixed(2)}</span>
                </div>

                {pointsEarned && pointsEarned > 0 && (
                  <div className="flex justify-between text-[10px] text-primary italic font-bold">
                    <span>დაგერიცხათ ქულები:</span>
                    <span>+{pointsEarned}</span>
                  </div>
                )}

                {/* Payment details */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">გადახდა:</span>
                    <span>{methodLabel}</span>
                  </div>
                  {paymentMethod === 'cash' && cashAmount !== undefined && cashAmount > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">მიღებული:</span>
                        <span>₾{cashAmount.toFixed(2)}</span>
                      </div>
                      {change !== undefined && change > 0 && (
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-500">ხურდა:</span>
                          <span className="text-green-600">₾{change.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* QR */}
                {config.showQR && (
                  <div className="flex justify-center pt-1">
                    <QRCodeSVG value={`receipt:${invoiceNumber || now.getTime()}`} size={56} />
                  </div>
                )}

                {/* Footer */}
                <div className="text-center pt-1">
                  <p className="text-[10px] text-gray-400">{config.footer || config.thankYouMessage}</p>
                </div>
              </div>

              {/* Zigzag bottom */}
              <div className="h-3 bg-[repeating-linear-gradient(90deg,transparent,transparent_8px,#e5e7eb_8px,#e5e7eb_9px)]" />

              {/* Countdown bar */}
              <div className="h-1 bg-gray-100">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: autoCloseMs / 1000, ease: 'linear' }}
                  className="h-full bg-green-500"
                />
              </div>
            </div>

            {/* Share & Print actions */}
            <div className="mt-2 space-y-2 px-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-1 text-xs text-white/90 bg-white/20 hover:bg-white/30 rounded px-2 py-1.5 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  ბეჭდვა
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 flex items-center justify-center gap-1 text-xs text-white/90 bg-green-600/80 hover:bg-green-600 rounded px-2 py-1.5 transition"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
                <button
                  onClick={handleCopyText}
                  className="flex-1 flex items-center justify-center gap-1 text-xs text-white/90 bg-white/20 hover:bg-white/30 rounded px-2 py-1.5 transition"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'დაკოპირდა' : 'კოპირება'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-1 text-xs text-white/90 bg-white/20 hover:bg-white/30 rounded px-2 py-1.5 transition"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  გაზიარება
                </button>
              </div>
              <p className="text-xs text-white/50 text-center">
                ავტომატურად დაიხურება {countdown} წმ-ში
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
