// src/components/pos/HoldOrderPanel.tsx
import { useState, useCallback } from 'react';
import {
  Archive, BadgeCheck, ChevronRight, Clock,
  Loader2, Pause, Play, ShoppingCart, Tag,
  Trash2, Users, X,
} from 'lucide-react';
import { useHoldOrders } from '@/hooks/useHoldOrders';
import { HeldOrder, HoldCartInput, HeldOrderItem } from '@/types/holdOrder';
import { toast } from 'sonner';

// ─── Utils ────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const elapsed = (d: string) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1)  return 'ახლახანს';
  if (mins < 60) return `${mins} წთ`;
  return `${Math.floor(mins / 60)} სთ ${mins % 60} წთ`;
};

// ─── Ticket card ──────────────────────────────────────────────

function TicketCard({
  order,
  onResume,
  onVoid,
  busy,
}: {
  order:    HeldOrder;
  onResume: (o: HeldOrder) => void;
  onVoid:   (id: string)   => void;
  busy:     boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="relative bg-[#1a1c23] rounded-2xl border border-white/5 overflow-hidden
      hover:border-white/10 transition-colors group shadow-xl">

      {/* Perforated top edge */}
      <div className="h-1 bg-amber-500 w-full" />

      {/* Ticket number badge */}
      <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/5
        flex items-center justify-center border border-white/10">
        <span className="text-white text-sm font-black tabular-nums">
          #{order.hold_number}
        </span>
      </div>

      <div className="p-4 pr-14">
        {/* Label / client */}
        <div className="mb-3">
          {order.label ? (
            <p className="text-base font-black text-white leading-tight">
              {order.label}
            </p>
          ) : order.client_name ? (
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-white/40" />
              <p className="text-sm font-bold text-white/60">{order.client_name}</p>
            </div>
          ) : (
            <p className="text-sm font-bold text-white/20 italic">სახელი არ არის</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <Clock size={11} className="text-white/20" />
            <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">{elapsed(order.held_at)}</span>
          </div>
        </div>

        {/* Items summary */}
        <div className="space-y-1 mb-3">
          {order.items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <p className="text-xs text-white/40 truncate flex-1 pr-2">
                {item.name}
              </p>
              <span className="text-xs text-white/20 tabular-nums flex-shrink-0">
                ×{item.qty}
              </span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-tight">
              +{order.items.length - 3} პოზიცია
            </p>
          )}
        </div>

        {/* Discount tag */}
        {order.discount_amount != null && order.discount_amount > 0 && (
          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-amber-500/5 rounded-lg border border-amber-500/10">
            <Tag size={10} className="text-amber-500" />
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest leading-none">
              ფასდ. −₾{fmt(order.discount_amount)}
            </span>
          </div>
        )}

        {/* Total + item count */}
        <div className="flex items-center justify-between pt-3
          border-t border-dashed border-white/5">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
            {itemCount} პოზ.
          </span>
          <span className="text-xl font-black text-white tabular-nums">
            ₾{fmt(order.total)}
          </span>
        </div>
      </div>

      {/* Action bar */}
      {!confirm ? (
        <div className="flex border-t border-white/5">
          <button
            onClick={() => onResume(order)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-3
              bg-white/5 hover:bg-emerald-500 text-white hover:text-black text-[10px] font-black uppercase tracking-widest
              transition-all disabled:opacity-20"
          >
            {busy
              ? <Loader2 size={14} className="animate-spin" />
              : <Play size={12} fill="currentColor" />}
            გაახლება
          </button>
          <button
            onClick={() => setConfirm(true)}
            className="px-4 border-l border-white/5 flex items-center justify-center
              bg-white/5 hover:bg-rose-500 text-white/20 hover:text-white
              transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ) : (
        <div className="flex border-t border-white/5">
          <button
            onClick={() => { onVoid(order.id); setConfirm(false) }}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-3
              bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-black uppercase tracking-widest
              transition-all"
          >
            <Trash2 size={12} />
            გაუქმება
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="px-4 border-l border-white/5 flex items-center justify-center
              bg-rose-500 hover:bg-rose-600 text-white transition-all"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Hold modal (naming the order) ───────────────────────────

function HoldModal({
  itemCount,
  total,
  onConfirm,
  onClose,
  busy,
}: {
  itemCount: number;
  total:     number;
  onConfirm: (label: string, notes: string) => void;
  onClose:   () => void;
  busy:      boolean;
}) {
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 px-4">
      <div className="w-full max-w-sm bg-[#0c0e12] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header stripe */}
        <div className="h-1 bg-amber-500 w-full" />

        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center ring-4 ring-amber-500/5">
              <Pause size={24} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">შეკვეთის შეჩერება</h2>
              <p className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">
                {itemCount} პოზ. · ₾{fmt(total)}
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">
                სახელი / ნომერი
              </label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="მაგ: მაგიდა 4, ბატონი გიორგი…"
                autoFocus
                className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-3.5
                  text-sm text-white placeholder-white/5
                  focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">
                შენიშვნა
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="კომენტარი…"
                className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-3
                  text-sm text-white placeholder-white/5 resize-none
                  focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 border border-white/5 rounded-2xl text-xs
                font-black text-white/40 hover:bg-white/5 hover:text-white uppercase tracking-widest transition-all"
            >
              გაუქმება
            </button>
            <button
              onClick={() => onConfirm(label, notes)}
              disabled={busy}
              className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-black
                font-black rounded-2xl text-xs uppercase tracking-widest transition-all
                flex items-center justify-center gap-2 shadow-xl shadow-amber-500/10 disabled:opacity-40"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} fill="currentColor" />}
              შეჩერება
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Held orders drawer / panel ───────────────────────────────

function HeldOrdersDrawer({
  orders,
  loading,
  busy,
  onResume,
  onVoid,
  onClose,
}: {
  orders:   HeldOrder[];
  loading:  boolean;
  busy:     boolean;
  onResume: (o: HeldOrder) => void;
  onVoid:   (id: string)   => void;
  onClose:  () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#0c0e12] border-l border-white/5 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-8 pb-6
          border-b border-white/5 bg-black/20 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center ring-4 ring-amber-500/5">
              <Archive size={22} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                შეჩერებული
              </h2>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                {orders.length} შეკვეთა
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10
              flex items-center justify-center transition-all group"
          >
            <X size={18} className="text-white/40 group-hover:text-white" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={32} className="animate-spin text-amber-500" />
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">იტვირთება...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-white/[0.02] rounded-3xl flex items-center
                justify-center mb-6 border border-white/5">
                <Archive size={32} className="text-white/10" />
              </div>
              <p className="text-white/20 font-black text-sm uppercase tracking-widest">
                პარკირებული შეკვეთები არ არის
              </p>
              <p className="text-white/10 text-[10px] font-bold uppercase tracking-widest mt-2 px-8">
                შეჩერეთ კალათა Hold ღილაკით სწრაფი წვდომისთვის
              </p>
            </div>
          ) : (
            orders.map(o => (
              <TicketCard
                key={o.id}
                order={o}
                onResume={onResume}
                onVoid={onVoid}
                busy={busy}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EXPORTED COMPONENT ──────────────────────────────────

export interface HoldOrderPanelProps {
  cartItems:     HeldOrderItem[];
  subtotal:      number;
  discountTotal: number;
  taxTotal:      number;
  total:         number;
  clientId?:     string | null;
  clientName?:   string | null;
  discountAuditId?: string | null;
  discountAmount?:  number | null;
  drawerId?: string;
  onClearCart:  () => void;
  onLoadOrder:  (order: HeldOrder) => void;
}

export default function HoldOrderPanel({
  cartItems, subtotal, discountTotal, taxTotal, total,
  clientId, clientName, discountAuditId, discountAmount,
  drawerId,
  onClearCart, onLoadOrder,
}: HoldOrderPanelProps) {
  const { orders, loading, busy, holdCart, resumeOrder, voidOrder } =
    useHoldOrders(drawerId);

  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showHeldDrawer, setShowHeldDrawer] = useState(false);

  const heldCount = orders.length;

  const handleHold = useCallback(async (label: string, notes: string) => {
    const result = await holdCart({
      items:          cartItems,
      subtotal, discount_total: discountTotal,
      tax_total: taxTotal, total,
      client_id:      clientId    ?? null,
      client_name:    clientName  ?? null,
      discount_audit_id: discountAuditId ?? null,
      discount_amount:   discountAmount  ?? null,
      label:   label || undefined,
      notes:   notes || undefined,
    });
    if (result) {
      setShowHoldModal(false);
      onClearCart();
    }
  }, [cartItems, subtotal, discountTotal, taxTotal, total,
      clientId, clientName, discountAuditId, discountAmount,
      holdCart, onClearCart]);

  const handleResume = useCallback(async (order: HeldOrder) => {
    const updated = await resumeOrder(order.id);
    if (updated) {
      onLoadOrder(updated);
      setShowHeldDrawer(false);
    }
  }, [resumeOrder, onLoadOrder]);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowHoldModal(true)}
          disabled={cartItems.length === 0}
          className="flex items-center gap-3 px-4 py-2.5 bg-foreground/[0.03] border border-foreground/10 rounded-2xl text-foreground/70 hover:bg-foreground/5 hover:border-foreground/20 transition-all disabled:opacity-20 group"
          title="კალათის შეჩერება"
        >
          <Pause size={16} className="group-hover:text-amber-500 transition-colors" />
          <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">Hold</span>
        </button>

        <button
          onClick={() => setShowHeldDrawer(true)}
          className="relative flex items-center gap-3 px-4 py-2.5 bg-foreground/[0.03] border border-foreground/10 rounded-2xl text-foreground/70 hover:bg-foreground/5 hover:border-foreground/20 transition-all group"
          title="შეჩერებული შეკვეთები"
        >
          <Archive size={16} className="group-hover:text-amber-500 transition-colors" />
          <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">პარკი</span>
          {heldCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-amber-500
              text-black text-[10px] font-black rounded-full flex items-center
              justify-center leading-none ring-4 ring-[#0c0e12]">
              {heldCount}
            </span>
          )}
        </button>
      </div>

      {showHoldModal && (
        <HoldModal
          itemCount={cartItems.reduce((s, i) => s + i.qty, 0)}
          total={total}
          onConfirm={handleHold}
          onClose={() => setShowHoldModal(false)}
          busy={busy}
        />
      )}

      {showHeldDrawer && (
        <HeldOrdersDrawer
          orders={orders}
          loading={loading}
          busy={busy}
          onResume={handleResume}
          onVoid={async (id) => { await voidOrder(id); }}
          onClose={() => setShowHeldDrawer(false)}
        />
      )}
    </>
  );
}
