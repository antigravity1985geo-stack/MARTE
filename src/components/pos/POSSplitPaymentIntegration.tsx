// components/pos/POSSplitPaymentIntegration.tsx

import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface POSSplitPaymentIntegrationProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SplitPaymentButton({ onClick, disabled }: POSSplitPaymentIntegrationProps) {
  const { t } = useI18n();
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2 h-9 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 text-amber-600 dark:text-amber-400"
      onClick={onClick}
      disabled={disabled}
    >
      <Layers className="h-4 w-4" />
      <span className="hidden sm:inline">{t('split_payment') || 'გაყოფა'}</span>
    </Button>
  );
}
