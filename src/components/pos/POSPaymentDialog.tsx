import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  DollarSign, SmartphoneNfc, QrCode, Truck, Check, ChevronsUpDown,
  Banknote, CreditCard, Wallet, Gift, Building2,
  Plus, Trash2, Loader2, CheckCircle2, Zap, ArrowRight,
  BadgeCheck, RotateCcw, Receipt, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useSplitPaymentState, useFinalizePayment } from '@/hooks/useSplitPayment';
import {
  PaymentMethod, PaymentLeg, METHOD_META, QUICK_SPLITS, CARD_BRANDS,
  FinalizePaymentResult, CartItemInput,
} from '@/types/splitPayment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const METHOD_ICONS: Record<PaymentMethod, React.ElementType> = {
  cash:          Banknote,
  card:          CreditCard,
  store_credit:  Wallet,
  gift_card:     Gift,
  bank_transfer: Building2,
};

// ─── Split Payment Leg Card ──────────────────────────────────────────────────

function LegCard({
  leg, total, remaining, onRemove, onSetAmount, onSetTendered, onSetCard, onFill, isOnly,
}: {
  leg: PaymentLeg; total: number; remaining: number;
  onRemove: () => void; onSetAmount: (v: number) => void;
  onSetTendered: (v: number) => void; onSetCard: (f: Partial<PaymentLeg>) => void;
  onFill: () => void; isOnly: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = METHOD_META[leg.method];
  const Icon = METHOD_ICONS[leg.method];
  const amtRef = useRef<HTMLInputElement>(null);
  useEffect(() => { amtRef.current?.focus(); }, []);
  const pct = total > 0 ? Math.min(100, (leg.amount / total) * 100) : 0;

  return (
    <div className={cn(
      'rounded-2xl border-2 overflow-hidden transition-all',
      leg.method === 'cash' ? 'border-emerald-500/40 bg-emerald-950/20' :
      leg.method === 'card' ? 'border-blue-500/40 bg-blue-950/20' :
                              'border-slate-600/40 bg-slate-800/20'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
          leg.method === 'cash' ? 'bg-emerald-500/20' :
          leg.method === 'card' ? 'bg-blue-500/20' : 'bg-slate-600/20'
        )}>
          <Icon size={16} className={
            leg.method === 'cash' ? 'text-emerald-500' :
            leg.method === 'card' ? 'text-blue-500' : 'text-slate-400'
          } />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{meta.label}</p>
          <div className="h-1 bg-muted rounded-full mt-1 w-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                leg.method === 'cash' ? 'bg-emerald-500' :
                leg.method === 'card' ? 'bg-blue-500' : 'bg-slate-400'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {remaining > 0.005 && (
          <button
            onClick={onFill}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors whitespace-nowrap"
          >
            +₾{fmt(remaining)}
          </button>
        )}
        {!isOnly && (
          <button onClick={onRemove}
            className="w-7 h-7 rounded-lg bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors group">
            <Trash2 size={12} className="text-muted-foreground group-hover:text-destructive" />
          </button>
        )}
      </div>

      {/* Amount input */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-base font-black',
            leg.method === 'cash' ? 'text-emerald-500' :
            leg.method === 'card' ? 'text-blue-500' : 'text-muted-foreground'
          )}>₾</span>
          <input
            ref={amtRef}
            type="number" min="0" step="0.01"
            value={leg.amount || ''}
            onChange={e => onSetAmount(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-2xl font-black focus:outline-none placeholder-muted-foreground/30 w-0 tabular-nums"
          />
          <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Cash: tendered & change */}
      {leg.method === 'cash' && (
        <div className="border-t border-emerald-500/10 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground w-24 flex-shrink-0">მომხ. გადასცა</label>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-emerald-500 text-sm">₾</span>
              <input
                type="number" min={leg.amount} step="1"
                value={leg.cash_tendered || ''}
                onChange={e => onSetTendered(parseFloat(e.target.value) || 0)}
                placeholder={fmt(leg.amount)}
                className="bg-transparent text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none tabular-nums w-full placeholder-muted-foreground/30"
              />
            </div>
            <div className="flex gap-1">
              {[Math.ceil(leg.amount / 10) * 10, Math.ceil(leg.amount / 50) * 50, Math.ceil(leg.amount / 100) * 100]
                .filter((v, i, a) => a.indexOf(v) === i && v >= leg.amount && v !== leg.amount)
                .slice(0, 2)
                .map(v => (
                  <button key={v} onClick={() => onSetTendered(v)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors tabular-nums">
                    ₾{v}
                  </button>
                ))}
            </div>
          </div>
          {(leg.cash_change ?? 0) > 0 && (
            <div className="flex items-center gap-2 bg-emerald-500/10 rounded-xl px-3 py-2">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">ხურდა</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-300 tabular-nums ml-auto">
                ₾{fmt(leg.cash_change ?? 0)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card: optional details */}
      {leg.method === 'card' && (
        <div className="border-t border-blue-500/10 px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            ბარათის დეტალები
          </button>
          {expanded && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">ბოლო 4 ციფრი</label>
                <input maxLength={4} value={leg.card_last4 || ''}
                  onChange={e => onSetCard({ card_last4: e.target.value })}
                  placeholder="****"
                  className="w-full border border-input rounded-lg px-2 py-1.5 text-sm font-mono bg-background focus:outline-none focus:ring-1 focus:ring-ring mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">ბრენდი</label>
                <select value={leg.card_brand || ''}
                  onChange={e => onSetCard({ card_brand: e.target.value })}
                  className="w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring mt-0.5">
                  <option value="">—</option>
                  {CARD_BRANDS.map(b => <option key={b} value={b.toLowerCase()}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Authorization</label>
                <input value={leg.approval_code || ''}
                  onChange={e => onSetCard({ approval_code: e.target.value })}
                  placeholder="123456"
                  className="w-full border border-input rounded-lg px-2 py-1.5 text-sm font-mono bg-background focus:outline-none focus:ring-1 focus:ring-ring mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Terminal Ref</label>
                <input value={leg.terminal_ref || ''}
                  onChange={e => onSetCard({ terminal_ref: e.target.value })}
                  placeholder="TRM-001"
                  className="w-full border border-input rounded-lg px-2 py-1.5 text-sm font-mono bg-background focus:outline-none focus:ring-1 focus:ring-ring mt-0.5" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Split Done Screen ────────────────────────────────────────────────────────

function SplitDoneScreen({
  result, rsgeStatus, onNewSale,
}: {
  result: FinalizePaymentResult;
  rsgeStatus: 'pending' | 'sent' | 'failed';
  onNewSale: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 space-y-5 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center ring-4 ring-emerald-500/20">
        <CheckCircle2 size={34} className="text-emerald-500" />
      </div>
      <div>
        <p className="text-muted-foreground text-sm mb-1">გაყიდვა დასრულდა</p>
        <p className="font-bold text-lg">{result.receipt_number}</p>
        <p className="text-4xl font-black tabular-nums mt-1">₾{fmt(result.total)}</p>
      </div>
      <div className="w-full space-y-2 max-w-xs">
        {result.cash_amount > 0 && (
          <div className="flex justify-between items-center bg-emerald-500/10 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Banknote size={14} /><span className="text-sm font-semibold">ნაღდი</span>
            </div>
            <span className="font-black tabular-nums text-emerald-600 dark:text-emerald-400">₾{fmt(result.cash_amount)}</span>
          </div>
        )}
        {result.card_amount > 0 && (
          <div className="flex justify-between items-center bg-blue-500/10 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <CreditCard size={14} /><span className="text-sm font-semibold">ბარათი</span>
            </div>
            <span className="font-black tabular-nums text-blue-600 dark:text-blue-400">₾{fmt(result.card_amount)}</span>
          </div>
        )}
        {result.cash_change > 0 && (
          <div className="flex justify-between items-center bg-muted rounded-xl px-4 py-2.5">
            <span className="text-muted-foreground text-sm font-semibold">ხურდა</span>
            <span className="font-black tabular-nums text-xl">₾{fmt(result.cash_change)}</span>
          </div>
        )}
      </div>
      <div className={cn(
        'w-full max-w-xs rounded-xl px-4 py-2.5 flex items-center gap-2 justify-center text-sm font-semibold',
        rsgeStatus === 'sent'   ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
        rsgeStatus === 'failed' ? 'bg-destructive/10 text-destructive' :
                                  'bg-muted text-muted-foreground'
      )}>
        {rsgeStatus === 'sent'    ? <><BadgeCheck size={14} /> RS.GE ფისკ. ჩეკი გაგზავნილია</> :
         rsgeStatus === 'failed'  ? <><RotateCcw size={14} /> RS.GE გაგზავნა ვერ მოხერხდა</> :
                                    <><Loader2 size={14} className="animate-spin" /> RS.GE-ზე გაგზავნა...</>}
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-input rounded-xl text-sm font-semibold hover:bg-accent transition-colors">
          <Receipt size={14} /> ბეჭდვა
        </button>
        <button onClick={onNewSale}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 rounded-xl text-white text-sm font-bold hover:bg-emerald-500 transition-colors">
          <ArrowRight size={14} /> შემდეგი
        </button>
      </div>
    </div>
  );
}

// ─── Split Tab Content ────────────────────────────────────────────────────────

function SplitTabContent({
  total, cartItems, totals, clientId, clientName, onSuccess, canAcceptCash,
}: {
  total: number;
  cartItems: CartItemInput[];
  totals: { subtotal: number; discountTotal: number; taxTotal: number; total: number };
  clientId?: string;
  clientName?: string;
  onSuccess: (result: FinalizePaymentResult) => void;
  canAcceptCash: boolean;
}) {
  const sp = useSplitPaymentState(total);
  const { finalize, busy } = useFinalizePayment();
  const [done, setDone] = useState(false);
  const [doneResult, setDoneResult] = useState<FinalizePaymentResult | null>(null);
  const [rsgeStatus, setRsgeStatus] = useState<'pending' | 'sent' | 'failed'>('pending');

  const METHODS: PaymentMethod[] = ['cash', 'card', 'store_credit', 'gift_card', 'bank_transfer'];
  const availableMethods = METHODS.filter(m => !(m === 'cash' && !canAcceptCash));

  const handleFinalize = async () => {
    if (!sp.isBalanced) {
      toast.error(`გადაუხდელი: ₾${fmt(sp.remaining)}`);
      return;
    }
    const result = await finalize(sp.legs, cartItems, totals, { clientId, clientName });
    if (!result) return;
    setDoneResult(result);
    setDone(true);
    onSuccess(result);
    // Fire RS.GE async after success
    supabase.functions
      .invoke('rsge-split-invoice', { body: { transaction_id: result.transaction_id } })
      .then(({ data, error }) => setRsgeStatus(!error && data?.success ? 'sent' : 'failed'))
      .catch(() => setRsgeStatus('failed'));
  };

  if (done && doneResult) {
    return <SplitDoneScreen result={doneResult} rsgeStatus={rsgeStatus} onNewSale={onSuccess.bind(null, doneResult)} />;
  }

  return (
    <div className="space-y-4">
      {/* Total bar */}
      <div className="rounded-2xl bg-muted/50 border px-4 py-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-muted-foreground text-xs uppercase tracking-widest">სულ</span>
          <span className="text-2xl font-black tabular-nums">₾{fmt(total)}</span>
        </div>
        {sp.legs.length > 0 && (
          <>
            <div className="h-2 bg-muted rounded-full overflow-hidden flex gap-0.5">
              {sp.legs.map(l => (
                <div
                  key={l.id}
                  className={cn(
                    'h-full transition-all duration-300 rounded-full',
                    l.method === 'cash' ? 'bg-emerald-500' :
                    l.method === 'card' ? 'bg-blue-500' : 'bg-slate-400'
                  )}
                  style={{ width: `${Math.min(100, (l.amount / total) * 100)}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-muted-foreground tabular-nums">
                გადახდილია ₾{fmt(sp.allocated)}
              </span>
              <span className={cn(
                'text-xs font-bold tabular-nums',
                sp.isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              )}>
                {sp.isBalanced ? '✓ სრული' : `რჩება ₾${fmt(sp.remaining)}`}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Quick split presets */}
      {sp.legs.length === 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-2">სწრაფი გაყოფა</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SPLITS.map(qs => (
              <button key={qs.label}
                onClick={() => sp.applyQuickSplit(qs.cash, qs.card)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted border border-input hover:bg-accent transition-colors">
                <Zap size={11} className="text-amber-500" />
                <span className="text-xs font-bold">{qs.label}</span>
                <span className="text-[10px] text-muted-foreground">ნაღდი/ბარათი</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leg cards */}
      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
        {sp.legs.map(leg => (
          <LegCard
            key={leg.id}
            leg={leg}
            total={total}
            remaining={sp.remaining}
            isOnly={sp.legs.length === 1}
            onRemove={() => sp.removeLeg(leg.id)}
            onSetAmount={v => sp.setAmount(leg.id, v)}
            onSetTendered={v => sp.setCashTendered(leg.id, v)}
            onSetCard={f => sp.setCardDetails(leg.id, f)}
            onFill={() => sp.fillRemaining(leg.id)}
          />
        ))}

        {/* Add method buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {availableMethods.map(m => {
            const Icon = METHOD_ICONS[m];
            const already = sp.legs.some(l => l.method === m);
            return (
              <button key={m} onClick={() => sp.addLeg(m)} disabled={already}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-30',
                  already ? 'bg-muted border-input text-muted-foreground'
                           : 'bg-background border-input text-foreground hover:bg-accent'
                )}>
                <Plus size={10} />
                <Icon size={12} />
                {METHOD_META[m].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirm button */}
      <button
        onClick={handleFinalize}
        disabled={busy || !sp.isBalanced || sp.legs.length === 0}
        className={cn(
          'w-full py-3.5 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3',
          sp.isBalanced && sp.legs.length > 0
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}>
        {busy ? (
          <><Loader2 size={18} className="animate-spin" /> მუშავდება...</>
        ) : sp.isBalanced ? (
          <><CheckCircle2 size={18} /> გადახდის დადასტურება · ₾{fmt(total)}</>
        ) : (
          <>გადაუხდელია ₾{fmt(sp.remaining)}</>
        )}
      </button>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  tin?: string;
}

type MainPaymentMethod = 'cash' | 'card' | 'combined' | 'bog_qr' | 'tbc_pay' | 'keepz' | 'bnpl' | 'split';

interface POSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalTotal: number;
  paymentMethod: MainPaymentMethod;
  onPaymentMethodChange: (method: MainPaymentMethod) => void;
  cashAmount: string;
  onCashAmountChange: (val: string) => void;
  cardAmount: string;
  onCardAmountChange: (val: string) => void;
  couponCode: string;
  onCouponCodeChange: (val: string) => void;
  couponDiscount: number;
  onCouponValidate: () => void;
  selectedClient: string;
  onSelectedClientChange: (val: string) => void;
  clients: Client[];
  onPayment: () => void;
  isPending: boolean;
  change: number;
  loyaltyDiscount?: number;
  pointsToEarn?: number;
  selectedClientData?: any;
  createWaybill: boolean;
  onCreateWaybillChange: (val: boolean) => void;
  tipAmount?: string;
  onTipAmountChange?: (val: string) => void;
  canAcceptCash?: boolean;
  // Split payment props
  cartItems?: CartItemInput[];
  splitTotals?: { subtotal: number; discountTotal: number; taxTotal: number; total: number };
  onSplitSuccess?: (result: FinalizePaymentResult) => void;
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function POSPaymentDialog({
  open, onOpenChange, finalTotal,
  paymentMethod, onPaymentMethodChange,
  cashAmount, onCashAmountChange,
  cardAmount, onCardAmountChange,
  couponCode, onCouponCodeChange, couponDiscount, onCouponValidate,
  selectedClient, onSelectedClientChange, clients,
  onPayment, isPending, change,
  loyaltyDiscount = 0, pointsToEarn = 0,
  selectedClientData,
  createWaybill, onCreateWaybillChange,
  tipAmount = '', onTipAmountChange,
  canAcceptCash = true,
  cartItems = [],
  splitTotals,
  onSplitSuccess,
}: POSPaymentDialogProps) {
  const [openClientPopover, setOpenClientPopover] = useState(false);

  const effectiveSplitTotals = splitTotals ?? {
    subtotal: finalTotal,
    discountTotal: 0,
    taxTotal: parseFloat((finalTotal * 0.1525).toFixed(2)),
    total: finalTotal,
  };

  const selectedClientObj = clients.find(c => c.id === selectedClient);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>გადახდა — ₾{finalTotal.toFixed(2)}</DialogTitle>
        </DialogHeader>

        {/* Loyalty banner */}
        {selectedClientData && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                ლოიალობა: {selectedClientData.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase',
                  selectedClientData.loyalty_tier === 'platinum' ? 'bg-purple-500 text-white' :
                  selectedClientData.loyalty_tier === 'gold'     ? 'bg-yellow-500 text-black' :
                  selectedClientData.loyalty_tier === 'silver'   ? 'bg-slate-300 text-black' :
                                                                    'bg-orange-700 text-white'
                )}>
                  {selectedClientData.loyalty_tier || 'bronze'}
                </span>
                <span className="text-xs font-semibold">{selectedClientData.loyalty_points || 0} ქულა</span>
              </div>
            </div>
            {pointsToEarn > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">დაირიცხება</p>
                <p className="text-sm font-bold text-primary">+{pointsToEarn} ქულა</p>
              </div>
            )}
          </div>
        )}

        {/* Payment method tabs */}
        <Tabs value={paymentMethod} onValueChange={v => onPaymentMethodChange(v as MainPaymentMethod)}>
          <TabsList className="grid grid-cols-4 w-full h-auto flex-wrap mb-4 gap-1">
            <TabsTrigger value="cash" disabled={!canAcceptCash}>
              ნაღდი {!canAcceptCash && '🔒'}
            </TabsTrigger>
            <TabsTrigger value="card">ბარათი</TabsTrigger>
            <TabsTrigger value="combined" disabled={!canAcceptCash}>
              შერეული {!canAcceptCash && '🔒'}
            </TabsTrigger>
            <TabsTrigger value="split" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              ⚡ გაყოფილი
            </TabsTrigger>
            <TabsTrigger value="bog_qr" className="bg-[#FF6A00]/10 text-[#FF6A00] data-[state=active]:bg-[#FF6A00] data-[state=active]:text-white">
              BOG QR
            </TabsTrigger>
            <TabsTrigger value="tbc_pay" className="bg-[#00A3E0]/10 text-[#00A3E0] data-[state=active]:bg-[#00A3E0] data-[state=active]:text-white">
              TBC Pay
            </TabsTrigger>
            <TabsTrigger value="keepz">Keepz</TabsTrigger>
            <TabsTrigger value="bnpl" className="col-span-1">განვადება</TabsTrigger>
          </TabsList>

          {/* ── Cash ── */}
          <TabsContent value="cash" className="space-y-3 mt-2">
            <div className="space-y-2">
              <Label>მიღებული თანხა</Label>
              <Input type="number" value={cashAmount}
                onChange={e => onCashAmountChange(e.target.value)} placeholder="0.00" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onCashAmountChange(finalTotal.toFixed(2))}>
                ზუსტი ₾{finalTotal.toFixed(2)}
              </Button>
              {[5, 10, 20, 50, 100, 200].filter(d => d >= finalTotal).map(d => (
                <Button key={d} size="sm" variant="outline" onClick={() => onCashAmountChange(String(d))}>
                  ₾{d}
                </Button>
              ))}
            </div>
            {parseFloat(cashAmount) > 0 && (
              <div className="flex justify-between p-3 rounded-lg bg-emerald-500/10">
                <span>ხურდა:</span>
                <span className="font-bold text-emerald-600">₾{change.toFixed(2)}</span>
              </div>
            )}
          </TabsContent>

          {/* ── Card ── */}
          <TabsContent value="card" className="mt-2">
            <p className="text-sm text-muted-foreground text-center py-4">
              ბარათით გადახდა — ₾{finalTotal.toFixed(2)}
            </p>
          </TabsContent>

          {/* ── Combined ── */}
          <TabsContent value="combined" className="space-y-3 mt-2">
            <div className="space-y-2"><Label>ნაღდი</Label>
              <Input type="number" value={cashAmount} onChange={e => onCashAmountChange(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2"><Label>ბარათი</Label>
              <Input type="number" value={cardAmount} onChange={e => onCardAmountChange(e.target.value)} placeholder="0.00" />
            </div>
          </TabsContent>

          {/* ── Split ── */}
          <TabsContent value="split" className="mt-2">
            <SplitTabContent
              total={finalTotal}
              cartItems={cartItems}
              totals={effectiveSplitTotals}
              clientId={selectedClient || undefined}
              clientName={selectedClientObj?.name}
              onSuccess={result => {
                onSplitSuccess?.(result);
                onOpenChange(false);
              }}
              canAcceptCash={canAcceptCash}
            />
          </TabsContent>

          {/* ── BOG QR ── */}
          <TabsContent value="bog_qr" className="mt-2 text-center py-6 animate-in fade-in">
            <div className="mx-auto bg-white p-3 rounded-xl border-2 border-[#FF6A00]/20 inline-block mb-4 shadow-sm">
              <QRCodeSVG value={`bog-qr://payment?amount=${finalTotal}&merchant=MARTE`} size={140} fgColor="#FF6A00" />
            </div>
            <p className="text-sm font-bold flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4 text-[#FF6A00]" /> საქართველოს ბანკი
            </p>
            <p className="text-xs text-muted-foreground mt-1">დაასკანერეთ მობილბანკით გადასახდელად</p>
          </TabsContent>

          {/* ── TBC Pay ── */}
          <TabsContent value="tbc_pay" className="mt-2 text-center py-6 animate-in fade-in">
            <div className="mx-auto bg-white p-3 rounded-xl border-2 border-[#00A3E0]/20 inline-block mb-4 shadow-sm">
              <QRCodeSVG value={`tbc-pay://payment?amount=${finalTotal}&merchant=MARTE`} size={140} fgColor="#00A3E0" />
            </div>
            <p className="text-sm font-bold flex items-center justify-center gap-2">
              <SmartphoneNfc className="w-4 h-4 text-[#00A3E0]" /> TBC Digital
            </p>
            <p className="text-xs text-muted-foreground mt-1">შეეხეთ ან დაასკანერეთ TBC Pay-ით</p>
          </TabsContent>

          {/* ── Keepz ── */}
          <TabsContent value="keepz" className="mt-2 text-center py-6">
            <div className="mx-auto p-4 bg-purple-50 rounded-xl border border-purple-100 mb-4 inline-block">
              <span className="text-purple-600 font-bold text-lg">Keepz / ტიპი</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">ციფრული tip-ის და ანგარიშსწორების სისტემა</p>
          </TabsContent>

          {/* ── BNPL ── */}
          <TabsContent value="bnpl" className="mt-2 text-center py-6">
            <div className="mx-auto flex gap-4 justify-center mb-4">
              <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">Space Buy Now</div>
              <div className="p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">Credo განვადება</div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">ნაწილ-ნაწილ გადახდის მეთოდი</p>
          </TabsContent>
        </Tabs>

        {/* Coupon + Tip (hidden on split tab) */}
        {paymentMethod !== 'split' && (
          <>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">კუპონი</Label>
                <div className="flex gap-2">
                  <Input placeholder="კოდი" value={couponCode}
                    onChange={e => onCouponCodeChange(e.target.value)} className="h-9" />
                  <Button variant="outline" className="h-9 px-3" onClick={onCouponValidate}>ოკ</Button>
                </div>
              </div>
              {onTipAmountChange && (
                <div className="w-[100px] space-y-1">
                  <Label className="text-xs">Tip (₾)</Label>
                  <Input type="number" placeholder="0.00" value={tipAmount}
                    onChange={e => onTipAmountChange(e.target.value)} className="h-9" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              {couponDiscount > 0 && (
                <p className="text-sm text-emerald-600 flex justify-between">
                  <span>კუპონის ფასდაკლება:</span><span>-₾{couponDiscount.toFixed(2)}</span>
                </p>
              )}
              {loyaltyDiscount > 0 && (
                <p className="text-sm text-primary flex justify-between font-medium">
                  <span>ლოიალობის ფასდ. ({selectedClientData?.loyalty_tier}):</span>
                  <span>-₾{loyaltyDiscount.toFixed(2)}</span>
                </p>
              )}
            </div>

            {/* Client search */}
            <div className="space-y-1">
              <Label className="text-xs">კლიენტის ძიება</Label>
              <Popover open={openClientPopover} onOpenChange={setOpenClientPopover}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openClientPopover}
                    className="w-full justify-between h-10 font-normal">
                    {selectedClient
                      ? clients.find(c => c.id === selectedClient)?.name
                      : 'აირჩიეთ კლიენტი (არასავალდებულო)'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="ძიება სახელით ან ნომრით..." className="h-9" />
                    <CommandEmpty>კლიენტი ვერ მოიძებნა.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-y-auto">
                      <CommandItem value="none" onSelect={() => { onSelectedClientChange(''); setOpenClientPopover(false); }}>
                        <Check className={cn('mr-2 h-4 w-4', selectedClient === '' ? 'opacity-100' : 'opacity-0')} />
                        -- კლიენტის გარეშე --
                      </CommandItem>
                      {clients.map(c => (
                        <CommandItem key={c.id} value={`${c.name} ${c.tin || ''}`}
                          onSelect={() => { onSelectedClientChange(c.id); setOpenClientPopover(false); }}>
                          <Check className={cn('mr-2 h-4 w-4', selectedClient === c.id ? 'opacity-100' : 'opacity-0')} />
                          {c.name} {c.tin && <span className="text-muted-foreground ml-1 text-xs">({c.tin})</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Waybill toggle */}
            {selectedClientData?.tin && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">RS.GE ზედნადების შექმნა</p>
                    <p className="text-[10px] text-muted-foreground">TIN: {selectedClientData.tin}</p>
                  </div>
                </div>
                <Switch checked={createWaybill} onCheckedChange={onCreateWaybillChange} />
              </div>
            )}

            {/* Footer pay button (hidden on split tab) */}
            <DialogFooter>
              <Button
                className="w-full"
                onClick={onPayment}
                disabled={isPending || ((paymentMethod === 'cash' || paymentMethod === 'combined') && !canAcceptCash)}
              >
                <DollarSign className="mr-2 h-4 w-4" /> გადახდა ₾{finalTotal.toFixed(2)}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
