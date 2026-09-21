import React, { useEffect, useRef, useState } from 'react';
import { useGesture } from '../../mediaPipe/GestureProvider';
import { useSettingsStore } from '../../stores/settingsStore';
import { useDwellProgress } from '../../hooks/useDwellProgress';
import { playHoverTick, playConfirm } from '../../audio/sound';
import ProgressRing from './ProgressRing';

interface Props {
  onActivate: () => void;
  dwellMs?: number;
  disabled?: boolean;
  className?: string;
  ringColor?: string;
  children: React.ReactNode;
}

export default function HoverButton({
  onActivate, dwellMs = 700, disabled = false, className = '', ringColor = '#8C5CFF', children,
}: Props) {
  const { frame } = useGesture();
  const largerCursor = useSettingsStore((s) => s.largerCursor);
  const ref = useRef<HTMLButtonElement>(null);
  const [hovering, setHovering] = useState(false);
  const lastTickRef = useRef(0);

  useEffect(() => {
    if (disabled || !frame.detected) { setHovering(false); return; }
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = frame.cursorX * window.innerWidth;
    const py = frame.cursorY * window.innerHeight;
    const pad = largerCursor ? 16 : 2;
    const inside = px >= rect.left - pad && px <= rect.right + pad && py >= rect.top - pad && py <= rect.bottom + pad;
    setHovering(inside);
  }, [frame.cursorX, frame.cursorY, frame.detected, disabled, largerCursor]);

  const progress = useDwellProgress(hovering && !disabled, dwellMs, () => {
    playConfirm();
    onActivate();
  });

  useEffect(() => {
    if (!hovering || progress <= 0 || progress >= 1) return;
    const now = performance.now();
    if (now - lastTickRef.current > 160) {
      lastTickRef.current = now;
      playHoverTick();
    }
  }, [progress, hovering]);

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      tabIndex={-1}
      className={`relative select-none transition-transform duration-150 outline-none ${
        hovering && !disabled ? 'scale-[1.05]' : 'scale-100'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      style={hovering && !disabled ? { boxShadow: `0 0 24px 4px ${ringColor}66` } : undefined}
    >
      {children}
      {hovering && !disabled && (
        <ProgressRing progress={progress} size={Math.max(72, (ref.current?.offsetWidth ?? 80) + 16)} color={ringColor} />
      )}
    </button>
  );
}
