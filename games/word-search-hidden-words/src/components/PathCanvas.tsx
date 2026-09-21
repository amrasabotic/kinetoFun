import { memo, useMemo } from 'react';
import type { Vec2 } from '../utils/directions';

interface PathCanvasProps {
  size: number;
  path: Vec2[];
  color: string;
  animated: boolean;
}

/** SVG overlay that draws the traced selection as a smooth animated line across cell centers. */
function PathCanvasImpl({ size, path, color, animated }: PathCanvasProps) {
  const points = useMemo(
    () =>
      path.map((p) => ({
        x: ((p.col + 0.5) / size) * 100,
        y: ((p.row + 0.5) / size) * 100,
      })),
    [path, size],
  );

  if (points.length < 2) return null;

  const d = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

  return (
    <svg className="wsh-path-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path
        d={d}
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className={animated ? 'wsh-path-line wsh-path-line--animated' : 'wsh-path-line'}
      />
      {points.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={1.6} fill={color} />
      ))}
    </svg>
  );
}

export const PathCanvas = memo(PathCanvasImpl);
