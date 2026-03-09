import { create } from 'zustand';

export type PriceTier = 'retail' | 'wholesale' | 'vip';

export interface PriceRule {
  id: string;
  productId: string;
  productName: string;
  tier: PriceTier;
  price: number;
  minQuantity: number;
}

export interface LoyaltyMember {
  id: string;
  clientId: string;
  clientName: string;
  points: number;
  tier: PriceTier;
  totalSpent: number;
  joinDate: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minPurchase: number;
  expiresAt: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

interface PricingState {
  priceRules: PriceRule[];
  loyaltyMembers: LoyaltyMember[];
  coupons: Coupon[];

  addPriceRule: (r: Omit<PriceRule, 'id'>) => void;
  updatePriceRule: (id: string, data: Partial<PriceRule>) => void;
  deletePriceRule: (id: string) => void;

  addLoyaltyMember: (m: Omit<LoyaltyMember, 'id'>) => void;
  addPoints: (clientId: string, points: number, spent: number) => void;
  redeemPoints: (clientId: string, points: number) => boolean;
  updateMemberTier: (clientId: string, tier: PriceTier) => void;

  addCoupon: (c: Omit<Coupon, 'id' | 'usedCount'>) => void;
  useCoupon: (code: string, purchaseTotal: number) => { valid: boolean; discount: number; coupon?: Coupon };
  deleteCoupon: (id: string) => void;
  getClientPrice: (productId: string, clientId: string, basePrice: number, quantity: number) => number;
}

const genId = () => Math.random().toString(36).slice(2, 10);

export const TIER_LABELS: Record<PriceTier, string> = {
  retail: 'საცალო',
  wholesale: 'საბითუმო',
  vip: 'VIP',
};

export const usePricingStore = create<PricingState>((set, get) => ({
  priceRules: [],
  loyaltyMembers: [],
  coupons: [],

  addPriceRule: (r) => set((s) => ({ priceRules: [...s.priceRules, { ...r, id: genId() }] })),
  updatePriceRule: (id, data) => set((s) => ({ priceRules: s.priceRules.map((r) => (r.id === id ? { ...r, ...data } : r)) })),
  deletePriceRule: (id) => set((s) => ({ priceRules: s.priceRules.filter((r) => r.id !== id) })),

  addLoyaltyMember: (m) => set((s) => ({ loyaltyMembers: [...s.loyaltyMembers, { ...m, id: genId() }] })),
  addPoints: (clientId, points, spent) => set((s) => ({
    loyaltyMembers: s.loyaltyMembers.map((m) =>
      m.clientId === clientId ? { ...m, points: m.points + points, totalSpent: m.totalSpent + spent } : m
    ),
  })),
  redeemPoints: (clientId, points) => {
    const member = get().loyaltyMembers.find((m) => m.clientId === clientId);
    if (!member || member.points < points) return false;
    set((s) => ({
      loyaltyMembers: s.loyaltyMembers.map((m) =>
        m.clientId === clientId ? { ...m, points: m.points - points } : m
      ),
    }));
    return true;
  },
  updateMemberTier: (clientId, tier) => set((s) => ({
    loyaltyMembers: s.loyaltyMembers.map((m) => (m.clientId === clientId ? { ...m, tier } : m)),
  })),

  addCoupon: (c) => set((s) => ({ coupons: [...s.coupons, { ...c, id: genId(), usedCount: 0 }] })),
  useCoupon: (code, purchaseTotal) => {
    const coupon = get().coupons.find((c) => c.code === code && c.isActive);
    if (!coupon || new Date(coupon.expiresAt) < new Date() || coupon.usedCount >= coupon.usageLimit || purchaseTotal < coupon.minPurchase) {
      return { valid: false, discount: 0 };
    }
    const discount = coupon.discountType === 'percent'
      ? Math.round(purchaseTotal * coupon.discountValue / 100)
      : coupon.discountValue;
    set((s) => ({
      coupons: s.coupons.map((c) => (c.id === coupon.id ? { ...c, usedCount: c.usedCount + 1 } : c)),
    }));
    return { valid: true, discount, coupon };
  },
  deleteCoupon: (id) => set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) })),

  getClientPrice: (productId, clientId, basePrice, quantity) => {
    const member = get().loyaltyMembers.find((m) => m.clientId === clientId);
    if (!member) return basePrice;
    const rules = get().priceRules
      .filter((r) => r.productId === productId && r.tier === member.tier && quantity >= r.minQuantity)
      .sort((a, b) => a.price - b.price);
    return rules.length > 0 ? rules[0].price : basePrice;
  },
}));
