import { useMemo } from 'react';
import type { RoundConfig, ShotSnapshot } from '../types';
import { SCORE_RINGS } from '../types';
import { lerp } from '../utils/helpers';

interface RangeProps {
  config: RoundConfig;
  shot: ShotSnapshot;
  stuckArrows: { x: number; y: number }[];
}

const RING_COLORS: Record<string, string> = {
  bullseye: '#facc15',
  inner: '#f87171',
  mid: '#60a5fa',
  outer: '#f5f3ff',
};

export function Range({ config, shot, stuckArrows }: RangeProps) {
  const rings = useMemo(() => [...SCORE_RINGS].reverse(), []);
  const showReticle = shot.state === 'AIMING' || shot.state === 'DRAWING';
  const showArrow = shot.state === 'IN_FLIGHT';
  const showImpact = (shot.state === 'IN_FLIGHT' || shot.state === 'RESOLVED') && shot.impact;

  // Reticle/impact positions are expressed as a fraction of the target's outer-ring radius.
  const toPct = (v: number) => 50 + v * 50;

  const arrowX = shot.impact ? lerp(toPct(shot.aim.x), toPct(shot.impact.x), shot.flightProgress) : 50;
  const arrowY = shot.impact ? lerp(100, toPct(shot.impact.y), shot.flightProgress) : 100;

  return (
    <div className="gar-range">
      <div className="gar-target" style={{ width: `${config.targetRadius * 200}vmin`, height: `${config.targetRadius * 200}vmin` }}>
        {rings.map((r) => (
          <div
            key={r.result}
            className="gar-ring"
            style={{
              width: `${r.radiusFraction * 100}%`,
              height: `${r.radiusFraction * 100}%`,
              background: RING_COLORS[r.result],
            }}
          />
        ))}

        {stuckArrows.map((a, i) => (
          <div key={i} className="gar-stuck-arrow" style={{ left: `${toPct(a.x)}%`, top: `${toPct(a.y)}%` }} />
        ))}

        {showImpact && shot.impact && (
          <div
            className={`gar-impact-mark gar-impact-mark--${shot.result}`}
            style={{ left: `${toPct(shot.impact.x)}%`, top: `${toPct(shot.impact.y)}%`, opacity: shot.state === 'RESOLVED' ? 1 : shot.flightProgress }}
          />
        )}

        {showReticle && (
          <div
            className="gar-reticle"
            style={{ left: `${toPct(shot.aim.x)}%`, top: `${toPct(shot.aim.y)}%` }}
          />
        )}

        {showArrow && (
          <div className="gar-arrow-flight" style={{ left: `${arrowX}%`, top: `${arrowY}%` }} />
        )}
      </div>
    </div>
  );
}
