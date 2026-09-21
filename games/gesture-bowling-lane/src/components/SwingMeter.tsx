import type { SwingState } from '../types';

interface SwingMeterProps {
  power: number;
  state: SwingState;
}

const STATE_LABEL: Record<SwingState, string> = {
  READY: 'Move your hand to aim, then raise it to start your swing',
  BACKSWING: 'Winding up…',
  FORWARD_SWING: 'Swing down to release!',
  ROLLING: 'Rolling…',
  RESOLVED: '',
};

export function SwingMeter({ power, state }: SwingMeterProps) {
  const showPower = state === 'FORWARD_SWING' || state === 'ROLLING' || state === 'RESOLVED';

  return (
    <div className="gbl-swing-meter">
      <div className="gbl-swing-meter__track">
        <div className={`gbl-swing-meter__fill ${state === 'FORWARD_SWING' ? 'gbl-swing-meter__fill--active' : ''}`} style={{ width: `${(showPower ? power : 0) * 100}%` }} />
      </div>
      <span className="gbl-swing-meter__label">{STATE_LABEL[state]}</span>
    </div>
  );
}
