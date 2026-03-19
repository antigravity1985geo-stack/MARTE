// components/POSRefundIntegration.tsx
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HOW TO ADD REFUND TO YOUR EXISTING POS PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Option A — Separate route (recommended):
//   <Route path="/pos/refund" element={<RefundPage />} />
//   Add button in POS header: navigate('/pos/refund')
//
// Option B — Inline modal inside POS:
//   Import <RefundModal> below, open on button click.
//
// Option C — Quick refund from receipt:
//   After any sale, show "Refund this sale" link.
//   Pass receipt_number as URL param: /pos/refund?receipt=RCP-2026-00142

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, X } from 'lucide-react'
import RefundPage from './RefundPage'

// ─── Refund Button for POS toolbar ───────────────────────────

export function RefundButton({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/pos/refund')}
      className={`flex items-center gap-2 border border-slate-200 rounded-xl
        text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors
        ${compact ? 'p-2' : 'px-4 py-2.5'}`}
      title="დაბრუნება"
    >
      <RotateCcw size={16} />
      {!compact && <span className="text-sm font-semibold">დაბრუნება</span>}
    </button>
  )
}

// ─── Inline Modal variant ─────────────────────────────────────

export function RefundModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <RotateCcw size={18} className="text-rose-600" />
            <span className="font-bold text-slate-900">დაბრუნება / Refund</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <RefundPage />
        </div>
      </div>
    </div>
  )
}

// ─── Quick Refund Hook (use from receipt/transaction detail) ──

export function useQuickRefund() {
  const navigate = useNavigate()

  const openRefundForReceipt = (receiptNumber: string) => {
    navigate(`/pos/refund?receipt=${encodeURIComponent(receiptNumber)}`)
  }

  return { openRefundForReceipt }
}

// ─── Refund history badge (show on transaction row) ───────────

import { Return } from '@/types/returns'
import { useReturnHistory } from '@/hooks/useReturns'

export function RefundBadge({ txId }: { txId: string }) {
  const { returns } = useReturnHistory(txId)
  if (!returns.length) return null

  const totalRefunded = returns.reduce((s, r) => s + Number(r.refund_amount), 0)
  const fmt = (n: number) =>
    new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 2 }).format(n)

  return (
    <span className="inline-flex items-center gap-1 text-xs bg-rose-100 text-rose-700
      font-semibold px-2 py-0.5 rounded-full">
      <RotateCcw size={10} />
      -₾{fmt(totalRefunded)}
    </span>
  )
}
