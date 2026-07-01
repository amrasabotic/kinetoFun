import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandData } from '../hooks/useMediaPipe';
import { MENU_DWELL_MS } from '../hooks/useGestureControl';
import * as audio from '../game/audio';

interface DwellState {
  active: string | null;
  progress: number;
}

interface Props {
  handRef: React.RefObject<HandData>;
  children: (dwell: DwellState) => React.ReactNode;
}

const CURSOR_R = 24;

/**
 * Gesture-only menu navigation: hover a `[data-dwell-id]` element for
 * `MENU_DWELL_MS` and it auto-clicks. Reads the single shared `handRef`
 * (owned by App, fed by one MediaPipe instance) so menus and gameplay never
 * fight over the camera.
 */
export default function GestureDetector({ handRef, children }: Props) {
  const [dwell, setDwell] = useState<DwellState>({ active: null, progress: 0 });
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5, visible: false });
  const dwellStartRef = useRef<number | null>(null);
  const activeRef = useRef<string | null>(null);
  const rafRef = useRef(0);

  const loop = useCallback(
    (ts: number) => {
      const hand = handRef.current;
      if (!hand || !hand.detected) {
        if (activeRef.current !== null) {
          activeRef.current = null;
          setDwell({ active: null, progress: 0 });
        }
        setCursor((c) => (c.visible ? { ...c, visible: false } : c));
        dwellStartRef.current = null;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      setCursor({ x: hand.x, y: hand.y, visible: true });
      const cx = hand.x * window.innerWidth;
      const cy = hand.y * window.innerHeight;
      let hovered: string | null = null;
      document.querySelectorAll('[data-dwell-id]').forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
          hovered = (el as HTMLElement).dataset.dwellId ?? null;
        }
      });

      if (hovered !== activeRef.current) {
        activeRef.current = hovered;
        dwellStartRef.current = hovered ? ts : null;
        setDwell({ active: hovered, progress: 0 });
        if (hovered) audio.playMenuHover();
      } else if (hovered && dwellStartRef.current !== null) {
        const progress = Math.min((ts - dwellStartRef.current) / MENU_DWELL_MS, 1);
        setDwell({ active: hovered, progress });
        if (progress >= 1) {
          const el = document.querySelector<HTMLElement>(`[data-dwell-id="${hovered}"]`);
          el?.click();
          dwellStartRef.current = null;
          activeRef.current = null;
          setDwell({ active: null, progress: 0 });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    },
    [handRef],
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  return (
    <div className="relative w-full h-full">
      {children(dwell)}
      {cursor.visible && (
        <div
          className="pointer-events-none fixed z-[60]"
          style={{ left: cursor.x * window.innerWidth - CURSOR_R, top: cursor.y * window.innerHeight - CURSOR_R, width: CURSOR_R * 2, height: CURSOR_R * 2 }}
        >
          <svg width={CURSOR_R * 2} height={CURSOR_R * 2}>
            <circle cx={CURSOR_R} cy={CURSOR_R} r={CURSOR_R - 3} fill="none" stroke="rgba(57,255,136,0.55)" strokeWidth="2.5" />
            <circle cx={CURSOR_R} cy={CURSOR_R} r={7} fill="#39ff88" fillOpacity="0.9" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function DwellButton({
  id,
  dwell,
  onClick,
  className = '',
  style,
  children,
}: {
  id: string;
  dwell: DwellState;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const isActive = dwell.active === id;
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <button
        data-dwell-id={id}
        onClick={(e) => {
          if (e.isTrusted) return; // ignore stray real clicks — gesture-only per spec
          audio.initAudio();
          audio.playMenuSelect();
          onClick();
        }}
        onMouseDown={(e) => e.preventDefault()}
        style={{ cursor: 'default', userSelect: 'none', ...style }}
        className={`${className} ${isActive ? 'scale-[1.03] brightness-125' : ''} transition-all duration-150 relative`}
      >
        {children}
      </button>
      <div
        className="absolute bottom-0 left-0 h-1.5 pointer-events-none"
        style={{ width: `${isActive ? dwell.progress * 100 : 0}%`, background: 'linear-gradient(90deg,#39ff88,#0af0ff)', opacity: isActive ? 1 : 0 }}
      />
    </div>
  );
}
