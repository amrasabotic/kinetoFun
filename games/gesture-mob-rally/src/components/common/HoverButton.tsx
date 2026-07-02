import { useEffect, useRef, useState } from 'react';
import { useMenuCursorRef, EMPTY_CURSOR } from '../../gestures/MenuCursor';

const DWELL_MS = 650;

/**
 * Gesture-only replacement for a clickable <button> — the player hovers
 * their index fingertip over it for DWELL_MS to "press" it. No onClick
 * anywhere in this component; selection only ever fires from dwell.
 */
export default function HoverButton({
  onSelect,
  children,
  className = '',
  disabled = false,
}: {
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const cursorRef = useMenuCursorRef();
  const elRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [hovering, setHovering] = useState(false);
  const dwellStart = useRef<number | null>(null);
  const fired = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let raf = 0;
    function loop() {
      const el = elRef.current;
      const cursor = cursorRef.current ?? EMPTY_CURSOR;
      if (!disabled && el && cursor.detected) {
        const rect = el.getBoundingClientRect();
        const px = (cursor.xPct / 100) * window.innerWidth;
        const py = (cursor.yPct / 100) * window.innerHeight;
        const inside = px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
        if (inside) {
          if (dwellStart.current === null) { dwellStart.current = performance.now(); fired.current = false; }
          const held = performance.now() - dwellStart.current;
          const p = Math.min(1, held / DWELL_MS);
          setProgress(p);
          setHovering(true);
          if (p >= 1 && !fired.current) {
            fired.current = true;
            onSelectRef.current();
          }
        } else {
          dwellStart.current = null;
          fired.current = false;
          setProgress(0);
          setHovering(false);
        }
      } else {
        dwellStart.current = null;
        fired.current = false;
        setProgress(0);
        setHovering(false);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cursorRef, disabled]);

  return (
    <div
      ref={elRef}
      className={`relative select-none transition-transform duration-100 ${hovering ? 'scale-[1.03]' : ''} ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      {children}
      {hovering && !disabled && (
        <>
          <div className="absolute inset-0 rounded-[inherit] ring-2 ring-white/70 pointer-events-none" />
          <div className="absolute left-1 right-1 bottom-1 h-1 rounded-full bg-black/30 overflow-hidden pointer-events-none">
            <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
