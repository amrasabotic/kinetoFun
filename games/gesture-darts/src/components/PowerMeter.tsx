import type { ThrowConfig, ThrowState } from '../types';

interface PowerMeterProps {
  power: number;
  state: ThrowState;
  config: ThrowConfig;
}

export function PowerMeter({ power, state, config }: PowerMeterProps) {
  const drawing = state === 'DRAWING';

  return (
    <div className="gdt-power-meter">
      <div className="gdt-power-meter__track">
        <div className="gdt-power-meter__needed" style={{ left: `${config.requiredPower * 100}%` }} />
        <div
          className={`gdt-power-meter__fill ${drawing ? 'gdt-power-meter__fill--active' : ''}`}
          style={{ width: `${power * 100}%` }}
        />
      </div>
      <span className="gdt-power-meter__label">{drawing ? 'Drawing back…' : 'Hold a fist to draw'}</span>
    </div>
  );
}
