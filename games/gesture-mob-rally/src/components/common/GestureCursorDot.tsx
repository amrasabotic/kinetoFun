import { useEffect, useRef } from 'react';
import { useMenuCursorRef, EMPTY_CURSOR } from '../../gestures/MenuCursor';

/** Visible fingertip cursor for menu screens — the only visual feedback for where the "pointer" is. */
export default function GestureCursorDot() {
  const cursorRef = useMenuCursorRef();
  const dotRef = useRef<HTMLDivElement>(null);

  // Moved straight on the element each frame; a re-render plus a CSS transition made it lag behind the hand.
  useEffect(() => {
    let raf = 0;
    function loop() {
      const c = cursorRef.current ?? EMPTY_CURSOR;
      const el = dotRef.current;
      if (el) {
        el.style.display = c.detected ? 'block' : 'none';
        el.style.left = `${c.xPct}%`;
        el.style.top = `${c.yPct}%`;
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cursorRef]);

  return (
    <div
      ref={dotRef}
      className="fixed w-10 h-10 rounded-full border-4 border-orange-400 bg-orange-400/25 pointer-events-none z-[999] shadow-[0_0_14px_rgba(251,146,60,0.7)]"
      style={{ display: 'none', transform: 'translate(-50%, -50%)' }}
    >
      <div className="absolute inset-[10px] rounded-full bg-orange-400" />
    </div>
  );
}
