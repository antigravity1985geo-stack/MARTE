import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export interface ReceiptConfig {
  storeName: string;
  storeAddress: string;
  taxId: string;
  phone: string;
  website: string;
  headerText: string;
  footerText: string;
  showLogo: boolean;
  logoUrl?: string;
  showBarcode: boolean;
  showTaxInfo: boolean;
  paperSize: '58mm' | '80mm';
}

const defaultConfig: ReceiptConfig = {
  storeName: 'ჩემი მაღაზია',
  storeAddress: 'თბილისი, რუსთაველის გამზ.',
  taxId: '400000000',
  phone: '+995 555 123 456',
  website: 'www.mystore.ge',
  headerText: 'მადლობა რომ სარგებლობთ ჩვენი მომსახურებით',
  footerText: 'გთხოვთ შეინახოთ ჩეკი',
  showLogo: true,
  logoUrl: '',
  showBarcode: true,
  showTaxInfo: true,
  paperSize: '80mm',
};

export function useReceiptConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const query = useQuery({
    queryKey: ['receipt_config'],
    queryFn: async () => {
      if (!user) return defaultConfig;
      
      const { data, error } = await supabase
        .from('receipt_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return defaultConfig;
      
      return {
        storeName: data.store_name || '',
        storeAddress: data.store_address || '',
        taxId: data.tax_id || '',
        phone: data.phone || '',
        website: data.website || '',
        headerText: data.header_text || '',
        footerText: data.footer_text || '',
        showLogo: data.show_logo ?? false,
        logoUrl: data.logo_url || '',
        showBarcode: data.show_barcode ?? true,
        showTaxInfo: data.show_tax_info ?? true,
        paperSize: data.paper_size || '80mm',
      } as ReceiptConfig;
    },
    enabled: !!user,
  });

  const updateConfig = useMutation({
    mutationFn: async (newConfig: Partial<ReceiptConfig>) => {
      if (!user) return;
      
      // Upsert logic based on existing user config
      const { data: existing } = await supabase
        .from('receipt_configs')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const payload = {
        user_id: user.id,
        store_name: newConfig.storeName,
        store_address: newConfig.storeAddress,
        tax_id: newConfig.taxId,
        phone: newConfig.phone,
        website: newConfig.website,
        header_text: newConfig.headerText,
        footer_text: newConfig.footerText,
        show_logo: newConfig.showLogo,
        logo_url: newConfig.logoUrl,
        show_barcode: newConfig.showBarcode,
        show_tax_info: newConfig.showTaxInfo,
        paper_size: newConfig.paperSize,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        const { error } = await supabase
          .from('receipt_configs')
          .update(payload)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('receipt_configs')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt_config'] });
    },
  });

  return {
    receiptConfig: query.data || defaultConfig,
    isLoading: query.isLoading,
    error: query.error,
    updateConfig,
  };
}
