import { SupabasePriceRule } from '@/hooks/usePriceRules';

export interface PricingEngineCartItem {
    productId: string;
    price: number;
    quantity: number;
    categoryId?: string;
}

export interface PricingEngineContext {
    cart: PricingEngineCartItem[];
    rules: SupabasePriceRule[];
    clientId?: string;
    clientLoyaltyTier?: string; // e.g. 'gold'
}

/**
 * Calculates the total discount amount to apply to the cart
 * based on the active dynamic price rules.
 * Rules are evaluated independently and their discounts sum up,
 * except they cannot exceed the cart total.
 */
export function calculateDynamicDiscount(context: PricingEngineContext): number {
    const { cart, rules, clientLoyaltyTier } = context;
    if (!rules || rules.length === 0 || cart.length === 0) return 0;

    let totalDiscount = 0;

    // Sort rules by priority descending
    const sortedRules = [...rules].filter(r => r.active).sort((a, b) => b.priority - a.priority);

    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    for (const rule of sortedRules) {
        if (rule.discount_value <= 0) continue;

        // Check global time validity if valid_from / valid_until exists
        if (rule.valid_from && new Date(rule.valid_from) > now) continue;
        if (rule.valid_until && new Date(rule.valid_until) < now) continue;

        let appliedRuleDiscount = 0;

        switch (rule.type) {
            case 'bulk': {
                const minQty = rule.condition.min_qty || 0;
                const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
                if (totalQty >= minQty && minQty > 0) {
                    const cartTotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                    appliedRuleDiscount = rule.discount_type === 'percentage'
                        ? cartTotal * (rule.discount_value / 100)
                        : rule.discount_value;
                }
                break;
            }

            case 'time_based': {
                const after = rule.condition.after || '00:00';
                const before = rule.condition.before || '23:59';

                if (currentTimeStr >= after && currentTimeStr <= before) {
                    const cartTotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                    appliedRuleDiscount = rule.discount_type === 'percentage'
                        ? cartTotal * (rule.discount_value / 100)
                        : rule.discount_value;
                }
                break;
            }

            case 'category': {
                const targetCategoryId = rule.condition.category_id;
                if (!targetCategoryId) break;

                // Calculate total price only for items in this category
                const categoryTotal = cart
                    .filter(item => item.categoryId === targetCategoryId)
                    .reduce((acc, i) => acc + (i.price * i.quantity), 0);

                if (categoryTotal > 0) {
                    appliedRuleDiscount = rule.discount_type === 'percentage'
                        ? categoryTotal * (rule.discount_value / 100)
                        : rule.discount_value;
                }
                break;
            }

            case 'loyalty_tier': {
                const targetTier = rule.condition.tier;
                if (clientLoyaltyTier && clientLoyaltyTier.toLowerCase() === targetTier?.toLowerCase()) {
                    const cartTotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                    appliedRuleDiscount = rule.discount_type === 'percentage'
                        ? cartTotal * (rule.discount_value / 100)
                        : rule.discount_value;
                }
                break;
            }

            // Note: 'bundle' rules are handled separately by the custom BundleEngine logic
            // directly in POSPage because they subtract specific item combinations
        }

        totalDiscount += appliedRuleDiscount;
    }

    // Make sure discount doesn't exceed cart total
    const absoluteCartTotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    return Math.min(totalDiscount, absoluteCartTotal);
}
