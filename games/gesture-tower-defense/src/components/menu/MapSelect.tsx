import HoverButton from '../common/HoverButton';
import { CAMPAIGN_LEVEL_COUNT } from '../../systems/campaign';

interface MapSelectProps {
  highestUnlocked: number;
  stars: Record<number, 1 | 2 | 3>;
  onPick: (level: number) => void;
  onBack: () => void;
}

function Stars({ count }: { count?: 1 | 2 | 3 }) {
  return (
    <div className="td-stars">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`td-star ${count !== undefined && i < count ? 'td-star--filled' : ''}`} />
      ))}
    </div>
  );
}

export default function MapSelect({ highestUnlocked, stars, onPick, onBack }: MapSelectProps) {
  const levels = Array.from({ length: CAMPAIGN_LEVEL_COUNT }, (_, i) => i + 1);
  return (
    <div className="td-screen td-menu">
      <h2 className="td-screen__title">Campaign</h2>
      <div className="td-level-grid">
        {levels.map((level) => {
          const unlocked = level <= highestUnlocked;
          return (
            <HoverButton
              key={level}
              disabled={!unlocked}
              onActivate={() => onPick(level)}
              className={`td-level-card ${!unlocked ? 'td-level-card--locked' : ''}`}
            >
              <span className="td-level-card__number">{level}</span>
              {unlocked ? <Stars count={stars[level]} /> : <span className="td-level-card__lock" />}
            </HoverButton>
          );
        })}
      </div>
      <HoverButton onActivate={onBack} ringColor="#F87171" className="td-menu-btn td-menu-btn--warn">
        Back
      </HoverButton>
    </div>
  );
}
