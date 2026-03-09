import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShiftSale {
  total: number;
  cashAmount: number;
  cardAmount: number;
  isRefunded?: boolean;
}

interface CurrentShift {
  cashierName: string;
  sales: ShiftSale[];
}

interface POSShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentShift: CurrentShift | null;
  startingCash: string;
  onStartingCashChange: (val: string) => void;
  onOpenShift: () => void;
  onCloseShift: () => void;
}

export function POSShiftDialog({
  open, onOpenChange, currentShift,
  startingCash, onStartingCashChange,
  onOpenShift, onCloseShift,
}: POSShiftDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{currentShift ? 'ცვლის დახურვა' : 'ცვლის გახსნა'}</DialogTitle></DialogHeader>
        {currentShift ? (() => {
          const activeSales = currentShift.sales.filter((s) => !s.isRefunded);
          const totalSales = activeSales.reduce((s, sale) => s + sale.total, 0);
          const totalCash = activeSales.reduce((s, sale) => s + sale.cashAmount, 0);
          const totalCard = activeSales.reduce((s, sale) => s + sale.cardAmount, 0);
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="stat-card"><p className="text-xs text-muted-foreground">ჯამი გაყიდვები</p><p className="font-bold text-primary">₾{totalSales.toFixed(2)}</p></div>
                <div className="stat-card"><p className="text-xs text-muted-foreground">ნაღდი</p><p className="font-bold">₾{totalCash.toFixed(2)}</p></div>
                <div className="stat-card"><p className="text-xs text-muted-foreground">ბარათი</p><p className="font-bold">₾{totalCard.toFixed(2)}</p></div>
                <div className="stat-card"><p className="text-xs text-muted-foreground">ტრანზაქციები</p><p className="font-bold">{activeSales.length}</p></div>
              </div>
              <Button className="w-full" variant="destructive" onClick={onCloseShift}>ცვლის დახურვა</Button>
            </div>
          );
        })() : (
          <div className="space-y-3">
            <div className="space-y-2"><Label>საწყისი თანხა სალაროში</Label><Input type="number" value={startingCash} onChange={(e) => onStartingCashChange(e.target.value)} placeholder="0.00" /></div>
            <Button className="w-full" onClick={onOpenShift}>ცვლის გახსნა</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
