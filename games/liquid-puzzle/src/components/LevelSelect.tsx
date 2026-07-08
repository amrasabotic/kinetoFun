import { useState } from 'react';
import { AnimatedBackground } from './AnimatedBackground';
import { DwellButton } from './DwellButton';
import { Cursor } from './Cursor';
import type { GestureState } from '../types';

interface LevelSelectProps {
  highestUnlocked: number;
  levelStars: Record<number, 1 | 2 | 3>;
  onPick: (level: number) => void;
  onBack: () => void;
  gesture: GestureState;
}

const PAGE_SIZE = 20;
const TOTAL_LEVELS = 200;

function Stars({ count }: { count?: 1 | 2 | 3 }) {
  return (
    <div className="lp-level-card__stars">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`lp-star ${count !== undefined && i < count ? 'lp-star--filled' : ''}`} />
      ))}
    </div>
  );
}

export function LevelSelect({ highestUnlocked, levelStars, onPick, onBack, gesture }: LevelSelectProps) {
  const [page, setPage] = useState(() => Math.floor((highestUnlocked - 1) / PAGE_SIZE));
  const pageCount = Math.ceil(TOTAL_LEVELS / PAGE_SIZE);
  const start = page * PAGE_SIZE + 1;
  const levels = Array.from({ length: PAGE_SIZE }, (_, i) => start + i).filter((l) => l <= TOTAL_LEVELS);

  return (
    <div className="lp-screen">
      <AnimatedBackground />
      <div className="lp-level-select">
        <h2 className="lp-screen__title">Level Select</h2>
        <div className="lp-level-grid">
          {levels.map((level) => {
            const unlocked = level <= highestUnlocked;
            return (
              <DwellButton
                key={level}
                disabled={!unlocked}
                onActivate={() => onPick(level)}
                className={`lp-level-card ${!unlocked ? 'lp-level-card--locked' : ''}`}
                label={
                  <div className="lp-level-card__inner">
                    <span className="lp-level-card__number">{level}</span>
                    {unlocked ? <Stars count={levelStars[level]} /> : <span className="lp-level-card__lock" aria-label="Locked" />}
                  </div>
                }
              />
            );
          })}
        </div>
        <div className="lp-level-select__nav">
          <DwellButton label="◀ Prev" disabled={page === 0} onActivate={() => setPage((p) => Math.max(0, p - 1))} className="lp-menu-btn" />
          <span className="lp-level-select__page">
            Page {page + 1} / {pageCount}
          </span>
          <DwellButton
            label="Next ▶"
            disabled={page >= pageCount - 1}
            onActivate={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="lp-menu-btn"
          />
        </div>
        <DwellButton label="Back" onActivate={onBack} className="lp-menu-btn lp-menu-btn--warn" />
      </div>
      <Cursor gesture={gesture} />
    </div>
  );
}
