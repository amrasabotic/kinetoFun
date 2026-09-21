import { useMemo } from 'react';

/** Shared floating-bubble backdrop for every menu screen — pure CSS keyframe animation, no per-frame JS, so it never competes with the gesture RAF loops for perf. */
export function AnimatedBackground() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: Math.round((i * 137.5) % 100),
        size: 18 + ((i * 53) % 60),
        duration: 14 + ((i * 7) % 12),
        delay: (i * 1.7) % 10,
      })),
    [],
  );

  return (
    <div className="lp-bg" aria-hidden="true">
      <div className="lp-bg__gradient" />
      <div className="lp-bg__waves" />
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="lp-bg__bubble"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
