import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { SupabaseProduct } from '@/hooks/useProducts';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface POSProductGridProps {
  products: SupabaseProduct[];
  cart: CartItem[];
  isMobile: boolean;
  onAddToCart: (product: SupabaseProduct) => void;
}

export function POSProductGrid({ products, cart, isMobile, onAddToCart }: POSProductGridProps) {
  return (
    <ScrollArea className="flex-1">
      <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'}`}>
        {products.map((p) => {
          const inCart = cart.find((i) => i.productId === p.id);
          return (
            <button
              key={p.id}
              onClick={() => {
                onAddToCart(p);
                if (isMobile) toast.success(`${p.name} +1`, { duration: 1000 });
              }}
              className={`stat-card card-hover text-left cursor-pointer relative transition-all active:scale-[0.97]
                ${isMobile ? 'p-2.5' : 'p-3'}
                ${inCart ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
            >
              {inCart && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm">
                  {inCart.quantity}
                </span>
              )}
              <p className={`font-medium truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>{p.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-primary font-bold ${isMobile ? 'text-sm' : ''}`}>₾{p.sell_price.toFixed(2)}</span>
                <Badge variant={p.stock <= p.min_stock ? 'destructive' : 'secondary'} className="text-[9px] px-1 py-0">
                  {p.stock}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
