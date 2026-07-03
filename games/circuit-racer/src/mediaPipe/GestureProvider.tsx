import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { HandFrame } from '../types';
import { startHandTracking, type TrackingStatus } from './handTrackingCore';
import { useSettingsStore } from '../stores/settingsStore';

const EMPTY_FRAME: HandFrame = {
  detected: false, confidence: 0, cursorX: 0.5, cursorY: 0.5,
  indexZ: 0, isPalmOpen: false, isFist: false, isPinching: false,
};

interface GestureContextValue {
  /** React-state hand frame — safe to use for hover/menu UI (re-renders on every detection). */
  frame: HandFrame;
  /** Always-current ref to the same data — read this inside RAF game loops to avoid re-renders. */
  frameRef: React.MutableRefObject<HandFrame>;
  status: TrackingStatus;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const GestureContext = createContext<GestureContextValue | null>(null);

export function GestureProvider({ children }: { children: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HandFrame>(EMPTY_FRAME);
  const [frame, setFrame] = useState<HandFrame>(EMPTY_FRAME);
  const [status, setStatus] = useState<TrackingStatus>('initializing');
  const mirror = useSettingsStore((s) => s.mirrorCamera);
  const slower = useSettingsStore((s) => s.slowerPace);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const smoothing = slower ? 0.18 : 0.35;
    const stop = startHandTracking({
      video,
      mirror,
      smoothing,
      onFrame: (f) => { frameRef.current = f; setFrame(f); },
      onStatus: setStatus,
    });
    return stop;
  }, [mirror, slower]);

  return (
    <GestureContext.Provider value={{ frame, frameRef, status, videoRef }}>
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      {children}
    </GestureContext.Provider>
  );
}

export function useGesture(): GestureContextValue {
  const ctx = useContext(GestureContext);
  if (!ctx) throw new Error('useGesture must be used within GestureProvider');
  return ctx;
}
