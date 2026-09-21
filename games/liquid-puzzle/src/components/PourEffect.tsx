import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { colorDef } from '../utils/colors';
import type { AnimationQuality } from '../types';

export interface PourEffectSpec {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: number;
}

interface PourEffectProps extends PourEffectSpec {
  quality: AnimationQuality;
  onComplete: (id: number) => void;
}

const SPLASH_PARTICLE_COUNT_HIGH = 8;
const SPLASH_PARTICLE_COUNT_LOW = 3;

/**
 * A two-phase visual flourish layered on top of the instantly-committed
 * board state: an arcing stream from the source tube's rim to the
 * destination's rim, followed by a small splash-particle burst on arrival.
 * The actual liquid amounts are already correct the instant a pour is
 * committed (Tube.tsx's own layout-animated unit list handles that
 * smoothly on its own) — this overlay exists purely for the "beautiful
 * pouring" flourish the brief asks for, decoupled from state correctness.
 */
export function PourEffect({ id, fromX, fromY, toX, toY, color, quality, onComplete }: PourEffectProps) {
  const [phase, setPhase] = useState<'stream' | 'splash'>('stream');
  const streamMs = quality === 'low' ? 260 : 420;
  const splashMs = quality === 'low' ? 180 : 320;
  const hex = colorDef(color).hex;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('splash'), streamMs);
    const t2 = setTimeout(() => onComplete(id), streamMs + splashMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [id, streamMs, splashMs, onComplete]);

  const midX = (fromX + toX) / 2;
  const midY = Math.min(fromY, toY) - 36;

  if (phase === 'stream') {
    return (
      <motion.div
        className="lp-pour-stream"
        style={{ background: hex, boxShadow: `0 0 10px ${hex}` }}
        initial={{ left: fromX, top: fromY, opacity: 0.95 }}
        animate={{ left: [fromX, midX, toX], top: [fromY, midY, toY] }}
        transition={{ duration: streamMs / 1000, ease: 'easeInOut' }}
      />
    );
  }

  const particleCount = quality === 'low' ? SPLASH_PARTICLE_COUNT_LOW : SPLASH_PARTICLE_COUNT_HIGH;
  return (
    <div className="lp-splash" style={{ left: toX, top: toY }}>
      {Array.from({ length: particleCount }).map((_, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const dist = 14 + (i % 3) * 8;
        return (
          <motion.span
            key={i}
            className="lp-splash__particle"
            style={{ background: hex }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 8, opacity: 0, scale: 0.4 }}
            transition={{ duration: splashMs / 1000, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
