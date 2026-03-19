import { describe, it, expect } from 'vitest';
import { calculateCartTotal, calculateLoyaltyDiscount, calculateFinalTotal } from '../posMath';
import type { CartItem } from '@/components/pos/POSCart';

describe('POS Math Calculations', () => {
    const mockCart: CartItem[] = [
        { id: '1', productId: 'p1', name: 'Item 1', price: 10, originalPrice: 10, quantity: 2 },
        { id: '2', productId: 'p2', name: 'Item 2', price: 25.5, originalPrice: 25.5, quantity: 1 },
    ];

    it('should calculate cart total correctly', () => {
        const total = calculateCartTotal(mockCart);
        // (10 * 2) + (25.5 * 1) = 45.5
        expect(total).toBe(45.5);
    });

    it('should calculate loyalty discount correctly for different tiers', () => {
        const cartTotal = 100;

        expect(calculateLoyaltyDiscount(cartTotal, 'platinum')).toBe(10); // 10%
        expect(calculateLoyaltyDiscount(cartTotal, 'gold')).toBe(5);      // 5%
        expect(calculateLoyaltyDiscount(cartTotal, 'silver')).toBe(3);    // 3%
        expect(calculateLoyaltyDiscount(cartTotal, 'none')).toBe(0);      // 0%
        expect(calculateLoyaltyDiscount(cartTotal, null)).toBe(0);        // 0%
    });

    it('should calculate final total correctly and never go below zero', () => {
        // Base case
        expect(calculateFinalTotal(100, 10, 20)).toBe(70);
        
        // Zero bound check
        expect(calculateFinalTotal(100, 50, 60)).toBe(0);
        
        // No discounts
        expect(calculateFinalTotal(100, 0, 0)).toBe(100);
    });
});
