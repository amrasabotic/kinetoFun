import { useEffect, useState } from 'react';
import { useMenuCursorRef, EMPTY_CURSOR } from '../../gestures/MenuCursor';

/** Visible fingertip cursor for menu screens — the only visual feedback for where the "pointer" is. */
export default function GestureCursorDot() {
  const cursorRef = useMenuCursorRef();
  const [pos, setPos] = useState({ x: 50, y: 50, visible: false });

  useEffect(() => {
    let raf = 0;
    function loop() {
      const c = cursorRef.current ?? EMPTY_CURSOR;
      setPos({ x: c.xPct, y: c.yPct, visible: c.detected });
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cursorRef]);

  if (!pos.visible) return null;

  return (
    <div
      className="fixed w-7 h-7 rounded-full border-2 border-orange-400 bg-orange-400/25 pointer-events-none z-[999] shadow-[0_0_14px_rgba(251,146,60,0.7)]"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', transition: 'left 0.05s linear, top 0.05s linear' }}
    >
      <div className="absolute inset-[7px] rounded-full bg-orange-400" />
    </div>
  );
}
