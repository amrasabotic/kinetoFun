import type { ShapeId } from '../../types';

function starPoints(cx: number, cy: number, rOuter: number, rInner: number): string {
  const pts: string[] = [];
  const step = Math.PI / 5;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + i * step;
    pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
  }
  return pts.join(' ');
}

interface Props {
  shape: ShapeId;
  color: string;
  className?: string;
}

export default function ShapeIcon({ shape, color, className = '' }: Props) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth={2}>
      {shape === 'circle' && <circle cx={50} cy={50} r={40} />}
      {shape === 'square' && <rect x={14} y={14} width={72} height={72} rx={10} />}
      {shape === 'triangle' && <polygon points="50,10 92,86 8,86" />}
      {shape === 'diamond' && <polygon points="50,6 94,50 50,94 6,50" />}
      {shape === 'star' && <polygon points={starPoints(50, 52, 44, 18)} />}
      {shape === 'heart' && (
        <path d="M50,88 C18,64 4,42 4,25 C4,9 18,-1 34,7 C43,12 48,19 50,26 C52,19 57,12 66,7 C82,-1 96,9 96,25 C96,42 82,64 50,88 Z" />
      )}
    </svg>
  );
}
