import { AnimatePresence } from 'framer-motion';
import { Tube } from './Tube';
import { PourEffect, type PourEffectSpec } from './PourEffect';
import type { AnimationQuality, Board, Move } from '../types';

interface GameBoardProps {
  board: Board;
  hoveredIndex: number | null;
  grabbedIndex: number | null;
  hintMove: Move | null;
  rejectingIndex: number | null;
  colorblindMode: boolean;
  animationQuality: AnimationQuality;
  tubeRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  pourEffects: PourEffectSpec[];
  onPourEffectComplete: (id: number) => void;
}

export function GameBoard({
  board,
  hoveredIndex,
  grabbedIndex,
  hintMove,
  rejectingIndex,
  colorblindMode,
  animationQuality,
  tubeRefs,
  pourEffects,
  onPourEffectComplete,
}: GameBoardProps) {
  const reducedMotion = animationQuality === 'low';

  return (
    <div className="lp-board">
      {board.map((tube, i) => (
        <Tube
          key={i}
          index={i}
          colors={tube.colors}
          isHovered={hoveredIndex === i}
          isGrabbed={grabbedIndex === i}
          isHintSource={hintMove?.from === i}
          isHintTarget={hintMove?.to === i}
          isRejecting={rejectingIndex === i}
          colorblindMode={colorblindMode}
          reducedMotion={reducedMotion}
          tubeRef={(el) => {
            tubeRefs.current[i] = el;
          }}
        />
      ))}

      <AnimatePresence>
        {pourEffects.map((effect) => (
          <PourEffect key={effect.id} {...effect} quality={animationQuality} onComplete={onPourEffectComplete} />
        ))}
      </AnimatePresence>
    </div>
  );
}
