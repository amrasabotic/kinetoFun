import { useCallback, useRef } from 'react';
import HandCursor, { type HandPoint } from './HandCursor';
import { useHandTracking } from './useHandTracking';
import type { HandState } from './types';

/**
 * Hand cursor for the screens around the kitchen (start, How to Play, order
 * and result). The game is played on a TV with no mouse, so these buttons
 * are pressed by holding the hand over them. It owns its camera feed and is
 * unmounted during baking, which runs its own.
 */
export default function MenuHandCursor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointRef = useRef<HandPoint>(null);

  const onHandUpdate = useCallback((state: HandState) => {
    pointRef.current = state.isTracking && state.cursorX >= 0
      ? { x: state.cursorX, y: state.cursorY }
      : null;
  }, []);
  useHandTracking(videoRef, onHandUpdate, true);

  const getPoint = useCallback(() => pointRef.current, []);

  return (
    <>
      <video ref={videoRef} className="hidden" playsInline muted />
      <HandCursor getPoint={getPoint} />
    </>
  );
}
