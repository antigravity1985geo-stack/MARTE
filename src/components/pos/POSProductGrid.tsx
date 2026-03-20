import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image as ImageIcon, Star, StarOff, AlertTriangle } from 'lucide-react';
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
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('pos_favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggleFavorite = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      try { localStorage.setItem('pos_favorites', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const favoriteProducts = products.filter(p => favorites.has(p.id));

  const renderCard = (p: SupabaseProduct, compact = false) => {
    const inCart = cart.find((i) => i.productId === p.id);
    const isOutOfStock = p.stock <= 0;
    const isLowStock = !isOutOfStock && p.stock <= p.min_stock;
    const isFav = favorites.has(p.id);

    return (
      <button
        key={p.id}
        disabled={isOutOfStock}
        onClick={() => {
          if (isOutOfStock) return;
          onAddToCart(p);
          if (isMobile || compact) toast.success(`${p.name} +1`, { duration: 800 });
        }}
        className={`glass-card text-left relative transition-all active:scale-[0.97] group border-primary/10
          ${compact ? 'p-2 rounded-2xl' : isMobile ? 'p-2.5 rounded-2xl' : 'p-3 rounded-2xl'}
          ${inCart ? 'ring-2 ring-primary bg-primary/10' : ''}
          ${isLowStock ? 'ring-2 ring-amber-400/60 animate-pulse-glow' : ''}
          ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}
      >
        {/* In-cart badge */}
        {inCart && (
          <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm z-10">
            {inCart.quantity}
          </span>
        )}

        {/* Favorite toggle */}
        <button
          onClick={(e) => toggleFavorite(e, p.id)}
          className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          title={isFav ? 'ფავორიტებიდან ამოღება' : 'ფავორიტებში დამატება'}
        >
          {isFav
            ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            : <StarOff className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        {/* Product Image */}
        {!compact && (
          <div className="aspect-square w-full bg-primary/5 rounded-xl mb-2 overflow-hidden flex items-center justify-center border border-primary/5 group-hover:border-primary/20 transition-all shadow-inner">
            {p.images && p.images[0] ? (
              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-lg">
                <span className="text-[10px] font-bold text-destructive uppercase">დასრულდა</span>
              </div>
            )}
          </div>
        )}

        <p className={`font-bold text-foreground truncate ${compact ? 'text-xs' : isMobile ? 'text-[11px]' : 'text-sm'}`}>{p.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-primary font-bold ${isMobile || compact ? 'text-sm' : ''}`}>₾{p.sell_price.toFixed(2)}</span>
          <div className="flex items-center gap-1">
            {isLowStock && <AlertTriangle className="h-3 w-3 text-amber-500" />}
            <Badge
              variant={isOutOfStock ? 'destructive' : isLowStock ? 'outline' : 'secondary'}
              className={`text-[9px] px-1 py-0 ${isLowStock ? 'border-amber-500 text-amber-600' : ''}`}
            >
              {p.stock}
            </Badge>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden gap-2">
      {/* ⭐ Favorites strip */}
      {favoriteProducts.length > 0 && (
        <div className="shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> ხშირი პროდუქტები
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {favoriteProducts.map(p => (
              <div key={p.id} className="shrink-0 w-[110px]">
                {renderCard(p, true)}
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-border/40" />
        </div>
      )}

      {/* Main product grid */}
      <ScrollArea className="flex-1">
        <div className={`grid gap-3 p-1 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-4'}`}>
          {products.map((p, idx) => (
            <div key={p.id} className="animate-slide-up" style={{ animationDelay: `${idx * 0.03}s` }}>
              {renderCard(p)}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
