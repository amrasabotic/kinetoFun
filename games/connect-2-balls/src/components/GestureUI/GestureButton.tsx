import { useRef, useEffect, useState, ReactNode } from 'react';
import { useGesture } from '../../systems/GestureManager';

interface GestureButtonProps {
  onActivate: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  holdDuration?: number;
  disabled?: boolean;
  id?: string;
}

export default function GestureButton({
  onActivate,
  children,
  className = '',
  style,
  holdDuration,
  disabled = false,
  id,
}: GestureButtonProps) {
  const { state, registerHoverTarget, unregisterHoverTarget } = useGesture();
  const elementRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const buttonId = useRef(id || `btn-${Math.random().toString(36).slice(2)}`);
  const activatedRef = useRef(false);

  // Register as hover target
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    const updateBounds = () => {
      const bounds = el.getBoundingClientRect();
      registerHoverTarget(buttonId.current, bounds);
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(el);
    window.addEventListener('scroll', updateBounds, { passive: true });
    return () => {
      unregisterHoverTarget(buttonId.current);
      observer.disconnect();
      window.removeEventListener('scroll', updateBounds);
    };
  }, [registerHoverTarget, unregisterHoverTarget]);

  // Check if cursor is over this button
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    const bounds = el.getBoundingClientRect();
    const { x, y } = state.cursor;
    const hovering = x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    setIsHovered(hovering);
  }, [state.cursor]);

  // Handle pinch activation
  useEffect(() => {
    if (disabled) return;
    if (!isHovered) {
      setHoldProgress(0);
      if (holdTimerRef.current) {
        cancelAnimationFrame(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      activatedRef.current = false;
      return;
    }

    if (state.isPinching && isHovered) {
      if (holdDuration) {
        // Hold mode
        if (!holdTimerRef.current) {
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / holdDuration);
            setHoldProgress(progress);
            if (progress >= 1 && !activatedRef.current) {
              activatedRef.current = true;
              onActivate();
              setHoldProgress(0);
            } else if (progress < 1) {
              holdTimerRef.current = requestAnimationFrame(animate);
            }
          };
          holdTimerRef.current = requestAnimationFrame(animate);
        }
      } else {
        // Instant pinch activation
        if (!activatedRef.current) {
          activatedRef.current = true;
          onActivate();
        }
      }
    } else {
      // Released
      setHoldProgress(0);
      if (holdTimerRef.current) {
        cancelAnimationFrame(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      activatedRef.current = false;
    }
  }, [state.isPinching, isHovered, disabled, holdDuration, onActivate]);

  return (
    <div
      ref={elementRef}
      className={`gesture-button relative transition-all duration-200 select-none ${className} ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
      style={{
        ...style,
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isHovered ? '0 0 20px rgba(255,255,255,0.15)' : 'none',
      }}
    >
      {children}

      {/* Hover glow */}
      {isHovered && !disabled && (
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            border: '2px solid rgba(255,255,255,0.3)',
            boxShadow: '0 0 15px rgba(255,255,255,0.1)',
          }}
        />
      )}

      {/* Hold progress ring */}
      {holdDuration && holdProgress > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="rgba(0,255,136,0.5)"
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 48}`}
              strokeDashoffset={`${2 * Math.PI * 48 * (1 - holdProgress)}`}
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
