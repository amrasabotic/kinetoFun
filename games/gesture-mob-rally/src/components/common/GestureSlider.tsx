import { useEffect, useRef, useState } from 'react';
import { useMenuCursorRef, EMPTY_CURSOR } from '../../gestures/MenuCursor';

/** Gesture-only slider — value follows the fingertip live while it's hovering the track (no drag gesture exists, so this substitutes for one). */
export default function GestureSlider({
  label, value, min, max, step = 0.05, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const cursorRef = useMenuCursorRef();
  const trackRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let raf = 0;
    function loop() {
      const el = trackRef.current;
      const cursor = cursorRef.current ?? EMPTY_CURSOR;
      if (el && cursor.detected) {
        const rect = el.getBoundingClientRect();
        const px = (cursor.xPct / 100) * window.innerWidth;
        const py = (cursor.yPct / 100) * window.innerHeight;
        const pad = 22;
        const inside = px >= rect.left - pad && px <= rect.right + pad && py >= rect.top - pad && py <= rect.bottom + pad;
        setHovering(inside);
        if (inside) {
          const t = Math.min(1, Math.max(0, (px - rect.left) / rect.width));
          let v = min + t * (max - min);
          v = Math.round(v / step) * step;
          v = Math.round(v * 1000) / 1000;
          if (Math.abs(v - valueRef.current) >= step / 2) onChangeRef.current(v);
        }
      } else {
        setHovering(false);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cursorRef, min, max, step]);

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <label className="block text-sm text-white/60 mb-2">{label}</label>
      <div
        ref={trackRef}
        className={`relative h-4 rounded-full bg-white/10 transition-shadow ${hovering ? 'ring-2 ring-orange-400' : ''}`}
      >
        <div className="absolute inset-y-0 left-0 bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow border-2 border-orange-400"
          style={{ left: `calc(${pct}% - 12px)` }}
        />
      </div>
    </div>
  );
}
