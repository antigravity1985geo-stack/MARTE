import type { CartItem } from '@/components/pos/POSCart';

export function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateLoyaltyDiscount(cartTotal: number, loyaltyTier?: string | null): number {
  const loyaltyDiscountPct = 
    loyaltyTier === 'platinum' ? 0.10 :
    loyaltyTier === 'gold' ? 0.05 :
    loyaltyTier === 'silver' ? 0.03 : 0;

  return cartTotal * loyaltyDiscountPct;
}

export function calculateFinalTotal(cartTotal: number, loyaltyDiscount: number, couponDiscount: number): number {
  return Math.max(0, cartTotal - loyaltyDiscount - couponDiscount);
}
