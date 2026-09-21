import { useMemo } from 'react';
import type { SwingSnapshot } from '../types';
import { PIN_LAYOUT } from '../types';
import { lerp } from '../utils/helpers';

interface LaneProps {
  swing: SwingSnapshot;
  standingPinIds: number[];
}

const LANE_TO_PERCENT = 22; // percent-of-width per unit of lateral offset
const PIN_Y_BY_ROW = [20, 15, 10, 5]; // row 0 (headpin) closest to the bowler, row 3 furthest

function toPercent(lateral: number) {
  return 50 + lateral * LANE_TO_PERCENT;
}

export function Lane({ swing, standingPinIds }: LaneProps) {
  const showAimLine = swing.state === 'READY' || swing.state === 'BACKSWING';
  const isRolling = swing.state === 'ROLLING';
  const showResult = swing.state === 'RESOLVED';

  const ballX = isRolling || showResult ? toPercent(swing.ballLateral) : toPercent(swing.lanePosition);
  const ballY = isRolling || showResult ? lerp(94, 9, swing.rollProgress) : 92;

  const knockedThisRoll = useMemo(
    () => new Set(showResult && swing.outcome ? swing.outcome.knockedPinIds : []),
    [showResult, swing.outcome],
  );

  return (
    <div className="gbl-lane-wrap">
      <div className="gbl-lane">
        <div className="gbl-lane__arrows">
          {[-1, -0.5, 0, 0.5, 1].map((v) => (
            <div key={v} className="gbl-lane__arrow" style={{ left: `${toPercent(v * 0.6)}%` }} />
          ))}
        </div>

        {PIN_LAYOUT.map((pin) => {
          const standing = standingPinIds.includes(pin.id);
          const justKnocked = knockedThisRoll.has(pin.id);
          return (
            <div
              key={pin.id}
              className={`gbl-pin ${standing ? '' : 'gbl-pin--down'} ${justKnocked ? 'gbl-pin--falling' : ''}`}
              style={{ left: `${toPercent(pin.lateral)}%`, top: `${PIN_Y_BY_ROW[pin.row]}%` }}
            />
          );
        })}

        {showAimLine && (
          <div
            className="gbl-aim-line"
            style={{ left: `${toPercent(swing.lanePosition)}%`, top: '20%', height: '72%' }}
          />
        )}

        <div className="gbl-ball" style={{ left: `${ballX}%`, top: `${ballY}%` }} />

        <div className="gbl-foul-line" />
      </div>
    </div>
  );
}
