import type { TimeValue } from '../../types';

interface Props {
  time: TimeValue;
  size?: number;
  className?: string;
}

const CENTER = 50;
const RADIUS = 46;

function handPoint(angleDeg: number, length: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + Math.cos(rad) * length, y: CENTER + Math.sin(rad) * length };
}

export default function ClockFace({ time, size = 96, className = '' }: Props) {
  const hourAngle = ((time.hour % 12) + time.minute / 60) * 30;
  const minuteAngle = (time.minute / 60) * 360;

  const hourHand = handPoint(hourAngle, 24);
  const minuteHand = handPoint(minuteAngle, 36);

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30;
    const outer = handPoint(angle, RADIUS - 3);
    const inner = handPoint(angle, RADIUS - (i % 3 === 0 ? 10 : 6));
    return { x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y, key: i };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
      <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#1a0e3d" stroke="#ffffff" strokeWidth="3" />
      {ticks.map((t) => (
        <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      ))}
      <line x1={CENTER} y1={CENTER} x2={hourHand.x} y2={hourHand.y} stroke="#F4C430" strokeWidth="4" strokeLinecap="round" />
      <line x1={CENTER} y1={CENTER} x2={minuteHand.x} y2={minuteHand.y} stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <circle cx={CENTER} cy={CENTER} r="3" fill="#F4C430" />
    </svg>
  );
}
