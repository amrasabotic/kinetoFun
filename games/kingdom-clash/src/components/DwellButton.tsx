import { useRef, useEffect, useState } from 'react';

const DWELL_MS = 820;
const R = 16; // ring radius px

interface Props {
  cursor: { x: number; y: number } | null;
  onActivate: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  dwellMs?: number;
}

export default function DwellButton({
  cursor,
  onActivate,
  disabled = false,
  className = '',
  style,
  children,
  dwellMs = DWELL_MS,
}: Props) {
  const ref       = useRef<HTMLButtonElement>(null);
  const startRef  = useRef<number | null>(null);
  const firedRef  = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (disabled || !cursor || !ref.current) {
      startRef.current = null;
      firedRef.current = false;
      setProgress(0);
      return;
    }

    const rect   = ref.current.getBoundingClientRect();
    const inside = cursor.x >= rect.left && cursor.x <= rect.right &&
                   cursor.y >= rect.top  && cursor.y <= rect.bottom;

    if (!inside) {
      startRef.current = null;
      firedRef.current = false;
      setProgress(0);
      return;
    }

    if (firedRef.current) return;

    if (startRef.current === null) startRef.current = performance.now();
    const p = Math.min((performance.now() - startRef.current) / dwellMs, 1);
    setProgress(p);

    if (p >= 1) {
      firedRef.current = true;
      setProgress(0);
      onActivate();
    }
  });

  const circumference = 2 * Math.PI * R;
  const dash = circumference * progress;

  return (
    <button
      ref={ref}
      className={className}
      style={{ ...style, position: 'relative' }}
      disabled={disabled}
      tabIndex={-1}
    >
      {children}

      {/* dwell ring overlay */}
      {progress > 0 && (
        <svg
          className="pointer-events-none absolute"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            overflow: 'visible',
            zIndex: 10,
          }}
          width={R * 2 + 8}
          height={R * 2 + 8}
          viewBox={`${-R - 4} ${-R - 4} ${R * 2 + 8} ${R * 2 + 8}`}
        >
          {/* track */}
          <circle cx={0} cy={0} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
          {/* fill arc */}
          <circle
            cx={0} cy={0} r={R}
            fill="none"
            stroke="rgba(192,168,85,0.9)"
            strokeWidth={3}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90)"
          />
        </svg>
      )}
    </button>
  );
}
