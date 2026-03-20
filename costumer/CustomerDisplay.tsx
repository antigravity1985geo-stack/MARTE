// pages/CustomerDisplay.tsx  (or components/CustomerDisplay.tsx)
// ─────────────────────────────────────────────────────────────
// Full-screen page for a second monitor / tablet facing customer.
// Open via: window.open('/display', 'CustomerDisplay', 'fullscreen')
// Or route to /display and go fullscreen via the button.
//
// Design: luxury retail terminal — near-black background,
// surgical white type, emerald accent for totals.
// Large numbers, generous breathing room.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useDisplayReceiver } from '@/hooks/useCustomerDisplay'
import { DisplayCartItem }    from '@/types/customerDisplay'

// ─── Helpers ──────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const fmtTime = () =>
  new Date().toLocaleTimeString('ka-GE', {
    hour:   '2-digit',
    minute: '2-digit',
  })

// ─── Idle / Welcome screen ────────────────────────────────────

function IdleScreen({ company }: { company: string }) {
  const [time, setTime] = useState(fmtTime())
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const t1 = setInterval(() => setTime(fmtTime()), 10_000)
    const t2 = setInterval(() => setDots(d => (d + 1) % 4), 800)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 select-none"
      style={{ animation: 'fadeIn 0.8s ease' }}>

      {/* Animated rings */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-40 h-40 rounded-full border border-white/5
          animate-[spin_20s_linear_infinite]" />
        <div className="absolute w-56 h-56 rounded-full border border-white/[0.03]
          animate-[spin_30s_linear_infinite_reverse]" />
        <div className="absolute w-72 h-72 rounded-full border border-white/[0.02]
          animate-[spin_40s_linear_infinite]" />

        {/* Logo mark */}
        <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10
          flex items-center justify-center backdrop-blur-sm">
          <span className="text-white/80 text-3xl font-black tracking-tighter">
            {company.slice(0, 1).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Company name */}
      <div className="text-center">
        <p className="text-white/90 text-5xl font-black tracking-tight mb-2">
          {company}
        </p>
        <p className="text-white/30 text-lg tracking-[0.3em] uppercase">
          კეთილი იყოს თქვენი მობრძანება
        </p>
      </div>

      {/* Time */}
      <p className="text-white/20 text-2xl font-light tabular-nums mt-4">
        {time}
      </p>

      {/* Waiting dots */}
      <div className="flex gap-2 mt-2">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300
            ${i === dots ? 'bg-emerald-400/60 scale-125' : 'bg-white/10'}`} />
        ))}
      </div>
    </div>
  )
}

// ─── Cart item row ────────────────────────────────────────────

function CartItemRow({
  item,
  index,
  isNew,
}: {
  item:  DisplayCartItem
  index: number
  isNew: boolean
}) {
  return (
    <div
      className={`flex items-center gap-4 py-3.5 border-b border-white/5 last:border-0
        transition-all duration-500`}
      style={{
        animation: isNew ? 'slideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        animationDelay: `${index * 40}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* Qty bubble */}
      <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10
        flex items-center justify-center flex-shrink-0">
        <span className="text-white/70 text-sm font-bold tabular-nums">
          {item.qty}
        </span>
      </div>

      {/* Name */}
      <p className="flex-1 text-white/80 text-base font-medium truncate">
        {item.name}
      </p>

      {/* Unit price */}
      <p className="text-white/30 text-sm tabular-nums flex-shrink-0 hidden sm:block">
        ₾{fmt(item.unit_price)}
      </p>

      {/* Line total */}
      <p className="text-white/90 text-lg font-bold tabular-nums flex-shrink-0 min-w-[90px] text-right">
        ₾{fmt(item.line_total)}
      </p>
    </div>
  )
}

// ─── Shopping screen ──────────────────────────────────────────

function ShoppingScreen({
  items, subtotal, discount_total, tax_total, total, client_name,
}: {
  items:          DisplayCartItem[]
  subtotal:       number
  discount_total: number
  tax_total:      number
  total:          number
  client_name:    string | null
}) {
  const prevCountRef = useRef(0)
  const isNew = (i: number) => i >= prevCountRef.current
  useEffect(() => {
    prevCountRef.current = items.length
  })

  return (
    <div className="flex flex-col h-full" style={{ animation: 'fadeIn 0.4s ease' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-10 py-6 flex-shrink-0
        border-b border-white/5">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">
            კალათა
          </p>
          <p className="text-white/70 text-sm font-semibold">
            {items.length} პოზიცია
          </p>
        </div>
        {client_name && (
          <div className="text-right">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-0.5">
              კლიენტი
            </p>
            <p className="text-white/70 text-sm font-bold">{client_name}</p>
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-hidden px-10 py-4 relative">
        <div className="overflow-y-auto h-full pr-2 scrollbar-none">
          {items.map((item, i) => (
            <CartItemRow
              key={item.product_id + i}
              item={item}
              index={i}
              isNew={isNew(i)}
            />
          ))}
        </div>
        {/* Fade at bottom of list */}
        <div className="absolute bottom-0 left-10 right-10 h-12
          bg-gradient-to-t from-[#0d1117] to-transparent pointer-events-none" />
      </div>

      {/* Totals panel */}
      <div className="flex-shrink-0 border-t border-white/8 px-10 py-6">
        <div className="flex items-end justify-between">
          {/* Left: subtotals */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-8">
              <span className="text-white/35 text-sm w-28">ქვეჯამი</span>
              <span className="text-white/60 text-sm tabular-nums">
                ₾{fmt(subtotal)}
              </span>
            </div>
            {discount_total > 0 && (
              <div className="flex items-center gap-8">
                <span className="text-white/35 text-sm w-28">ფასდაკლება</span>
                <span className="text-amber-400/80 text-sm tabular-nums font-semibold">
                  −₾{fmt(discount_total)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-8">
              <span className="text-white/35 text-sm w-28">დღგ 18%</span>
              <span className="text-white/40 text-sm tabular-nums">
                ₾{fmt(tax_total)}
              </span>
            </div>
          </div>

          {/* Right: grand total */}
          <div className="text-right">
            <p className="text-white/35 text-sm uppercase tracking-widest mb-1">
              სულ
            </p>
            <p
              className="text-emerald-400 font-black tabular-nums leading-none"
              style={{
                fontSize: total >= 1000 ? '3.5rem' : '4.5rem',
                textShadow: '0 0 40px rgba(52,211,153,0.3)',
                animation: 'totalPop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              ₾{fmt(total)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Payment processing screen ────────────────────────────────

function PaymentScreen({ method }: { method: string | null }) {
  const [dots, setDots] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 400)
    return () => clearInterval(t)
  }, [])

  const methodLabel: Record<string, string> = {
    cash:  'ნაღდი',
    card:  'ბარათი',
    split: 'split',
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-10
      select-none" style={{ animation: 'fadeIn 0.4s ease' }}>

      {/* Pulsing ring */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-32 h-32 rounded-full border-2 border-emerald-400/20
          animate-ping" style={{ animationDuration: '1.5s' }} />
        <div className="absolute w-24 h-24 rounded-full border border-emerald-400/30
          animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }} />
        <div className="w-20 h-20 rounded-full bg-emerald-400/10 border-2
          border-emerald-400/40 flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-400 animate-spin"
            style={{ animationDuration: '3s' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0
              002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25
              2.25 0 004.5 19.5z" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <p className="text-white/90 text-4xl font-black mb-3">
          {method ? methodLabel[method] ?? method : 'გადახდა'}
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-white/40 text-xl">მუშავდება</p>
          <div className="flex gap-1 ml-1">
            {[0,1,2].map(i => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-200
                ${i < dots ? 'bg-emerald-400/80' : 'bg-white/15'}`} />
            ))}
          </div>
        </div>
      </div>

      <p className="text-white/15 text-base uppercase tracking-[0.4em]">
        გთხოვთ დაელოდოთ
      </p>
    </div>
  )
}

// ─── Done / Thank you screen ──────────────────────────────────

function DoneScreen({
  result,
}: {
  result: {
    total:          number
    cash_paid?:     number
    change?:        number
    method:         string
    receipt_number: string
  }
}) {
  const methodLabel: Record<string, string> = {
    cash:  'ნაღდი',
    card:  'ბარათი',
    split: 'split',
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8
      select-none" style={{ animation: 'fadeIn 0.5s ease' }}>

      {/* Checkmark */}
      <div className="relative">
        <div className="w-28 h-28 rounded-full bg-emerald-400/10 border-2
          border-emerald-400/50 flex items-center justify-center"
          style={{ animation: 'pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <svg className="w-14 h-14 text-emerald-400" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        {/* Glow */}
        <div className="absolute inset-0 rounded-full bg-emerald-400/10
          blur-2xl scale-150 -z-10" />
      </div>

      {/* Amount */}
      <div className="text-center">
        <p className="text-white/90 text-7xl font-black tabular-nums leading-none mb-2"
          style={{ textShadow: '0 0 60px rgba(52,211,153,0.4)' }}>
          ₾{fmt(result.total)}
        </p>
        <p className="text-emerald-400/70 text-lg uppercase tracking-[0.3em]">
          {methodLabel[result.method] ?? result.method}
        </p>
      </div>

      {/* Change (cash only) */}
      {(result.change ?? 0) > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl px-10 py-5
          text-center" style={{ animation: 'slideUp 0.4s ease 0.3s both' }}>
          <p className="text-white/40 text-sm uppercase tracking-widest mb-1">
            ხურდა
          </p>
          <p className="text-white text-5xl font-black tabular-nums">
            ₾{fmt(result.change!)}
          </p>
        </div>
      )}

      {/* Receipt number */}
      <p className="text-white/20 text-sm tracking-[0.2em] font-mono">
        {result.receipt_number}
      </p>

      {/* Thank you */}
      <p className="text-white/40 text-xl tracking-widest uppercase mt-2"
        style={{ animation: 'fadeIn 0.6s ease 0.5s both' }}>
        გმადლობთ
      </p>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────

interface CustomerDisplayProps {
  /** Company/store name shown on idle screen */
  companyName?: string
  /** Set if display is on a separate device (enables Supabase sync) */
  drawerId?: string
  crossDevice?: boolean
}

export default function CustomerDisplay({
  companyName = 'საწყობი',
  drawerId,
  crossDevice = false,
}: CustomerDisplayProps) {
  const screen = useDisplayReceiver(drawerId, crossDevice)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { scrollbar-width: none; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes totalPop {
          0%   { transform: scale(0.92); }
          60%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        @keyframes pop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.12); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes spin_reverse {
          to { transform: rotate(-360deg); }
        }
      `}</style>

      <div
        style={{
          width:           '100vw',
          height:          '100vh',
          background:      '#0d1117',
          color:           '#fff',
          fontFamily:      '"DM Sans", "Helvetica Neue", sans-serif',
          overflow:        'hidden',
          position:        'relative',
        }}
      >
        {/* Subtle grid texture */}
        <div style={{
          position:   'absolute', inset: 0, opacity: 0.025,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #34d399, #34d399, transparent)',
          opacity: screen.state === 'idle' ? 0.3 : 0.8,
          transition: 'opacity 0.5s',
        }} />

        {/* Corner watermark */}
        <div style={{
          position: 'absolute', bottom: 20, right: 24,
          color: 'rgba(255,255,255,0.06)',
          fontSize: 11, letterSpacing: '0.15em',
          fontWeight: 700, textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          {companyName} · POS
        </div>

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 10, transition: 'all 0.2s',
          }}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0
                012-2h3M3 16h3a2 2 0 012 2v3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0
                002-2v-3M3 16v3a2 2 0 002 2h3" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {screen.state === 'idle' && (
            <IdleScreen company={companyName} />
          )}
          {screen.state === 'shopping' && (
            <ShoppingScreen
              items={screen.items}
              subtotal={screen.subtotal}
              discount_total={screen.discount_total}
              tax_total={screen.tax_total}
              total={screen.total}
              client_name={screen.client_name}
            />
          )}
          {screen.state === 'payment' && (
            <PaymentScreen method={screen.payment_method} />
          )}
          {screen.state === 'done' && screen.result && (
            <DoneScreen result={screen.result} />
          )}
        </div>
      </div>
    </>
  )
}
