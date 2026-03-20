// pages/WaitingRoomDisplay.tsx
// ─────────────────────────────────────────────────────────────
// Route: /queue/display  (full-screen TV / wall monitor)
// No auth required — shows public queue info only.
// Design: high-contrast broadcast design — deep navy, electric
// teal accents, massive ticket numbers readable across the room.
// Auto-announces via Web Speech API on each call.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { ka }     from 'date-fns/locale'
import { useAllCountersDisplay } from '@/hooks/useQueueSystem'
import { useQueueSound }         from '@/hooks/useQueueSystem'
import { CounterDisplayState }   from '@/types/queueSystem'

const TENANT_ID   = import.meta.env.VITE_TENANT_ID ?? ''
const CLINIC_NAME = import.meta.env.VITE_CLINIC_NAME ?? 'კლინიკა'

// ─── Clock ────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="text-right tabular-nums">
      <p style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
        {format(time, 'HH:mm')}
      </p>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
        {format(time, 'd MMMM yyyy', { locale: ka })}
      </p>
    </div>
  )
}

// ─── Counter panel ────────────────────────────────────────────
function CounterPanel({
  cs,
  isNew,
}: {
  cs:    CounterDisplayState
  isNew: boolean  // flash animation on new call
}) {
  const hasCurrent = !!cs.current_ticket
  const isServing  = cs.current_ticket?.status === 'serving'
  const isCalled   = cs.current_ticket?.status === 'called'

  return (
    <div
      style={{
        background: hasCurrent ? (isCalled ? '#0d2d45' : '#0a1f2e') : '#0c1c2c',
        border: `2px solid ${hasCurrent ? (isCalled ? '#38bdf8' : '#0d9488') : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 20,
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.5s, background 0.5s',
        animation: isNew ? 'flash 1.2s ease' : 'none',
      }}
    >
      {/* Glow effect on call */}
      {isCalled && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 18,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Counter name */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
            {cs.counter.code}
          </p>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginTop: 2 }}>
            {cs.counter.name}
          </p>
          {cs.counter.room_number && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              კაბ. #{cs.counter.room_number}
            </p>
          )}
        </div>
        <div style={{
          background: cs.counter.is_open ? '#0d9488' : 'rgba(255,255,255,0.06)',
          borderRadius: 20, padding: '4px 12px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700,
            color: cs.counter.is_open ? '#fff' : 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {cs.counter.is_open ? 'გახსნილია' : 'დახურულია'}
          </p>
        </div>
      </div>

      {/* Current ticket — the hero number */}
      <div style={{
        background: hasCurrent ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 100,
        border: `1px solid ${hasCurrent ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
      }}>
        {hasCurrent ? (
          <>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                {isCalled ? '▶ გამოძახება' : '● მომსახურება'}
              </p>
              <p style={{
                fontSize: 64, fontWeight: 900, lineHeight: 1,
                color: isCalled ? '#38bdf8' : '#2dd4bf',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                textShadow: isCalled ? '0 0 40px rgba(56,189,248,0.5)' : 'none',
                animation: isCalled ? 'pulse-num 1.5s ease-in-out infinite' : 'none',
              }}>
                {cs.current_ticket!.ticket_number}
              </p>
              {cs.current_ticket!.patient_name && (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                  {cs.current_ticket!.patient_name}
                </p>
              )}
            </div>
            {isCalled && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(56,189,248,0.15)',
                  border: '2px solid rgba(56,189,248,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'ping-ring 1.5s linear infinite',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="#38bdf8" strokeWidth="2" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)', fontWeight: 500, margin: 'auto' }}>
            {cs.counter.is_open ? '— ბილეთი არ არის —' : '— დახურულია —'}
          </p>
        )}
      </div>

      {/* Queue ahead */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {cs.next_tickets.map(t => (
            <div key={t.id} style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 10,
              padding: '6px 12px', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
                {t.ticket_number}
              </p>
            </div>
          ))}
          {cs.waiting_count === 0 && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>
              რიგი ცარიელია
            </p>
          )}
        </div>
        {cs.waiting_count > 0 && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            {cs.waiting_count} ელოდება
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Ticker tape (scrolling info bar) ────────────────────────
function TickerTape() {
  const msg = 'გამარჯობა! გთხოვთ, შეინახოთ თქვენი ბილეთი. გამოძახებისთანავე მიბრძანდით მომსახურების სადგურთან.   •   Please keep your ticket. Come to the counter when called.'
  return (
    <div style={{
      overflow: 'hidden', whiteSpace: 'nowrap',
      background: 'rgba(255,255,255,0.05)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '10px 0',
    }}>
      <div style={{
        display: 'inline-block',
        animation: 'scroll-left 30s linear infinite',
        fontSize: 14, color: 'rgba(255,255,255,0.4)', paddingLeft: '100%',
      }}>
        {msg} &nbsp;&nbsp;&nbsp; {msg}
      </div>
    </div>
  )
}

// ─── MAIN DISPLAY ─────────────────────────────────────────────
export default function WaitingRoomDisplay() {
  const { state, loading } = useAllCountersDisplay(TENANT_ID)
  const { playCall, playBeep } = useQueueSound()
  const prevCalledRef = useRef<Record<string, string>>({}) // counterId → ticket_number
  const [newCalls, setNewCalls] = useState<Set<string>>(new Set())

  // Detect new calls and announce
  useEffect(() => {
    const nowCalled: Record<string, string> = {}
    const fresh: string[] = []

    for (const cs of state) {
      if (cs.current_ticket?.status === 'called') {
        nowCalled[cs.counter.id] = cs.current_ticket.ticket_number
        if (prevCalledRef.current[cs.counter.id] !== cs.current_ticket.ticket_number) {
          fresh.push(cs.counter.id)
        }
      }
    }

    if (fresh.length > 0) {
      setNewCalls(new Set(fresh))
      playBeep()
      // Announce all new calls sequentially
      const num = state
        .filter(cs => fresh.includes(cs.counter.id) && cs.current_ticket)
        .map(cs => cs.current_ticket!.ticket_number)
        .join(', ')
      if (num) setTimeout(() => playCall(num), 600)
      setTimeout(() => setNewCalls(new Set()), 3000)
    }

    prevCalledRef.current = nowCalled
  }, [state, playCall, playBeep])

  const cols = state.length <= 2 ? state.length : state.length <= 4 ? 2 : 3

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080f1a; }
        @keyframes flash {
          0%,100% { box-shadow: 0 0 0 0 transparent; }
          25%      { box-shadow: 0 0 0 12px rgba(56,189,248,0.3); }
          50%      { box-shadow: 0 0 0 24px rgba(56,189,248,0.1); }
        }
        @keyframes pulse-num {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.7; }
        }
        @keyframes ping-ring {
          0%,100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.15); opacity: 0.7; }
        }
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      <div style={{
        width: '100vw', height: '100vh', background: '#080f1a',
        display: 'flex', flexDirection: 'column',
        fontFamily: '"BPG Nino Mtavruli", "Sylfaen", sans-serif',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: '#0d9488', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
                {CLINIC_NAME}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                მომლოდინეთა რიგი
              </p>
            </div>
          </div>
          <LiveClock />
        </div>

        {/* Counter grid */}
        <div style={{
          flex: 1, padding: '20px 24px', overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16,
          alignContent: 'start',
        }}>
          {loading ? (
            <div style={{ gridColumn: `1 / -1`, textAlign: 'center', paddingTop: 80 }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>იტვირთება…</p>
            </div>
          ) : state.length === 0 ? (
            <div style={{ gridColumn: `1 / -1`, textAlign: 'center', paddingTop: 80 }}>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20 }}>
                სამომსახურო სადგური კონფიგურირებული არ არის
              </p>
            </div>
          ) : state.map(cs => (
            <CounterPanel
              key={cs.counter.id}
              cs={cs}
              isNew={newCalls.has(cs.counter.id)}
            />
          ))}
        </div>

        {/* Ticker tape */}
        <TickerTape />
      </div>
    </>
  )
}
