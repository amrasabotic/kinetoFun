"use client";

// Hand control for TV screens: webcam → hand cursor → hold-to-select.
//
// Mounted only by the TV layout, so desktop pages never touch the camera.
// Leaving the TV screens (for example to play a game) unmounts it, which stops
// the camera so the game can open it.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DwellEngine, hasHandTargets } from "./dwell";
import { HandCursor, type HandCursorHandle } from "./HandCursor";
import { HandDebugOverlay, createHandStats, type HandStats } from "./HandDebugOverlay";
import { HandStatusHint } from "./HandStatusHint";
import { OneEuroFilter } from "./one-euro";
import { startHandTracker, type TrackerStatus } from "./tracker";

/**
 * The part of the camera image that maps onto the whole screen. A player
 * standing a few metres away moves their hand in the middle of the frame and
 * should not have to stretch to reach the screen edges. The band sits a little
 * high because a raised hand appears in the upper half of the image.
 */
const REACH = { left: 0.2, right: 0.8, top: 0.12, bottom: 0.72 };

/** A hand missing for less than this is a tracking dropout, not a lowered hand. */
const LOST_GRACE_MS = 250;

/** How often to re-check whether the screen has anything to select. */
const TARGET_CHECK_MS = 500;

// Smoothing in screen pixels; tuned so a held hand is steady over a button
// while a quick sweep across the screen still feels immediate.
const FILTER_MIN_CUTOFF = 1.2;
const FILTER_BETA = 0.004;

interface HandInputContextValue {
  status: TrackerStatus | "off";
  handVisible: boolean;
  /** Disarm dwell briefly, e.g. when a confirmation appears under the hand. */
  rearm: () => void;
}

const HandInputContext = createContext<HandInputContextValue>({
  status: "off",
  handVisible: false,
  rearm: () => {},
});

/** Hand control state. Outside a `HandInputProvider`, status is `"off"`. */
export function useHandInput(): HandInputContextValue {
  return useContext(HandInputContext);
}

function toScreen(camera: number, min: number, max: number, size: number): number {
  return Math.min(1, Math.max(0, (camera - min) / (max - min))) * size;
}

const noSubscribe = () => () => {};
function readDebugFlag(): boolean {
  return new URLSearchParams(window.location.search).get("handdebug") === "1";
}

export function HandInputProvider({ children }: { children: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cursorRef = useRef<HandCursorHandle>(null);
  const engineRef = useRef<DwellEngine | null>(null);
  const statsRef = useRef<HandStats>(createHandStats());

  const [status, setStatus] = useState<TrackerStatus>("loading");
  const [handVisible, setHandVisible] = useState(false);
  const [hasTargets, setHasTargets] = useState(false);
  const debug = useSyncExternalStore(noSubscribe, readDebugFlag, () => false);
  const pathname = usePathname();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const engine = new DwellEngine(performance.now());
    engineRef.current = engine;
    const filterX = new OneEuroFilter(FILTER_MIN_CUTOFF, FILTER_BETA);
    const filterY = new OneEuroFilter(FILTER_MIN_CUTOFF, FILTER_BETA);
    const stats = statsRef.current;

    let point: { x: number; y: number } | null = null;
    let lastSeenAt = -Infinity;
    let visible = false;
    let targetsPresent = false;
    let targetsCheckedAt = -Infinity;
    let raf = 0;

    const stopTracker = startHandTracker({
      video,
      onStatus: setStatus,
      onDelegate: (delegate) => {
        stats.delegate = delegate;
      },
      onSample: (sample) => {
        stats.samples += 1;
        stats.inferenceMsTotal += sample.inferenceMs;
        stats.lastScore = sample.score;
        if (!sample.present) return;

        // The camera faces the player, so the image is mirrored: moving the
        // hand to the player's right must move the cursor right.
        const x = toScreen(1 - sample.x, REACH.left, REACH.right, window.innerWidth);
        const y = toScreen(sample.y, REACH.top, REACH.bottom, window.innerHeight);
        point = { x: filterX.filter(x, sample.timestamp), y: filterY.filter(y, sample.timestamp) };
        lastSeenAt = sample.timestamp;
      },
    });

    // Dwell and the cursor run at display rate; camera samples arrive slower
    // (and much slower on a Pi), and the dwell clock must not depend on them.
    const frame = () => {
      const now = performance.now();
      const seen = point !== null && now - lastSeenAt < LOST_GRACE_MS;
      if (!seen && point) {
        point = null;
        filterX.reset();
        filterY.reset();
      }
      if (seen !== visible) {
        visible = seen;
        setHandVisible(seen);
      }
      if (now - targetsCheckedAt >= TARGET_CHECK_MS) {
        targetsCheckedAt = now;
        const present = hasHandTargets();
        if (present !== targetsPresent) {
          targetsPresent = present;
          setHasTargets(present);
        }
      }
      stats.lastPoint = point;

      const { target, progress } = engine.update(point, now);
      cursorRef.current?.update(point, progress, target !== null);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      stopTracker();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Every new screen starts disarmed, so a hand resting where the new screen
  // puts a button does not select it.
  useEffect(() => {
    engineRef.current?.rearm(performance.now());
  }, [pathname]);

  const rearm = useCallback(() => engineRef.current?.rearm(performance.now()), []);
  const value = useMemo(() => ({ status, handVisible, rearm }), [status, handVisible, rearm]);

  return (
    <HandInputContext.Provider value={value}>
      {children}

      {/* The tracker needs a playing <video>; it is only shown, mirrored like
          a selfie view, in debug mode to help aim the camera. */}
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden
        className={cn(
          "pointer-events-none fixed z-[1001] -scale-x-100",
          debug ? "bottom-4 right-4 w-64 rounded-xl" : "left-0 top-0 h-px w-px opacity-0",
        )}
      />
      <HandCursor ref={cursorRef} />
      <HandStatusHint status={status} handVisible={handVisible} hasTargets={hasTargets} />
      {debug && <HandDebugOverlay statsRef={statsRef} status={status} />}
    </HandInputContext.Provider>
  );
}
