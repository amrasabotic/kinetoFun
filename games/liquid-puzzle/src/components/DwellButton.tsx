import { useDwellButton } from '../hooks/useDwellButton';

interface DwellButtonProps {
  label: React.ReactNode;
  holdMs?: number;
  onActivate: () => void;
  className?: string;
  disabled?: boolean;
}

/** The one button component every menu/HUD control in this game uses — hover-dwell only, no clicks anywhere, matching the platform-wide convention. */
export function DwellButton({ label, holdMs = 600, onActivate, className, disabled }: DwellButtonProps) {
  const { elRef, progress } = useDwellButton(holdMs, disabled ? () => {} : onActivate);
  return (
    <div ref={elRef} className={`lp-dwell-btn ${disabled ? 'lp-dwell-btn--disabled' : ''} ${className ?? ''}`}>
      <div className="lp-dwell-btn__fill" style={{ width: `${(disabled ? 0 : progress) * 100}%` }} />
      <span className="lp-dwell-btn__label">{label}</span>
    </div>
  );
}
