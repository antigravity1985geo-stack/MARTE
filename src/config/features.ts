export type IndustryType = 'retail' | 'fnb' | 'salon' | 'clinic' | 'pharmacy' | 'auto' | 'other' | 'real_estate' | 'construction' | 'logistics' | 'production';
export type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';

export type FeatureCategory = 'core' | 'finance' | 'inventory' | 'hr' | 'industry' | 'advanced';

export interface FeatureConfig {
  id: string;
  label: string;
  industries: IndustryType[];
  minPlan: PlanType;
  category: FeatureCategory;
}

export const AVAILABLE_FEATURES: FeatureConfig[] = [
  // CORE & CRM
  { id: 'pos', label: 'POS სისტემა', industries: ['retail', 'fnb', 'pharmacy', 'other'], minPlan: 'free', category: 'core' },
  { id: 'crm', label: 'კლიენტები / CRM', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'basic', category: 'core' },
  { id: 'analytics', label: 'ანალიტიკა (BI)', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'pro', category: 'core' },
  
  // FINANCE
  { id: 'sales', label: 'გაყიდვები', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'free', category: 'finance' },
  { id: 'accounting', label: 'ფინანსები / ბუღალტერია', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'pro', category: 'finance' },
  { id: 'rsge', label: 'RS.GE ინტეგრაცია', industries: ['retail', 'fnb', 'pharmacy', 'other', 'logistics'], minPlan: 'basic', category: 'finance' },
  
  // INVENTORY
  { id: 'inventory', label: 'საწყობი / მარაგები', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'free', category: 'inventory' },
  { id: 'purchases', label: 'შესყიდვები', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'other', 'real_estate', 'construction', 'logistics'], minPlan: 'basic', category: 'inventory' },
  { id: 'warehouses', label: 'მრავალი საწყობი', industries: ['retail', 'fnb', 'pharmacy', 'other', 'logistics'], minPlan: 'pro', category: 'inventory' },
  
  // HR
  { 
    id: 'fintech', 
    label: 'Fintech (Banking & Payroll)', 
    industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'logistics', 'construction', 'real_estate'], 
    minPlan: 'pro',
    category: 'finance'
  },
  { id: 'hr', label: 'HR & Payroll', industries: ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'logistics', 'construction', 'real_estate'], minPlan: 'free', category: 'hr' },
  
  // INDUSTRY SPECIFIC
  { id: 'clinic', label: 'კლინიკის მოდული', industries: ['clinic', 'pharmacy'], minPlan: 'free', category: 'industry' },
  { id: 'salon', label: 'სალონი / ჯავშნები', industries: ['salon'], minPlan: 'free', category: 'industry' },
  { id: 'real_estate', label: 'MARTEHOME (Real Estate)', industries: ['real_estate'], minPlan: 'pro', category: 'industry' },
  { id: 'production', label: 'წარმოება', industries: ['fnb', 'retail', 'other', 'construction', 'logistics'], minPlan: 'pro', category: 'industry' },
  { id: 'distribution', label: 'დისტრიბუცია', industries: ['retail', 'fnb', 'logistics', 'production'], minPlan: 'pro', category: 'industry' },
  
  // ADVANCED
  { id: 'ecommerce', label: 'E-Commerce', industries: ['retail', 'other'], minPlan: 'pro', category: 'advanced' },
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
