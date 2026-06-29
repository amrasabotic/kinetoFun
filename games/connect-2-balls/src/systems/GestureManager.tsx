import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';

export type GestureEvent =
  | 'cursorMove'
  | 'hoverStart'
  | 'hoverEnd'
  | 'pinchStart'
  | 'pinchHold'
  | 'pinchRelease'
  | 'openPalm'
  | 'swipeLeft'
  | 'swipeRight'
  | 'swipeUp'
  | 'swipeDown'
  | 'closedFist'
  | 'handLost'
  | 'handDetected';

export interface CursorPosition {
  x: number;
  y: number;
}

export interface GestureEventData {
  type: GestureEvent;
  cursor: CursorPosition;
  timestamp: number;
}

type GestureListener = (event: GestureEventData) => void;

interface GestureManagerState {
  cursor: CursorPosition;
  isPinching: boolean;
  isHandDetected: boolean;
  isFist: boolean;
  isOpenPalm: boolean;
  pinchStartTime: number | null;
  currentGesture: GestureEvent | 'idle';
}

interface GestureContextValue {
  state: GestureManagerState;
  subscribe: (event: GestureEvent, listener: GestureListener) => () => void;
  subscribeAll: (listener: GestureListener) => () => void;
  registerHoverTarget: (id: string, bounds: DOMRect) => void;
  unregisterHoverTarget: (id: string) => void;
  getHoveredTarget: () => string | null;
  settings: GestureSettings;
}

export interface GestureSettings {
  sensitivity: number;
  smoothing: number;
  snapStrength: number;
  leftHanded: boolean;
  pinchThreshold: number;
  holdDuration: number;
  largeCursor: boolean;
}

const defaultSettings: GestureSettings = {
  sensitivity: 1.0,
  smoothing: 0.3,
  snapStrength: 0.4,
  leftHanded: false,
  pinchThreshold: 0.06,
  holdDuration: 800,
  largeCursor: false,
};

const GestureContext = createContext<GestureContextValue | null>(null);

export function useGesture() {
  const ctx = useContext(GestureContext);
  if (!ctx) throw new Error('useGesture must be used within GestureProvider');
  return ctx;
}

export function useGestureEvent(event: GestureEvent, callback: GestureListener) {
  const { subscribe } = useGesture();
  useEffect(() => {
    return subscribe(event, callback);
  }, [event, callback, subscribe]);
}

export function useGestureCursor() {
  const { state } = useGesture();
  return state.cursor;
}

interface GestureProviderProps {
  children: ReactNode;
  settings?: Partial<GestureSettings>;
}

export function GestureProvider({ children, settings: settingsOverride }: GestureProviderProps) {
  const mergedSettings = { ...defaultSettings, ...settingsOverride };
  const [state, setState] = useState<GestureManagerState>({
    cursor: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    isPinching: false,
    isHandDetected: false,
    isFist: false,
    isOpenPalm: false,
    pinchStartTime: null,
    currentGesture: 'idle',
  });

  const listenersRef = useRef<Map<GestureEvent | '_all', Set<GestureListener>>>(new Map());
  const hoverTargetsRef = useRef<Map<string, DOMRect>>(new Map());
  const hoveredTargetRef = useRef<string | null>(null);
  const smoothedCursor = useRef<CursorPosition>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const prevPinchRef = useRef(false);
  const prevFistRef = useRef(false);
  const prevHandDetectedRef = useRef(false);
  const openPalmStartRef = useRef<number | null>(null);
  const fistStartRef = useRef<number | null>(null);
  const prevNormPosRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);

  const emit = useCallback((event: GestureEvent, cursor: CursorPosition) => {
    const data: GestureEventData = { type: event, cursor, timestamp: Date.now() };
    listenersRef.current.get(event)?.forEach((l) => l(data));
    listenersRef.current.get('_all')?.forEach((l) => l(data));
  }, []);

  const subscribe = useCallback((event: GestureEvent, listener: GestureListener) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(listener);
    return () => {
      listenersRef.current.get(event)?.delete(listener);
    };
  }, []);

  const subscribeAll = useCallback((listener: GestureListener) => {
    if (!listenersRef.current.has('_all')) {
      listenersRef.current.set('_all', new Set());
    }
    listenersRef.current.get('_all')!.add(listener);
    return () => {
      listenersRef.current.get('_all')?.delete(listener);
    };
  }, []);

  const registerHoverTarget = useCallback((id: string, bounds: DOMRect) => {
    hoverTargetsRef.current.set(id, bounds);
  }, []);

  const unregisterHoverTarget = useCallback((id: string) => {
    hoverTargetsRef.current.delete(id);
    if (hoveredTargetRef.current === id) {
      hoveredTargetRef.current = null;
    }
  }, []);

  const getHoveredTarget = useCallback(() => hoveredTargetRef.current, []);

  // Magnetic snapping toward nearest hover target
  const applyMagnetism = useCallback((pos: CursorPosition): CursorPosition => {
    let closestDist = Infinity;
    let closestCenter: CursorPosition | null = null;

    hoverTargetsRef.current.forEach((bounds) => {
      const cx = bounds.left + bounds.width / 2;
      const cy = bounds.top + bounds.height / 2;
      const dist = Math.hypot(pos.x - cx, pos.y - cy);
      const snapRadius = Math.max(bounds.width, bounds.height) * mergedSettings.snapStrength;
      if (dist < snapRadius && dist < closestDist) {
        closestDist = dist;
        closestCenter = { x: cx, y: cy };
      }
    });

    if (closestCenter) {
      const center = closestCenter as CursorPosition;
      const strength = 1 - (closestDist / (Math.max(60, closestDist) * 1.5));
      return {
        x: pos.x + (center.x - pos.x) * strength * 0.3,
        y: pos.y + (center.y - pos.y) * strength * 0.3,
      };
    }
    return pos;
  }, [mergedSettings.snapStrength]);

  // Check hover targets
  const updateHover = useCallback((cursor: CursorPosition) => {
    let foundHover: string | null = null;
    hoverTargetsRef.current.forEach((bounds, id) => {
      if (
        cursor.x >= bounds.left &&
        cursor.x <= bounds.right &&
        cursor.y >= bounds.top &&
        cursor.y <= bounds.bottom
      ) {
        foundHover = id;
      }
    });

    if (foundHover !== hoveredTargetRef.current) {
      if (hoveredTargetRef.current) {
        emit('hoverEnd', cursor);
      }
      hoveredTargetRef.current = foundHover;
      if (foundHover) {
        emit('hoverStart', cursor);
      }
    }
  }, [emit]);

  // Process MediaPipe results
  const processResults = useCallback((results: any) => {
    const hasHand = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

    if (!hasHand) {
      if (prevHandDetectedRef.current) {
        prevHandDetectedRef.current = false;
        const cursor = smoothedCursor.current;
        emit('handLost', cursor);
        setState((prev) => ({ ...prev, isHandDetected: false, currentGesture: 'handLost' }));
      }
      return;
    }

    if (!prevHandDetectedRef.current) {
      prevHandDetectedRef.current = true;
      emit('handDetected', smoothedCursor.current);
      setState((prev) => ({ ...prev, isHandDetected: true }));
    }

    const hand = results.multiHandLandmarks[0];
    const indexTip = hand[8];
    const thumbTip = hand[4];

    // Cursor position from index finger
    const rawX = mergedSettings.leftHanded ? indexTip.x : 1 - indexTip.x;
    const rawY = indexTip.y;

    // Smooth
    const smoothFactor = mergedSettings.smoothing * mergedSettings.sensitivity;
    smoothedCursor.current.x += (rawX * window.innerWidth - smoothedCursor.current.x) * smoothFactor;
    smoothedCursor.current.y += (rawY * window.innerHeight - smoothedCursor.current.y) * smoothFactor;

    // Apply magnetism
    const cursor = applyMagnetism({ ...smoothedCursor.current });

    // Emit cursor move
    emit('cursorMove', cursor);
    updateHover(cursor);

    // Pinch detection
    const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    const isPinching = pinchDist < mergedSettings.pinchThreshold;

    if (isPinching && !prevPinchRef.current) {
      emit('pinchStart', cursor);
    } else if (isPinching && prevPinchRef.current) {
      emit('pinchHold', cursor);
    } else if (!isPinching && prevPinchRef.current) {
      emit('pinchRelease', cursor);
    }
    prevPinchRef.current = isPinching;

    // Finger extension detection
    const fingerDistances = [
      Math.hypot(hand[8].y - hand[5].y, hand[8].x - hand[5].x),
      Math.hypot(hand[12].y - hand[9].y, hand[12].x - hand[9].x),
      Math.hypot(hand[16].y - hand[13].y, hand[16].x - hand[13].x),
      Math.hypot(hand[20].y - hand[17].y, hand[20].x - hand[17].x),
    ];
    const allExtended = fingerDistances.every((d) => d > 0.06);

    // Closed fist: all fingers curled
    const allCurled = fingerDistances.every((d) => d < 0.04);
    if (allCurled) {
      if (fistStartRef.current === null) {
        fistStartRef.current = Date.now();
      } else if (Date.now() - fistStartRef.current >= 1000) {
        if (!prevFistRef.current) {
          emit('closedFist', cursor);
          prevFistRef.current = true;
        }
      }
    } else {
      fistStartRef.current = null;
      prevFistRef.current = false;
    }

    // Open palm detection
    if (allExtended && !isPinching) {
      if (openPalmStartRef.current === null) {
        openPalmStartRef.current = Date.now();
      } else if (Date.now() - openPalmStartRef.current >= mergedSettings.holdDuration) {
        emit('openPalm', cursor);
        openPalmStartRef.current = null;
      }
    } else {
      openPalmStartRef.current = null;
    }

    // Swipe detection
    const deltaX = rawX - prevNormPosRef.current.x;
    const deltaY = rawY - prevNormPosRef.current.y;
    const swipeThreshold = 0.12;

    if (allExtended && !isPinching) {
      if (deltaX < -swipeThreshold) emit('swipeLeft', cursor);
      else if (deltaX > swipeThreshold) emit('swipeRight', cursor);
      if (deltaY < -swipeThreshold) emit('swipeUp', cursor);
      else if (deltaY > swipeThreshold) emit('swipeDown', cursor);
    }
    prevNormPosRef.current = { x: rawX, y: rawY };

    // Update state
    setState({
      cursor,
      isPinching,
      isHandDetected: true,
      isFist: allCurled,
      isOpenPalm: allExtended && !isPinching,
      pinchStartTime: isPinching ? (state.pinchStartTime ?? Date.now()) : null,
      currentGesture: isPinching ? 'pinchHold' : allCurled ? 'closedFist' : allExtended ? 'openPalm' : 'idle',
    });
  }, [mergedSettings, emit, updateHover, applyMagnetism]);

  // Initialize MediaPipe
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { Hands } = await import('@mediapipe/hands');

        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.style.display = 'none';
        document.body.appendChild(video);
        videoRef.current = video;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        video.srcObject = stream;
        await video.play();

        const hands = new Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(processResults);
        handsRef.current = hands;

        if (!cancelled) {
          const detect = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              await hands.send({ image: video });
            } catch { /* frame skip */ }
            animFrameRef.current = requestAnimationFrame(detect);
          };
          detect();
        }
      } catch (err: any) {
        console.error('Hand tracking init failed:', err.message);
      }
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach((t) => t.stop());
        videoRef.current.remove();
        videoRef.current = null;
      }
      handsRef.current = null;
    };
  }, [processResults]);

  const contextValue: GestureContextValue = {
    state,
    subscribe,
    subscribeAll,
    registerHoverTarget,
    unregisterHoverTarget,
    getHoveredTarget,
    settings: mergedSettings,
  };

  return (
    <GestureContext.Provider value={contextValue}>
      {children}
    </GestureContext.Provider>
  );
}
