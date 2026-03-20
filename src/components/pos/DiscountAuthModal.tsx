// src/components/pos/DiscountAuthModal.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  BadgeCheck, Ban, ChevronDown, ChevronUp,
  Fingerprint, KeyRound, Loader2,
  Lock, LockOpen, Percent, ShieldAlert, Tag, X,
} from 'lucide-react';
import {
  DiscountRequest,
  DiscountResult,
  DiscountType,
  ApprovedDiscount,
  DISCOUNT_PRESETS,
  computeDiscountAmount,
  needsOverride,
  exceedsHardLimit,
  ROLE_LABELS,
} from '@/types/discount';
import { useDiscountAuthorization } from '@/hooks/useDiscountAuth';
import { toast } from 'sonner';

interface DiscountAuthModalProps {
  cartTotal: number;
  onApply: (result: DiscountResult) => void;
  onClose: () => void;
  productId?: string;
  productName?: string;
}

const DISCOUNT_REASONS = [
  'VIP კურიერი',
  'ფასდაკლების დღე',
  'დაზიანებული შეფუთვა',
  'ბოლო პარტია',
  'სარეკლამო',
  'ლოიალობის ბონუსი',
  'სხვა',
];

export default function DiscountAuthModal({
  cartTotal, onApply, onClose, productId, productName
}: DiscountAuthModalProps) {
  const { authorize, policy, myRole, busy } = useDiscountAuthorization();
  
  const [step, setStep] = useState<'input' | 'pin'>('input');
  const [type, setType] = useState<DiscountType>('percentage');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [showAllReasons, setShowAllReasons] = useState(false);
  const [pin, setPin] = useState('');
  
  const numVal = parseFloat(value) || 0;
  const discAmt = useMemo(() => computeDiscountAmount(type, numVal, cartTotal), [type, numVal, cartTotal]);
  const newTotal = Math.max(0, cartTotal - discAmt);
  
  const selfLimit = type === 'percentage' ? policy?.self_max_pct : policy?.self_max_fixed;
  const hardLimit = type === 'percentage' ? policy?.hard_max_pct : policy?.hard_max_fixed;
  
  const isOverrideRequired = useMemo(() => needsOverride(policy, type, numVal), [policy, type, numVal]);
  const isHardBlocked = useMemo(() => exceedsHardLimit(policy, type, numVal), [policy, type, numVal]);

  const handleSubmitRequest = async () => {
    if (!numVal || isHardBlocked) return;
    
    const request: DiscountRequest = {
      scope: productId ? 'item' : 'cart',
      type,
      value: numVal,
      originalAmount: cartTotal,
      productId,
      productName,
    };

    if (isOverrideRequired) {
      setStep('pin');
    } else {
      const result = await authorize(request);
      if (result.approved) {
        onApply(result);
        onClose();
      }
    }
  };

  const handlePinSubmit = async (overridePin: string) => {
    const request: DiscountRequest = {
      scope: productId ? 'item' : 'cart',
      type,
      value: numVal,
      originalAmount: cartTotal,
      productId,
      productName,
    };

    const result = await authorize(request, overridePin);
    if (result.approved) {
      onApply(result);
      onClose();
    } else if (result.overrideRequired) {
      setPin(''); // Reset on wrong PIN
    }
  };

  const visibleReasons = showAllReasons ? DISCOUNT_REASONS : DISCOUNT_REASONS.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0c0e12] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Tag className="text-amber-400" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">ფასდაკლების მოთხოვნა</h3>
              <p className="text-white/40 text-xs font-medium tabular-nums">
                {productName ? `${productName} · ` : ''}კალათა: ₾{cartTotal.toFixed(2)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X className="text-white/40" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {step === 'input' ? (
            <>
              {/* Role Info */}
              <div className="bg-white/[0.03] rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="text-white/20" size={14} />
                  <span className="text-white/40 text-xs font-medium uppercase tracking-wider">როლი: {ROLE_LABELS[myRole] || myRole}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold tabular-nums">
                  <span className="text-emerald-400">თვით: {selfLimit}{type === 'percentage' ? '%' : '₾'}</span>
                  <span className="text-white/40 font-normal">|</span>
                  <span className="text-white/60">მაქს: {hardLimit}{type === 'percentage' ? '%' : '₾'}</span>
                </div>
              </div>

              {/* Type Selector */}
              <div className="flex p-1 bg-white/5 rounded-2xl gap-1">
                {(['percentage', 'fixed'] as DiscountType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setType(t); setValue(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all
                      ${type === t ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-white/40 hover:text-white/60'}`}
                  >
                    {t === 'percentage' ? <Percent size={14} /> : <Tag size={14} />}
                    {t === 'percentage' ? 'პროცენტი' : 'ფიქსირებული'}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className={`p-6 rounded-3xl border-2 transition-all duration-300
                ${isHardBlocked ? 'bg-rose-500/5 border-rose-500/20 ring-4 ring-rose-500/10' : 
                  isOverrideRequired ? 'bg-amber-500/5 border-amber-500/20 ring-4 ring-amber-500/10' : 
                  'bg-white/[0.02] border-white/5'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-white/20 text-4xl font-black absolute pointer-events-none">
                      {type === 'percentage' ? '%' : '₾'}
                    </span>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-white text-5xl font-black focus:outline-none pl-12 tabular-nums placeholder:text-white/5"
                      autoFocus
                    />
                  </div>
                  {numVal > 0 && !isHardBlocked && (
                    <div className="text-right">
                      <p className="text-xs font-bold text-white/20 uppercase tracking-widest">დაზოგვა</p>
                      <p className="text-2xl font-black text-amber-400 tabular-nums">−₾{discAmt.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {numVal > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                    <span className="text-white/20 text-xs font-bold uppercase tracking-widest">ახალი ჯამი</span>
                    <span className="text-2xl font-black text-white tabular-nums">₾{newTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {numVal > 0 && (
                <div className="flex items-center gap-2">
                  {isHardBlocked ? (
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                      <Ban size={14} /> <span>ლიმიტის გადაჭარბება (Hard Ceiling: {hardLimit}{type === 'percentage' ? '%' : '₾'})</span>
                    </div>
                  ) : isOverrideRequired ? (
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                      <KeyRound size={14} /> <span>მენეჯერის PIN ავტორიზაცია საჭიროა</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <LockOpen size={14} /> <span>PIN-ის გარეშე — ლიმიტის ფარგლებშია</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleSubmitRequest}
                disabled={!numVal || isHardBlocked || busy}
                className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3
                  ${isOverrideRequired 
                    ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-xl shadow-amber-500/20' 
                    : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-xl shadow-emerald-500/20'} 
                  disabled:opacity-20 disabled:grayscale`}
              >
                {busy ? <Loader2 className="animate-spin" /> : isOverrideRequired ? <><Fingerprint size={20} /> PIN-ის მოთხოვნა</> : <><BadgeCheck size={20} /> გამოყენება</>}
              </button>
            </>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
               {/* PIN Pad UI - Simplified for space */}
               <div className="text-center space-y-2">
                 <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto ring-4 ring-amber-500/10">
                   <KeyRound className="text-amber-400" size={32} />
                 </div>
                 <h4 className="text-white font-black text-xl">საჭიროა მენეჯერის PIN</h4>
                 <p className="text-white/40 text-xs font-medium uppercase tracking-widest">ავტორიზაციის დასადასტურებლად</p>
               </div>

               <div className="flex justify-center gap-4">
                 {[...Array(6)].map((_, i) => (
                   <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length ? 'bg-amber-400 scale-125 shadow-lg shadow-amber-400/40' : 'bg-white/10'}`} />
                 ))}
               </div>

               <div className="grid grid-cols-3 gap-3">
                 {[1,2,3,4,5,6,7,8,9,0].map((n) => (
                   <button
                    key={n}
                    onClick={() => {
                      if (pin.length < 6) {
                        const newPin = pin + n;
                        setPin(newPin);
                        if (newPin.length === 6) handlePinSubmit(newPin);
                      }
                    }}
                    className="h-16 rounded-2xl bg-white/5 border border-white/5 text-white font-black text-2xl hover:bg-white/10 active:scale-95 transition-all"
                   >
                     {n}
                   </button>
                 ))}
                 <button
                  onClick={() => setPin(pin.slice(0, -1))}
                  className="col-span-2 h-16 rounded-2xl bg-white/5 text-white/40 font-bold hover:bg-white/10 active:scale-95 transition-all uppercase tracking-widest text-xs"
                 >
                   გასუფთავება
                 </button>
               </div>

               <button
                onClick={() => setStep('input')}
                className="w-full text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
               >
                 უკან დაბრუნება
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
