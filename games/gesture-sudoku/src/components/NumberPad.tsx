import { useDwellButton } from '../hooks/useDwellButton';

interface NumberButtonProps {
  label: string;
  onActivate: () => void;
  disabled: boolean;
}

function NumberButton({ label, onActivate, disabled }: NumberButtonProps) {
  const { elRef, progress } = useDwellButton(450, disabled ? () => {} : onActivate);
  return (
    <div ref={elRef} className={`gsd-number-btn ${disabled ? 'gsd-number-btn--disabled' : ''}`}>
      <div className="gsd-number-btn__fill" style={{ width: `${disabled ? 0 : progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

interface NumberPadProps {
  onPick: (value: number | null) => void;
  disabled: boolean;
}

export function NumberPad({ onPick, disabled }: NumberPadProps) {
  return (
    <div className="gsd-number-pad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <NumberButton key={n} label={String(n)} onActivate={() => onPick(n)} disabled={disabled} />
      ))}
      <NumberButton label="Erase" onActivate={() => onPick(null)} disabled={disabled} />
    </div>
  );
}
