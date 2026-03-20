// src/components/pos/POSDiscountIntegration.tsx
import { Percent, Tag, X } from 'lucide-react';
import { DiscountResult } from '@/types/discount';

interface DiscountButtonProps {
  cartTotal: number;
  activeDiscount?: DiscountResult | null;
  onPress: () => void;
  onRemove: () => void;
}

export function DiscountButton({
  cartTotal, activeDiscount, onPress, onRemove,
}: DiscountButtonProps) {
  if (activeDiscount?.approved) {
    return (
      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2 group animate-in zoom-in-95 duration-200">
        <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Percent size={12} className="text-amber-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest leading-none">ფასდაკლება</span>
          <span className="text-sm font-black text-amber-400 tabular-nums leading-tight">
            −₾{activeDiscount.discountAmount.toFixed(2)}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-2 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onPress}
      disabled={cartTotal <= 0}
      className="flex items-center gap-3 px-5 py-3 bg-foreground/[0.03] border border-foreground/10 rounded-2xl text-foreground/70 hover:bg-foreground/5 hover:border-foreground/20 transition-all disabled:opacity-20 flex-shrink-0 group"
    >
      <Tag size={16} className="group-hover:text-amber-500 transition-colors" />
      <span className="text-sm font-bold">ფასდაკლება</span>
    </button>
  );
}

export function CartDiscountLine({ discount }: { discount: DiscountResult }) {
  if (!discount.approved) return null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Percent size={14} className="text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-none">ფასდაკლება</p>
          {discount.authorizer && (
            <p className="text-[10px] font-medium text-foreground/40 mt-1 flex items-center gap-1 uppercase tracking-tight">
              <BadgeCheck size={10} className="text-emerald-400" />
              დადასტ: {discount.authorizer.name} ({discount.authorizer.role})
            </p>
          )}
          {!discount.authorizer && discount.approved && (
            <p className="text-[10px] font-medium text-blue-400/60 mt-1 uppercase tracking-tight">ავტო-დადასტურება</p>
          )}
        </div>
      </div>
      <span className="text-base font-black text-amber-500 tabular-nums">
        −₾{discount.discountAmount.toFixed(2)}
      </span>
    </div>
  );
}

// Helper for smaller icons
function BadgeCheck({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} height={size} viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 2l3 3m0 0l3-3m-3 3v12m0 0L9 14m3 3l3-3" />
      {/* Fallback for the icon if needed, but let's just use lucide if imported correctly */}
    </svg>
  );
}
