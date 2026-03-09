import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ReceiptConfig {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyTin?: string;
  address?: string;
  phone?: string;
  tin?: string;
  logoUrl?: string;
  footerText?: string;
  footer?: string;
  showQrCode?: boolean;
  showQR?: boolean;
  showSocialLinks?: boolean;
  socialLinks?: { platform: string; url: string }[];
  paperWidth?: 'narrow' | 'wide';
  paperSize?: '58mm' | '80mm';
  fontSize?: 'small' | 'medium' | 'large' | number;
  showDate?: boolean;
  showCashier?: boolean;
  showBarcode?: boolean;
  thankYouMessage?: string;
}

interface ReceiptState {
  config: ReceiptConfig;
  receiptConfig: ReceiptConfig;
  updateConfig: (updates: Partial<ReceiptConfig>) => void;
  resetConfig: () => void;
}

const defaultConfig: ReceiptConfig = {
  companyName: 'ჩემი მაღაზია',
  companyAddress: 'თბილისი, საქართველო',
  companyPhone: '+995 XXX XXX XXX',
  companyTin: '',
  address: 'თბილისი, რუსთაველის გამზ. 1',
  phone: '+995 555 123 456',
  tin: '123456789',
  footerText: 'გმადლობთ შეძენისთვის!',
  footer: 'გმადლობთ შენაძენისთვის!',
  showQrCode: false,
  showQR: true,
  showSocialLinks: false,
  socialLinks: [],
  paperWidth: 'narrow',
  paperSize: '80mm',
  fontSize: 'medium',
  showDate: true,
  showCashier: true,
  showBarcode: true,
  thankYouMessage: 'მადლობა, მოგვიანებით გელოდებით! 🙏',
};

export const useReceiptStore = create<ReceiptState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      get receiptConfig() { return get().config; },
      updateConfig: (updates) => set(state => ({
        config: { ...state.config, ...updates },
      })),
      resetConfig: () => set({ config: defaultConfig }),
    }),
    {
      name: 'receipt-config',
    }
  )
);
