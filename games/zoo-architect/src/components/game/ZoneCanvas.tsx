import type { CSSProperties } from 'react';
import type { ZoneDef } from '../../data/zones';
import type { PlacedItem } from '../../types';
import { itemById } from '../../data/zooItems';

export interface Gain {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface Props {
  zone: ZoneDef;
  placedItems: PlacedItem[];
  /** Index into placedItems of each animal that is happy. */
  happy: Set<number>;
  /** Index of the animal being fed and how far along (0..1). */
  feeding: { index: number; progress: number } | null;
  /** Indexes of animals still full from their last meal. */
  full: Set<number>;
  /** Index of an animal that has just been fed, to play its jump. */
  jumping: number | null;
  gains: Gain[];
  visitors: number;
  canvasRef: (el: HTMLDivElement | null) => void;
  animalRef: (index: number, el: HTMLDivElement | null) => void;
}

const VISITORS = ['🧒', '👩', '👨‍🦳', '👧', '🧑', '👵'];

// Spreads timings per item so a habitat full of animals never moves in step.
function spread(i: number, base: number) {
  return { '--zoo-dur': `${base + (i * 37) % 5}s`, '--zoo-delay': `-${(i * 53) % 7}s` } as CSSProperties;
}

export default function ZoneCanvas({
  zone, placedItems, happy, feeding, full, jumping, gains, visitors, canvasRef, animalRef,
}: Props) {
  const swims = zone.id === 'ocean';
  return (
    <div
      ref={canvasRef}
      className={`relative w-full flex-1 rounded-2xl border border-white/15 bg-gradient-to-br ${zone.theme} overflow-hidden`}
    >
      {placedItems.map((p, i) => {
        const item = itemById(p.itemId);
        if (!item) return null;
        const animal = item.kind === 'animal';
        const motion = !animal ? 'zoo-sway' : swims ? 'zoo-swim' : 'zoo-wander';
        const fed = feeding?.index === i ? feeding.progress : 0;
        return (
          <div
            key={`${p.itemId}-${i}`}
            className="absolute select-none pointer-events-none"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: 'translate(-50%, -50%)', zIndex: Math.round(p.y * 100) }}
          >
            <div className={motion} style={spread(i, animal ? 8 : 4)}>
              <div
                ref={animal ? (el) => animalRef(i, el) : undefined}
                className={`relative drop-shadow-lg ${animal ? 'text-6xl' : 'text-5xl'} ${jumping === i ? 'zoo-jump' : ''}`}
              >
                {item.emoji}
                {fed > 0 && (
                  <svg className="absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="none" stroke="#FDE047" strokeWidth="3" strokeDasharray={`${fed * 113} 113`} strokeLinecap="round" />
                  </svg>
                )}
              </div>
            </div>
            {animal && (happy.has(i) || full.has(i)) && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl">
                {happy.has(i) ? '❤️' : ''}{full.has(i) ? '😋' : ''}
              </div>
            )}
          </div>
        );
      })}

      {visitors > 0 && (
        <div className="absolute bottom-1 left-0 right-0 h-14 pointer-events-none" style={{ containerType: 'inline-size' }}>
          {Array.from({ length: visitors }, (_, i) => (
            <div key={i} className="zoo-walk absolute bottom-0 left-0 text-4xl" style={spread(i * 3, 16)}>
              {VISITORS[i % VISITORS.length]}
            </div>
          ))}
        </div>
      )}

      {gains.map((g) => (
        <div
          key={g.id}
          className="zoo-float-up absolute text-2xl font-extrabold text-yellow-200 drop-shadow pointer-events-none"
          style={{ left: g.x, top: g.y, zIndex: 200 }}
        >
          {g.text}
        </div>
      ))}

      {placedItems.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-white/60 text-xl text-center px-8">
          Hold your hand on an animal below to pick it up, then hold still here to place it
        </p>
      )}
    </div>
  );
}
