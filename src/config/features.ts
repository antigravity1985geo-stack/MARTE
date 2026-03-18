export type IndustryType = 'retail' | 'fnb' | 'salon' | 'clinic' | 'pharmacy' | 'auto' | 'other' | 'real_estate' | 'construction' | 'logistics' | 'production';
export type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';

export interface FeatureConfig {
  id: string;
  label: string;
  industries: IndustryType[];
  minPlan: PlanType;
}

export const AVAILABLE_FEATURES: FeatureConfig[] = [
  { id: 'pos', label: 'POS სისტემა', industries: ['retail', 'fnb', 'pharmacy', 'other'], minPlan: 'free' },
  { id: 'inventory', label: 'საწყობი / მარაგები', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'free' },
  { id: 'sales', label: 'გაყიდვები', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'free' },
  { id: 'purchases', label: 'შესყიდვები', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'basic' },
  { id: 'crm', label: 'კლიენტები / CRM', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'basic' },
  { id: 'accounting', label: 'ფინანსები / ბუღალტერია', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'pro' },
  { id: 'hr', label: 'HR / ხელფასები', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'basic' },
  { id: 'production', label: 'წარმოება', industries: ['fnb', 'retail', 'other', 'construction', 'logistics'], minPlan: 'pro' },
  { id: 'clinic', label: 'კლინიკა და ჯანდაცვა', industries: ['clinic', 'pharmacy'], minPlan: 'free' },
  { id: 'salon', label: 'სალონი / ჯავშნები', industries: ['salon'], minPlan: 'free' },
  { id: 'real_estate', label: 'უძრავი ქონება', industries: ['real_estate'], minPlan: 'pro' },
  { id: 'analytics', label: 'ანალიტიკა (BI)', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'pro' },
  { id: 'rsge', label: 'RS.GE ინტეგრაცია', industries: ['retail', 'fnb', 'pharmacy', 'other', 'logistics'], minPlan: 'basic' },
  { id: 'distribution', label: 'დისტრიბუცია', industries: ['retail', 'fnb', 'logistics', 'production'], minPlan: 'pro' },
  { id: 'ecommerce', label: 'E-Commerce', industries: ['retail', 'other'], minPlan: 'pro' },
];

/**
 * Returns default features for a given industry
 */
export const getDefaultFeatures = (industry: IndustryType): Record<string, boolean> => {
  const defaults: Record<string, boolean> = {};
  AVAILABLE_FEATURES.forEach(feat => {
    // Enable if industry matches, otherwise disable
    defaults[feat.id] = feat.industries.includes(industry);
  });
  return defaults;
};

/**
 * Checks if a feature should be locked based on the plan
 */
export const isFeatureLocked = (featureId: string, plan: PlanType, isSuperadmin: boolean = false): boolean => {
  if (isSuperadmin) return false;
  
  const feature = AVAILABLE_FEATURES.find(f => f.id === featureId);
  if (!feature) return false;

  const planWeight: Record<PlanType, number> = {
    free: 0,
    basic: 1,
    pro: 2,
    enterprise: 3
  };

  return planWeight[plan] < planWeight[feature.minPlan];
};
