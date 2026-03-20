// components/HoldOrderPanel.tsx
// Design: industrial ticket board — monospace numbers, perforated
// ticket cards, tactile hold/resume actions. Feels like a deli counter.

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ka }     from 'date-fns/locale'
import {
  Archive, CheckCircle2, ChevronRight, Clock,
  Loader2, Pause, Play, ShoppingCart, Tag,
  Trash2, Users, X,
} from 'lucide-react'
import { useHoldOrders }  from '@/hooks/useHoldOrders'
import { HeldOrder, HoldCartInput, HeldOrderItem } from '@/types/holdOrder'

// ─── Utils ────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const elapsed = (d: string) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 1)  return 'ახლახანს'
  if (mins < 60) return `${mins} წთ`
  return `${Math.floor(mins / 60)} სთ ${mins % 60} წთ`
}

// ─── Ticket card ──────────────────────────────────────────────

function TicketCard({
  order,
  onResume,
  onVoid,
  busy,
}: {
  order:    HeldOrder
  onResume: (o: HeldOrder) => void
  onVoid:   (id: string)   => void
  busy:     boolean
}) {
  const [confirm, setConfirm] = useState(false)
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden
      hover:border-slate-300 transition-colors group">

      {/* Perforated top edge */}
      <div className="h-1 bg-amber-400 w-full" />

      {/* Ticket number badge */}
      <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-slate-900
        flex items-center justify-center">
        <span className="text-white text-sm font-black tabular-nums">
          #{order.hold_number}
        </span>
      </div>

      <div className="p-4 pr-14">
        {/* Label / client */}
        <div className="mb-3">
          {order.label ? (
            <p className="text-base font-black text-slate-900 leading-tight">
              {order.label}
            </p>
          ) : order.client_name ? (
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-slate-400" />
              <p className="text-sm font-bold text-slate-700">{order.client_name}</p>
            </div>
          ) : (
            <p className="text-sm font-bold text-slate-400 italic">სახელი არ არის</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <Clock size={11} className="text-slate-400" />
            <span className="text-xs text-slate-400">{elapsed(order.held_at)}</span>
          </div>
        </div>

        {/* Items summary */}
        <div className="space-y-1 mb-3">
          {order.items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <p className="text-xs text-slate-600 truncate flex-1 pr-2">
                {item.name}
              </p>
              <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
                ×{item.qty}
              </span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-slate-400">
              +{order.items.length - 3} პოზიცია
            </p>
          )}
        </div>

        {/* Discount tag */}
        {order.discount_amount != null && order.discount_amount > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <Tag size={11} className="text-amber-500" />
            <span className="text-xs text-amber-600 font-semibold">
              ფასდ. −₾{fmt(order.discount_amount)}
            </span>
          </div>
        )}

        {/* Total + item count */}
        <div className="flex items-center justify-between pt-3
          border-t border-dashed border-slate-200">
          <span className="text-xs text-slate-400">
            {itemCount} პოზ.
          </span>
          <span className="text-xl font-black text-slate-900 tabular-nums">
            ₾{fmt(order.total)}
          </span>
        </div>
      </div>

      {/* Action bar */}
      {!confirm ? (
        <div className="flex border-t border-slate-100">
          <button
            onClick={() => onResume(order)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-3
              bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold
              transition-colors disabled:opacity-40"
          >
            {busy
              ? <Loader2 size={14} className="animate-spin" />
              : <Play size={14} />}
            გაახლება
          </button>
          <button
            onClick={() => setConfirm(true)}
            className="px-4 border-l border-slate-700 flex items-center justify-center
              bg-slate-900 hover:bg-rose-900 text-slate-400 hover:text-rose-300
              transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : (
        <div className="flex border-t border-slate-100">
          <button
            onClick={() => { onVoid(order.id); setConfirm(false) }}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-3
              bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold
              transition-colors"
          >
            <Trash2 size={14} />
            დადასტ. გაუქმება
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="px-4 border-l border-rose-700 flex items-center justify-center
              bg-rose-600 hover:bg-rose-500 text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Hold modal (naming the order) ───────────────────────────

function HoldModal({
  itemCount,
  total,
  onConfirm,
  onClose,
  busy,
}: {
  itemCount: number
  total:     number
  onConfirm: (label: string, notes: string) => void
  onClose:   () => void
  busy:      boolean
}) {
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl
        shadow-2xl overflow-hidden">

        {/* Header stripe */}
        <div className="h-1.5 bg-amber-400" />

        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Pause size={22} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">შეკვეთის შეჩერება</h2>
              <p className="text-sm text-slate-400">
                {itemCount} პოზ. · ₾{fmt(total)}
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase
                tracking-wider block mb-1.5">
                სახელი / ნომერი (სურვ.)
              </label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="მაგ: მაგიდა 4, ბატონი გიორგი…"
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5
                  text-sm text-slate-800 placeholder-slate-300
                  focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase
                tracking-wider block mb-1.5">
                შენიშვნა (სურვ.)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="კომენტარი…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2
                  text-sm text-slate-800 placeholder-slate-300 resize-none
                  focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-sm
                font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              გაუქმება
            </button>
            <button
              onClick={() => onConfirm(label, notes)}
              disabled={busy}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black
                font-black rounded-xl text-sm transition-colors
                flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {busy
                ? <Loader2 size={15} className="animate-spin" />
                : <Pause size={15} />}
              შეჩერება
            </button>
          </div>
        </div>
      </div>
    </div>
  )
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
  orders:   HeldOrder[]
  loading:  boolean
  busy:     boolean
  onResume: (o: HeldOrder) => void
  onVoid:   (id: string)   => void
  onClose:  () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}>
      <div
        className="w-full max-w-sm bg-slate-50 h-full flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4
          border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Archive size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                შეჩერებული
              </h2>
              <p className="text-xs text-slate-400">
                {orders.length} შეკვეთა
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200
              flex items-center justify-center transition-colors"
          >
            <X size={15} className="text-slate-600" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={22} className="animate-spin text-slate-400" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center
                justify-center mb-4">
                <Archive size={28} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-semibold text-sm">
                შეჩერებული შეკვეთები არ არის
              </p>
              <p className="text-slate-300 text-xs mt-1">
                შეჩერეთ კალათა Hold ღილაკით
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
  )
}

// ─── MAIN EXPORTED COMPONENT ──────────────────────────────────
// Drop this into your POS layout. It manages its own modal/drawer
// state and exposes a compact toolbar button + the full flow.

export interface HoldOrderPanelProps {
  // Current cart to hold
  cartItems:     HeldOrderItem[]
  subtotal:      number
  discountTotal: number
  taxTotal:      number
  total:         number
  clientId?:     string | null
  clientName?:   string | null
  discountAuditId?: string | null
  discountAmount?:  number | null

  // Drawer / session context
  drawerId?: string

  // Callbacks
  onClearCart:  () => void                    // clear POS after hold
  onLoadOrder:  (order: HeldOrder) => void    // restore cart from held order
}

export default function HoldOrderPanel({
  cartItems, subtotal, discountTotal, taxTotal, total,
  clientId, clientName, discountAuditId, discountAmount,
  drawerId,
  onClearCart, onLoadOrder,
}: HoldOrderPanelProps) {
  const { orders, loading, busy, holdCart, resumeOrder, voidOrder } =
    useHoldOrders(drawerId)

  const [showHoldModal,   setShowHoldModal]   = useState(false)
  const [showHeldDrawer,  setShowHeldDrawer]  = useState(false)

  const heldCount = orders.length

  // Hold current cart
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
    })
    if (result) {
      setShowHoldModal(false)
      onClearCart()
    }
  }, [cartItems, subtotal, discountTotal, taxTotal, total,
      clientId, clientName, discountAuditId, discountAmount,
      holdCart, onClearCart])

  // Resume — mark resumed in DB, restore to POS
  const handleResume = useCallback(async (order: HeldOrder) => {
    const updated = await resumeOrder(order.id)
    if (updated) {
      onLoadOrder(updated)
      setShowHeldDrawer(false)
    }
  }, [resumeOrder, onLoadOrder])

  return (
    <>
      {/* ── Toolbar buttons ── */}
      <div className="flex items-center gap-2">

        {/* HOLD current cart */}
        <button
          onClick={() => setShowHoldModal(true)}
          disabled={cartItems.length === 0}
          className="flex items-center gap-2 px-3 py-2 border border-slate-200
            rounded-xl text-slate-600 hover:bg-amber-50 hover:border-amber-300
            hover:text-amber-700 transition-colors disabled:opacity-30 group"
          title="კალათის შეჩერება"
        >
          <Pause size={15} className="group-hover:text-amber-600" />
          <span className="text-sm font-semibold hidden sm:block">Hold</span>
        </button>

        {/* OPEN held list */}
        <button
          onClick={() => setShowHeldDrawer(true)}
          className="relative flex items-center gap-2 px-3 py-2 border border-slate-200
            rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          title="შეჩერებული შეკვეთები"
        >
          <Archive size={15} />
          <span className="text-sm font-semibold hidden sm:block">შეჩერ.</span>
          {heldCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500
              text-white text-[10px] font-black rounded-full flex items-center
              justify-center leading-none">
              {heldCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Hold modal ── */}
      {showHoldModal && (
        <HoldModal
          itemCount={cartItems.reduce((s, i) => s + i.qty, 0)}
          total={total}
          onConfirm={handleHold}
          onClose={() => setShowHoldModal(false)}
          busy={busy}
        />
      )}

      {/* ── Held orders drawer ── */}
      {showHeldDrawer && (
        <HeldOrdersDrawer
          orders={orders}
          loading={loading}
          busy={busy}
          onResume={handleResume}
          onVoid={async (id) => { await voidOrder(id) }}
          onClose={() => setShowHeldDrawer(false)}
        />
      )}
    </>
  )
}
