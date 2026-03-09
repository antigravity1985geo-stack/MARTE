import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard } from 'lucide-react';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface POSMobileCartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  finalTotal: number;
  cartItemCount: number;
  couponDiscount: number;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onPayment: () => void;
}

export function POSMobileCart({
  open, onOpenChange, cart, finalTotal, cartItemCount, couponDiscount,
  onUpdateQuantity, onRemove, onClear, onPayment,
}: POSMobileCartProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" /> კალათა ({cartItemCount})
            </span>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={onClear}>
                <Trash2 className="h-3 w-3 mr-1" />გასუფთავება
              </Button>
            )}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 flex-1 overflow-auto">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">კალათა ცარიელია</p>
              <p className="text-xs text-muted-foreground/60 mt-1">აირჩიეთ პროდუქტები დასამატებლად</p>
            </div>
          ) : (
            <div className="space-y-1">
              {cart.map((item) => (
                <SwipeToDelete key={item.id} onDelete={() => onRemove(item.productId)}>
                  <div className="flex items-center gap-2 py-2 px-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">₾{item.price.toFixed(2)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-0.5 bg-muted rounded-lg">
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => onUpdateQuantity(item.productId, -1)}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => onUpdateQuantity(item.productId, 1)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm font-bold w-16 text-right">₾{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </SwipeToDelete>
              ))}
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-3 safe-area-bottom">
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ფასდაკლება</span>
                <span className="text-destructive font-medium">-₾{couponDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">ჯამი ({cartItemCount} ერთეული)</span>
              <span className="text-2xl font-bold text-primary">₾{finalTotal.toFixed(2)}</span>
            </div>
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={() => {
                if (cart.length > 0) {
                  onPayment();
                  onOpenChange(false);
                }
              }}
              disabled={cart.length === 0}
            >
              <CreditCard className="mr-2 h-5 w-5" /> გადახდა ₾{finalTotal.toFixed(2)}
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
