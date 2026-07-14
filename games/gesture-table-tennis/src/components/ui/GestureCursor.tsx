import { useEffect, useRef, useState } from 'react';
import type { HandData } from '../../gestures/useMediaPipe';

const DWELL_MS = 1200;
const COOLDOWN_MS = 700;

interface CursorState {
  x: number; y: number;
  visible: boolean;
  dwellPct: number;
  hovering: boolean;
}

export default function GestureCursor({ handRef }: { handRef: React.MutableRefObject<HandData> }) {
  const [st, setSt] = useState<CursorState>({ x: -100, y: -100, visible: false, dwellPct: 0, hovering: false });
  const dwellRef = useRef({ el: null as Element | null, startMs: 0, cooldownUntil: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    function loop() {
      const hand = handRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const now = performance.now();

      if (!hand.detected) {
        setSt(s => s.visible ? { ...s, visible: false, dwellPct: 0, hovering: false } : s);
        dwellRef.current.el = null;
        dwellRef.current.startMs = 0;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Mirror X so moving hand right → cursor goes right on screen
      const cx = (1 - hand.palmX) * W;
      const cy = hand.palmY * H;

      if (now < dwellRef.current.cooldownUntil) {
        setSt({ x: cx, y: cy, visible: true, dwellPct: 0, hovering: false });
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const el = document.elementFromPoint(cx, cy);
      const btn = el?.closest('button, [role="button"]') as HTMLElement | null;
      const dwell = dwellRef.current;

      if (btn) {
        if (btn !== dwell.el) {
          dwell.el = btn;
          dwell.startMs = now;
        }
        const pct = Math.min(1, (now - dwell.startMs) / DWELL_MS);
        if (pct >= 1) {
          btn.click();
          dwell.el = null;
          dwell.startMs = 0;
          dwell.cooldownUntil = now + COOLDOWN_MS;
          setSt({ x: cx, y: cy, visible: true, dwellPct: 0, hovering: false });
        } else {
          setSt({ x: cx, y: cy, visible: true, dwellPct: pct, hovering: true });
        }
      } else {
        if (dwell.el) {
          dwell.el = null;
          dwell.startMs = 0;
        }
        setSt({ x: cx, y: cy, visible: true, dwellPct: 0, hovering: false });
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [handRef]);

  if (!st.visible) return null;

  const R = 22;
  const circ = 2 * Math.PI * R;
  const dashOff = circ * (1 - st.dwellPct);
  const S = 64;
  const C = S / 2;

  return (
    <div
      style={{
        position: 'fixed',
        left: st.x - C,
        top: st.y - C,
        width: S,
        height: S,
        pointerEvents: 'none',
        zIndex: 10000,
      }}
    >
      <svg width={S} height={S} style={{ overflow: 'visible' }}>
        {/* Soft glow halo */}
        <circle cx={C} cy={C} r={R + 6} fill="none" stroke="rgba(168,85,247,0.18)" strokeWidth="10" />
        {/* White base ring */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        {/* Dwell progress arc */}
        {st.dwellPct > 0 && (
          <circle
            cx={C} cy={C} r={R}
            fill="none"
            stroke="#a855f7"
            strokeWidth="4"
            strokeDasharray={circ}
            strokeDashoffset={dashOff}
            strokeLinecap="round"
            transform={`rotate(-90 ${C} ${C})`}
          />
        )}
        {/* Center dot */}
        <circle cx={C} cy={C} r={st.hovering ? 8 : 5}
          fill={st.hovering ? '#a855f7' : 'rgba(168,85,247,0.8)'}
          style={{ transition: 'r 0.1s' }}
        />
        <circle cx={C} cy={C} r={2.5} fill="white" />
      </svg>
    </div>
  );
}
