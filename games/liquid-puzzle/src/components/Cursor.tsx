import type { GestureState } from '../types';

interface CursorProps {
  gesture: GestureState;
}

/**
 * A custom glowing cursor with a soft trailing halo — the trail is a second,
 * more slowly-transitioning ring layered under a fast-transitioning core dot
 * (pure CSS transition-duration difference, not a physics trail), which
 * reads as a soft trail without needing per-frame history tracking. The
 * cursor always renders at the real tracked hand position — no
 * "magnetic snapping" toward nearby tubes, since moving the dot away from
 * where the hand actually is would undercut the "player always knows the
 * gesture was recognized" requirement; a hovered tube enlarging slightly
 * (see Tube.tsx) gives the same magnetic *feel* without that honesty cost.
 */
export function Cursor({ gesture }: CursorProps) {
  if (!gesture.isHovering) return null;

  const pose = gesture.isPinching
    ? 'pinch'
    : gesture.isThumbsUp
      ? 'thumbsup'
      : gesture.isVictorySign
        ? 'victory'
        : gesture.isPalmOpen
          ? 'palm'
          : 'neutral';

  const left = `${gesture.cursorX * 100}%`;
  const top = `${gesture.cursorY * 100}%`;

  return (
    <div className={`lp-cursor lp-cursor--${pose}`} style={{ left, top }}>
      <div className="lp-cursor__trail" />
      <div className="lp-cursor__core" />
    </div>
  );
}
