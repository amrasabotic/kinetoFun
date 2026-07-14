import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { startHandTracking, type RawHandFrame, type TrackingStatus } from './handTrackingCore';
import { CursorSmoother, DurationTracker } from '../systems/gestureEngine';
import type { GestureState } from '../types';

const EMPTY_STATE: GestureState = {
  cursorX: 0.5,
  cursorY: 0.5,
  isHovering: false,
  isOpenPalm: false,
  isFist: false,
  isTwoHandsRaised: false,
};

const TWO_HANDS_HOLD_MS = 700;

interface GestureContextValue {
  /** React-state gesture snapshot — safe for menu/HUD UI (re-renders each frame). */
  state: GestureState;
  /** Always-current ref mirroring `state` — read inside RAF loops to avoid re-render churn. */
  stateRef: React.MutableRefObject<GestureState>;
  status: TrackingStatus;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const GestureContext = createContext<GestureContextValue | null>(null);

export function GestureProvider({ children }: { children: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stateRef = useRef<GestureState>(EMPTY_STATE);
  const [state, setState] = useState<GestureState>(EMPTY_STATE);
  const [status, setStatus] = useState<TrackingStatus>('initializing');

  const smoother = useRef(new CursorSmoother(0.3));
  const twoHandsTracker = useRef(new DurationTracker());

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const stop = startHandTracking({
      video,
      mirror: true,
      onFrame: (raw: RawHandFrame) => {
        const { x, y } = smoother.current.update(raw.cursorX, raw.cursorY);
        const twoHandsDuration = twoHandsTracker.current.update(
          raw.bothHandsOpenAndRaised,
          performance.now(),
        );
        const next: GestureState = {
          cursorX: x,
          cursorY: y,
          isHovering: raw.handCount > 0,
          isOpenPalm: raw.isPalmOpen,
          isFist: raw.isFist,
          isTwoHandsRaised: twoHandsDuration >= TWO_HANDS_HOLD_MS,
        };
        stateRef.current = next;
        setState(next);
      },
      onStatus: setStatus,
    });
    return stop;
  }, []);

  return (
    <GestureContext.Provider value={{ state, stateRef, status, videoRef }}>
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      {children}
    </GestureContext.Provider>
  );
}

export function useGestureContext(): GestureContextValue {
  const ctx = useContext(GestureContext);
  if (!ctx) throw new Error('useGestureContext must be used within GestureProvider');
  return ctx;
}
