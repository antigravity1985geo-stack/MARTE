// src/components/pos/POSCashDrawerIntegration.tsx
import { AlertTriangle, Landmark } from 'lucide-react';
import { useActiveSession, useSessionTransactions, useSessionSummary } from '@/hooks/useCashDrawer';

export function NoCashDrawerBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
      <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-800">სალარო გახსნილი არ არის</p>
        <p className="text-xs text-amber-600">ნაღდი გადახდა შეზღუდულია</p>
      </div>
      <button
        onClick={onOpen}
        className="text-xs font-bold text-amber-700 border border-amber-300 rounded-lg
          px-3 py-1.5 hover:bg-amber-100 transition-colors whitespace-nowrap">
        გახსნა
      </button>
    </div>
  );
}

interface CashDrawerStatusProps {
  drawerId: string;
  onClick?: () => void;
}

export function CashDrawerStatusWidget({ drawerId, onClick }: CashDrawerStatusProps) {
  const { session } = useActiveSession(drawerId);
  const { transactions } = useSessionTransactions(session?.id ?? null);
  const summary = useSessionSummary(transactions);
  const isOpen = session?.status === 'open';

  const fmt = (n: number) => new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(n);

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
        ${isOpen
          ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
    >
      <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      <Landmark size={14} className={isOpen ? 'text-emerald-700' : 'text-slate-500'} />
      <span className={`text-sm font-bold tabular-nums ${isOpen ? 'text-emerald-800' : 'text-slate-500'}`}>
        {isOpen ? `₾${fmt(summary.expected_cash)}` : 'სალარო დახ.'}
      </span>
    </button>
  );
}

export function useCashPaymentGuard(drawerId: string) {
  const { session } = useActiveSession(drawerId);
  const canAcceptCash = session?.status === 'open';
  return { canAcceptCash, session };
}
