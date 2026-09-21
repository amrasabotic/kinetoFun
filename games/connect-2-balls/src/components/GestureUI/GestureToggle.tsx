import { useRef, useEffect, useState } from 'react';
import { useGesture } from '../../systems/GestureManager';

interface GestureToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  icon?: React.ReactNode;
  accentColor?: string;
}

export default function GestureToggle({
  value,
  onChange,
  label,
  icon,
  accentColor = '#00ff88',
}: GestureToggleProps) {
  const { state } = useGesture();
  const elementRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const activatedRef = useRef(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    const bounds = el.getBoundingClientRect();
    const { x, y } = state.cursor;
    const hovering = x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    setIsHovered(hovering);

    if (hovering && state.isPinching && !activatedRef.current) {
      activatedRef.current = true;
      onChange(!value);
    }
    if (!state.isPinching) {
      activatedRef.current = false;
    }
  }, [state.cursor, state.isPinching, value, onChange]);

  return (
    <div
      ref={elementRef}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-none select-none"
      style={{
        background: 'rgba(255,255,255,0.06)',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isHovered ? '0 0 15px rgba(255,255,255,0.08)' : 'none',
        border: isHovered ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
      }}
    >
      {icon && <span style={{ color: accentColor }}>{icon}</span>}
      <span className="flex-1 text-sm text-white/90">{label}</span>
      <div
        className="w-10 h-6 rounded-full transition-all relative"
        style={{
          background: value ? accentColor : 'rgba(255,255,255,0.2)',
          opacity: value ? 1 : 0.5,
        }}
      >
        <div
          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: value ? 20 : 4 }}
        />
      </div>
    </div>
  );
}
