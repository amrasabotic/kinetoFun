interface Props {
  progress: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
}

export default function ProgressRing({ progress, size = 64, stroke = 5, color = '#ffffff' }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <svg
      width={size} height={size}
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{ transform: 'translate(-50%, -50%)', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' }}
    >
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.05s linear' }}
      />
    </svg>
  );
}
