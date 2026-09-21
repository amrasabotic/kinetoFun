import { useRef, useEffect, useState } from 'react';
import { useGesture } from '../../systems/GestureManager';

interface GestureSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: string;
  accentColor?: string;
}

export default function GestureSlider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  accentColor = '#00ff88',
}: GestureSliderProps) {
  const { state } = useGesture();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const percentage = ((value - min) / (max - min)) * 100;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const bounds = el.getBoundingClientRect();
    const { x, y } = state.cursor;
    const hovering = x >= bounds.left - 10 && x <= bounds.right + 10 && y >= bounds.top - 20 && y <= bounds.bottom + 20;
    setIsHovered(hovering);

    if (hovering && state.isPinching) {
      setIsDragging(true);
      const relX = Math.max(0, Math.min(1, (x - bounds.left) / bounds.width));
      const rawVal = min + relX * (max - min);
      const stepped = Math.round(rawVal / step) * step;
      const clamped = Math.max(min, Math.min(max, stepped));
      if (clamped !== value) {
        onChange(clamped);
      }
    } else if (!state.isPinching) {
      setIsDragging(false);
    }
  }, [state.cursor, state.isPinching, min, max, step, value, onChange]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/70 w-24 truncate">{label}</span>
      <div
        ref={trackRef}
        className="relative flex-1 h-2 rounded-full transition-all"
        style={{
          background: 'rgba(255,255,255,0.15)',
          boxShadow: isHovered ? `0 0 10px ${accentColor}30` : 'none',
        }}
      >
        {/* Filled track */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: `${percentage}%`,
            background: accentColor,
            boxShadow: isDragging ? `0 0 8px ${accentColor}` : 'none',
          }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full transition-all"
          style={{
            left: `${percentage}%`,
            marginLeft: -8,
            width: isDragging ? 20 : 16,
            height: isDragging ? 20 : 16,
            background: 'white',
            boxShadow: isDragging ? `0 0 12px ${accentColor}` : '0 2px 4px rgba(0,0,0,0.3)',
            transform: isHovered ? 'translateY(-50%) scale(1.2)' : 'translateY(-50%) scale(1)',
          }}
        />
      </div>
      <span className="text-xs text-white/50 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}
