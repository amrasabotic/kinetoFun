import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DwellButton } from './DwellButton';
import { Cursor } from './Cursor';
import type { GestureState } from '../types';
import { formatTime } from '../utils/helpers';

interface WinOverlayProps {
  stars: 1 | 2 | 3;
  movesUsed: number;
  hintsUsed: number;
  elapsedSeconds: number;
  score: number;
  onNext: (() => void) | null;
  onReplay: () => void;
  onExit: () => void;
  gesture: GestureState;
  reducedMotion: boolean;
}

function Confetti({ reducedMotion }: { reducedMotion: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: reducedMotion ? 12 : 36 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        hue: Math.round(Math.random() * 360),
        delay: Math.random() * 0.6,
        duration: 1.6 + Math.random() * 1.2,
        rotate: Math.random() * 360,
      })),
    [reducedMotion],
  );

  return (
    <div className="lp-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="lp-confetti__piece"
          style={{ left: `${p.left}%`, background: `hsl(${p.hue}, 80%, 60%)` }}
          initial={{ y: -20, opacity: 0, rotate: 0 }}
          animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

export function WinOverlay({ stars, movesUsed, hintsUsed, elapsedSeconds, score, onNext, onReplay, onExit, gesture, reducedMotion }: WinOverlayProps) {
  return (
    <div className="lp-overlay lp-overlay--win">
      <Confetti reducedMotion={reducedMotion} />
      <motion.div
        className="lp-overlay__panel"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <h2 className="lp-overlay__title lp-overlay__title--win">Puzzle Solved!</h2>
        <div className="lp-win-stars">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={`lp-star lp-star--big ${i < stars ? 'lp-star--filled' : ''}`}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2 + i * 0.15, type: 'spring', stiffness: 260, damping: 14 }}
            />
          ))}
        </div>
        <div className="lp-win-stats">
          <span>Moves: {movesUsed}</span>
          <span>Hints: {hintsUsed}</span>
          <span>Time: {formatTime(elapsedSeconds)}</span>
          <span>Score: {score}</span>
        </div>
        <div className="lp-menu__row">
          {onNext && <DwellButton label="Next Level" onActivate={onNext} className="lp-menu-btn lp-menu-btn--primary" />}
          <DwellButton label="Play Again" onActivate={onReplay} className="lp-menu-btn" />
          <DwellButton label="Menu" onActivate={onExit} className="lp-menu-btn lp-menu-btn--warn" />
        </div>
      </motion.div>
      <Cursor gesture={gesture} />
    </div>
  );
}
