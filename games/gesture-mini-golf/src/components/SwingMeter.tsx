import type { SwingState } from '../types';

interface SwingMeterProps {
  power: number;
  state: SwingState;
}

const STATE_LABEL: Record<SwingState, string> = {
  READY: 'Point where you want to putt, then make a fist to charge',
  CHARGING: 'Charging… release your fist to putt!',
  ROLLING: 'Rolling…',
  RESOLVED: '',
};

export function SwingMeter({ power, state }: SwingMeterProps) {
  const showPower = state === 'CHARGING' || state === 'ROLLING' || state === 'RESOLVED';

  return (
    <div className="gmg-swing-meter">
      <div className="gmg-swing-meter__track">
        <div
          className={`gmg-swing-meter__fill ${state === 'CHARGING' ? 'gmg-swing-meter__fill--active' : ''}`}
          style={{ width: `${(showPower ? power : 0) * 100}%` }}
        />
      </div>
      <span className="gmg-swing-meter__label">{STATE_LABEL[state]}</span>
    </div>
  );
}
