import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePricing, Coupon } from '@/hooks/usePricing';
import { Tag, Percent, Banknote, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface POSPromotionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (coupon: Coupon) => void;
}

export function POSPromotionsDialog({ isOpen, onOpenChange, onSelect }: POSPromotionsDialogProps) {
  const { coupons, isLoading } = usePricing();

  // Filter only active and unexpired coupons
  const activeCoupons = coupons.filter(c => c.isActive && new Date(c.expiresAt) >= new Date());

  const handleSelect = (coupon: Coupon) => {
    onSelect(coupon);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Tag className="h-6 w-6 text-primary" />
            მიმდინარე აქციები და ფასდაკლებები
          </DialogTitle>
          <DialogDescription>
            აირჩიეთ სასურველი აქცია მიმდინარე შეკვეთაზე გამოსაყენებლად
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">იტვირთება...</div>
          ) : activeCoupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Tag className="h-12 w-12 mb-4 opacity-20" />
              <p>მიმდინარე აქციები ვერ მოიძებნა</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeCoupons.map((coupon) => (
                  <Button
                    key={coupon.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2 justify-start border-2 hover:border-primary/50 relative overflow-hidden group"
                    onClick={() => handleSelect(coupon)}
                  >
                    <div className="absolute -right-4 -top-4 bg-primary/10 w-24 h-24 rounded-full transition-transform group-hover:scale-150" />
                    
                    <div className="flex justify-between w-full items-center z-10">
                      <span className="font-bold text-lg">{coupon.code}</span>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {coupon.discountType === 'percentage' ? (
                          <><Percent className="h-3 w-3" /> {coupon.discountValue}%</>
                        ) : (
                          <><Banknote className="h-3 w-3" /> {coupon.discountValue} ₾</>
                        )}
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground z-10 flex flex-col gap-1 items-start mt-2">
                       {coupon.minPurchase > 0 && (
                         <span>მინ. შენაძენი: {coupon.minPurchase} ₾</span>
                       )}
                       <span className="flex items-center gap-1 text-xs">
                         <Clock className="h-3 w-3" /> 
                         ძალაშია: {format(new Date(coupon.expiresAt), 'dd MMM, HH:mm', { locale: ka })}
                       </span>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
