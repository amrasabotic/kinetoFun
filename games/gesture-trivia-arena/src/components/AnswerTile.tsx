import { useDwellButton } from '../hooks/useDwellButton';

const ANSWER_HOLD_MS = 900; // longer than a menu button's 600ms — a wrong pick here actually costs points, so it shouldn't fire on a quick glance

interface AnswerTileProps {
  label: string;
  index: number;
  onSelect: (index: number) => void;
  enabled: boolean;
  state: 'idle' | 'correct' | 'wrong' | 'unselected';
}

export function AnswerTile({ label, index, onSelect, enabled, state }: AnswerTileProps) {
  const { elRef, progress } = useDwellButton(ANSWER_HOLD_MS, () => {
    if (enabled) onSelect(index);
  });

  return (
    <div
      ref={elRef}
      className={`gta-answer-tile gta-answer-tile--${state} ${!enabled ? 'gta-answer-tile--disabled' : ''}`}
    >
      {enabled && <div className="gta-answer-tile__fill" style={{ width: `${progress * 100}%` }} />}
      <span className="gta-answer-tile__label">{label}</span>
    </div>
  );
}
