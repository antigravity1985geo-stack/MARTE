import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard } from 'lucide-react';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface POSCartProps {
  cart: CartItem[];
  finalTotal: number;
  cartItemCount: number;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onPayment: () => void;
  onShiftToggle: () => void;
  currentShift: boolean;
}

export function POSCart({
  cart, finalTotal, cartItemCount,
  onUpdateQuantity, onRemove, onClear,
  onPayment, onShiftToggle, currentShift,
}: POSCartProps) {
  return (
    <div className="w-[450px] flex flex-col border rounded-xl bg-card p-4 shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-lg">
        <ShoppingCart className="h-5 w-5 text-primary" /> კალათა
      </h3>
      <ScrollArea className="flex-1 -mx-2 px-2">
        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">კალათა ცარიელია</p>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all">
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-[10px] text-muted-foreground opacity-30">IMG</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight line-clamp-1">{item.name}</p>
                  <p className="text-xs text-muted-foreground">₾{item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdateQuantity(item.productId, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-mono">{item.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdateQuantity(item.productId, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm font-semibold w-16 text-right">₾{(item.price * item.quantity).toFixed(2)}</p>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onRemove(item.productId)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <div className="border-t pt-3 mt-3 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">ჯამი ({cartItemCount} ერთ.)</span>
          <span className="text-xl font-bold text-primary">₾{finalTotal.toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClear}>წაშლა</Button>
          <Button className="flex-1" onClick={onPayment} disabled={cart.length === 0}>
            <CreditCard className="mr-2 h-4 w-4" /> გადახდა
          </Button>
        </div>
        <Button variant="outline" className="w-full" onClick={onShiftToggle}>
          {currentShift ? 'ცვლის მართვა F4' : 'ცვლის გახსნა F4'}
        </Button>
      </div>
    </div>
  );
}
