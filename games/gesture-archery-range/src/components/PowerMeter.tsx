import type { RoundConfig, ShotState } from '../types';
import { requiredPower } from '../systems/physics';

interface PowerMeterProps {
  power: number;
  state: ShotState;
  config: RoundConfig;
}

export function PowerMeter({ power, state, config }: PowerMeterProps) {
  const needed = requiredPower(config.distance);
  const drawing = state === 'DRAWING';

  return (
    <div className="gar-power-meter">
      <div className="gar-power-meter__track">
        <div className="gar-power-meter__needed" style={{ left: `${needed * 100}%` }} />
        <div
          className={`gar-power-meter__fill ${drawing ? 'gar-power-meter__fill--active' : ''}`}
          style={{ width: `${power * 100}%` }}
        />
      </div>
      <span className="gar-power-meter__label">{drawing ? 'Drawing…' : 'Hold a fist to draw'}</span>
    </div>
  );
}
