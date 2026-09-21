import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { startHandTracking, type RawHandFrame, type TrackingStatus } from './handTrackingCore';
import { CursorSmoother } from '../systems/gestureEngine';
import type { GestureState } from '../types';

const EMPTY_STATE: GestureState = {
  cursorX: 0.5,
  cursorY: 0.5,
  isHovering: false,
  isPinching: false,
  isPalmOpen: false,
  isThumbsUp: false,
  isVictorySign: false,
};

interface GestureContextValue {
  /** React-state gesture snapshot — safe for menu/HUD UI (re-renders each frame). */
  state: GestureState;
  /** Always-current ref mirroring `state` — read inside RAF loops to avoid re-render churn. */
  stateRef: React.MutableRefObject<GestureState>;
  status: TrackingStatus;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const GestureContext = createContext<GestureContextValue | null>(null);

interface GestureProviderProps {
  children: React.ReactNode;
  /** Settings.cursorSpeed (0..1) — higher tracks the raw hand position more tightly, lower smooths out more jitter. */
  cursorSpeed?: number;
  /** Settings.gestureSensitivity (0..1) — higher widens the pinch trigger distance. */
  pinchSensitivity?: number;
}

export function GestureProvider({ children, cursorSpeed = 0.5, pinchSensitivity = 0.5 }: GestureProviderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stateRef = useRef<GestureState>(EMPTY_STATE);
  const [state, setState] = useState<GestureState>(EMPTY_STATE);
  const [status, setStatus] = useState<TrackingStatus>('initializing');

  // Maps 0..1 cursorSpeed to a 0.2..0.6 EMA smoothing factor — always some
  // smoothing (never raw/jittery), never so much it feels laggy.
  const smoother = useRef(new CursorSmoother(0.2 + cursorSpeed * 0.4));
  const pinchSensitivityRef = useRef(pinchSensitivity);

  useEffect(() => {
    smoother.current.setSmoothing(0.2 + cursorSpeed * 0.4);
  }, [cursorSpeed]);

  useEffect(() => {
    pinchSensitivityRef.current = pinchSensitivity;
  }, [pinchSensitivity]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const stop = startHandTracking({
      video,
      mirror: true,
      pinchSensitivityRef,
      onFrame: (raw: RawHandFrame) => {
        const { x, y } = smoother.current.update(raw.cursorX, raw.cursorY);
        const next: GestureState = {
          cursorX: x,
          cursorY: y,
          isHovering: raw.handCount > 0,
          isPinching: raw.isPinching,
          isPalmOpen: raw.isPalmOpen,
          isThumbsUp: raw.isThumbsUp,
          isVictorySign: raw.isVictorySign,
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
