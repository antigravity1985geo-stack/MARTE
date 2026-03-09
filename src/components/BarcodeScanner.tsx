import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
  batchMode?: boolean;
}

export function BarcodeScanner({ open, onOpenChange, onScan, batchMode = false }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const lastScanRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    setScannedCodes([]);

    const scannerId = 'barcode-scanner-reader';
    let scanner: Html5Qrcode;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            const now = Date.now();
            if (now - lastScanRef.current < 1000) return; // Debounce 1s
            lastScanRef.current = now;

            onScan(decodedText);

            if (batchMode) {
              setScannedCodes(prev => [decodedText, ...prev]);
              // Native beep sound for feedback
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
                oscillator.connect(audioCtx.destination);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1);
              } catch (e) { }
            } else {
              onOpenChange(false);
            }
          },
          () => { } // Ignore scan errors (usually just means no code in frame)
        );
      } catch (err) {
        setError('კამერაზე წვდომა ვერ მოხერხდა. გთხოვთ მიეცით ნებართვა.');
      }
    };

    const timeout = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { });
        scannerRef.current = null;
      }
      setError('');
    };
  }, [open, batchMode, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={batchMode ? "max-w-md" : "max-w-sm"}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              {batchMode ? 'ჯგუფური სკანირება (Batch)' : 'ბარკოდის სკანერი'}
            </div>
            {batchMode && scannedCodes.length > 0 && (
              <span className="text-sm font-normal bg-primary/10 text-primary px-2 py-1 rounded-full">
                {scannedCodes.length} დასკანერებული
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div id="barcode-scanner-reader" className="w-full rounded-lg overflow-hidden border-2 border-primary/20 aspect-video bg-black flex items-center justify-center relative" />

          {error && (
            <div className="flex flex-col items-center gap-2 py-4">
              <CameraOff className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          {batchMode ? (
            <div className="flex flex-col gap-3">
              <div className="h-32 overflow-y-auto bg-muted/50 rounded-md p-2 space-y-1">
                {scannedCodes.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    დაიწყეთ სკანირება
                  </div>
                ) : (
                  scannedCodes.map((code, idx) => (
                    <div key={idx} className="text-xs font-mono bg-background p-1.5 rounded border flex justify-between">
                      <span>{code}</span>
                      <span className="text-muted-foreground">#{scannedCodes.length - idx}</span>
                    </div>
                  ))
                )}
              </div>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                დასრულება
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              მიმართეთ კამერა ბარკოდისკენ სკანირებისთვის
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
