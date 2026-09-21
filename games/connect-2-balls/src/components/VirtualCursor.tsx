import { useEffect, useRef, useState } from 'react';
import { useGesture } from '../systems/GestureManager';

export default function VirtualCursor() {
  const { state, settings } = useGesture();
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; time: number }>>([]);
  const rippleId = useRef(0);
  const prevPinch = useRef(false);

  // Spawn ripple on pinch start
  useEffect(() => {
    if (state.isPinching && !prevPinch.current) {
      const id = rippleId.current++;
      setRipples((prev) => [...prev, { id, x: state.cursor.x, y: state.cursor.y, time: Date.now() }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }
    prevPinch.current = state.isPinching;
  }, [state.isPinching, state.cursor]);

  if (!state.isHandDetected) return null;

  const size = settings.largeCursor ? 28 : 20;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]" style={{ isolation: 'isolate' }}>
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute rounded-full animate-ripple-out"
          style={{
            left: ripple.x - 20,
            top: ripple.y - 20,
            width: 40,
            height: 40,
            border: '2px solid rgba(255,255,255,0.6)',
          }}
        />
      ))}

      {/* Main cursor */}
      <div
        className="absolute transition-transform duration-75"
        style={{
          left: state.cursor.x - size,
          top: state.cursor.y - size,
          width: size * 2,
          height: size * 2,
          transform: state.isPinching ? 'scale(0.7)' : 'scale(1)',
        }}
      >
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 transition-all duration-150"
          style={{
            borderColor: state.isPinching ? '#00ff88' : 'rgba(255,255,255,0.8)',
            boxShadow: state.isPinching
              ? '0 0 15px rgba(0,255,136,0.5), inset 0 0 8px rgba(0,255,136,0.2)'
              : '0 0 8px rgba(255,255,255,0.2)',
          }}
        />

        {/* Inner dot */}
        <div
          className="absolute rounded-full transition-all duration-150"
          style={{
            left: '50%',
            top: '50%',
            width: state.isPinching ? 10 : 6,
            height: state.isPinching ? 10 : 6,
            marginLeft: state.isPinching ? -5 : -3,
            marginTop: state.isPinching ? -5 : -3,
            background: state.isPinching ? '#00ff88' : 'rgba(255,255,255,0.9)',
            boxShadow: state.isPinching ? '0 0 10px #00ff88' : 'none',
          }}
        />

        {/* Pinch progress ring (for hold gestures) */}
        {state.isPinching && state.pinchStartTime && (
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx={size}
              cy={size}
              r={size - 4}
              fill="none"
              stroke="rgba(0,255,136,0.3)"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * (size - 4)}`}
              strokeDashoffset={`${2 * Math.PI * (size - 4) * (1 - Math.min(1, (Date.now() - state.pinchStartTime) / 1000))}`}
            />
          </svg>
        )}
      </div>
    </div>
  );
}
