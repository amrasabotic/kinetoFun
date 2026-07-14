import { useEffect, useRef, useState } from 'react';
import { useGesture } from '../../mediaPipe/GestureProvider';

interface Props {
  value: number; // 0..1
  onChange: (v: number) => void;
  color?: string;
  label: string;
}

/** A gesture-only slider: hover your fingertip over the track and its position sets the value live. */
export default function GestureSlider({ value, onChange, color = '#8C5CFF', label }: Props) {
  const { frame } = useGesture();
  const trackRef = useRef<HTMLDivElement>(null);
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !frame.detected) { setEngaged(false); return; }
    const rect = el.getBoundingClientRect();
    const px = frame.cursorX * window.innerWidth;
    const py = frame.cursorY * window.innerHeight;
    const withinY = py >= rect.top - 22 && py <= rect.bottom + 22;
    const withinX = px >= rect.left - 14 && px <= rect.right + 14;
    if (withinX && withinY) {
      setEngaged(true);
      const v = Math.min(1, Math.max(0, (px - rect.left) / rect.width));
      onChange(v);
    } else {
      setEngaged(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.cursorX, frame.cursorY, frame.detected]);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-white/60 mb-1.5">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div
        ref={trackRef}
        className={`relative h-4 rounded-full bg-white/10 border transition-colors ${engaged ? 'border-white/50' : 'border-white/10'}`}
      >
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full"
          style={{ width: `${value * 100}%`, background: color }}
        />
        <div
          className="absolute top-1/2 h-6 w-6 rounded-full border-2 border-white shadow-lg"
          style={{ left: `${value * 100}%`, transform: 'translate(-50%,-50%)', background: color }}
        />
      </div>
    </div>
  );
}
