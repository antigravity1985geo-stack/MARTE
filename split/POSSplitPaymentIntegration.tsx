// components/POSSplitPaymentIntegration.tsx
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HOW TO REPLACE YOUR EXISTING POS CHECKOUT WITH
//  THE NEW SPLIT PAYMENT MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// BEFORE (old single-method checkout):
//   <button onClick={handleCashPayment}>ნაღდი</button>
//   <button onClick={handleCardPayment}>ბარათი</button>
//
// AFTER (unified modal handles everything):
//   <CheckoutButton onPress={() => setShowPayment(true)} total={cartTotal} />
//   {showPayment && <SplitPaymentModal ... onSuccess={handleSuccess} />}
//
// The modal internally:
//   • Manages payment legs (add/remove/edit)
//   • Calls finalize_split_payment() RPC atomically
//   • Hooks into cash drawer automatically
//   • Fires RS.GE invoice async after success

import { useState } from 'react'
import { ShoppingCart, CreditCard, CheckCircle2 } from 'lucide-react'
import SplitPaymentModal from './SplitPaymentModal'
import { CartItemInput, FinalizePaymentResult } from '@/types/splitPayment'

// ─── Checkout button (drop-in for POS) ──────────────────────

interface CheckoutButtonProps {
  total:       number
  itemCount:   number
  disabled?:   boolean
  onPress:     () => void
}

export function CheckoutButton({
  total, itemCount, disabled, onPress
}: CheckoutButtonProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2 }).format(n)

  return (
    <button
      onClick={onPress}
      disabled={disabled || total <= 0}
      className="w-full flex items-center justify-between px-5 py-4 rounded-2xl
        bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed
        text-white transition-colors shadow-lg shadow-emerald-900/30 group"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <ShoppingCart size={18} />
        </div>
        <div className="text-left">
          <p className="text-xs font-semibold opacity-75">გადახდა</p>
          <p className="text-sm font-bold">{itemCount} პოზიცია</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-black tabular-nums">₾{fmt(total)}</p>
      </div>
    </button>
  )
}

// ─── Full POS checkout flow (example usage) ──────────────────

interface POSCheckoutFlowProps {
  cartItems:   CartItemInput[]
  subtotal:    number
  discount:    number
  tax:         number
  total:       number
  clientId?:   string
  clientName?: string
  onSuccess:   (result: FinalizePaymentResult) => void
}

export function POSCheckoutFlow({
  cartItems, subtotal, discount, tax, total,
  clientId, clientName, onSuccess,
}: POSCheckoutFlowProps) {
  const [showModal, setShowModal] = useState(false)
  const [lastResult, setLastResult] = useState<FinalizePaymentResult | null>(null)

  const handleSuccess = (result: FinalizePaymentResult) => {
    setLastResult(result)
    setShowModal(false)
    onSuccess(result)
  }

  return (
    <>
      <CheckoutButton
        total={total}
        itemCount={cartItems.length}
        onPress={() => setShowModal(true)}
      />

      {lastResult && (
        <div className="flex items-center gap-2 mt-2 px-2">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <p className="text-xs text-slate-500">
            ბოლო: <span className="font-semibold text-slate-700">{lastResult.receipt_number}</span>
          </p>
        </div>
      )}

      {showModal && (
        <SplitPaymentModal
          total={total}
          cartItems={cartItems}
          totals={{ subtotal, discountTotal: discount, taxTotal: tax, total }}
          clientId={clientId}
          clientName={clientName}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MINIMAL USAGE EXAMPLE in existing POSPage.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// import SplitPaymentModal from '@/components/SplitPaymentModal'
// import { CartItemInput } from '@/types/splitPayment'
//
// function POSPage() {
//   const [showPayment, setShowPayment] = useState(false)
//
//   // Convert your existing cart format to CartItemInput[]
//   const cartItems: CartItemInput[] = cart.map(item => ({
//     product_id: item.product.id,
//     name:       item.product.name,
//     qty:        item.quantity,
//     unit_price: item.product.price,
//     discount:   item.discount ?? 0,
//     line_total: item.quantity * item.product.price - (item.discount ?? 0),
//     tax_rate:   item.product.tax_rate ?? 18,
//   }))
//
//   return (
//     <div>
//       {/* ... your cart UI ... */}
//       <button onClick={() => setShowPayment(true)}>
//         გადახდა ₾{total}
//       </button>
//
//       {showPayment && (
//         <SplitPaymentModal
//           total={total}
//           cartItems={cartItems}
//           totals={{ subtotal, discountTotal, taxTotal, total }}
//           onClose={() => setShowPayment(false)}
//           onSuccess={(result) => {
//             clearCart()
//             setShowPayment(false)
//             printReceipt(result)
//           }}
//         />
//       )}
//     </div>
//   )
// }
