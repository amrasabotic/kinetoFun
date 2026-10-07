import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { startHandTracking, type HandTracker, type HandTrackingState } from "@/lib/hand-tracking";

/*
 * One camera + hand tracker for the whole game, started as soon as it loads.
 * The game is played on TVs with no mouse, so every screen is hand-controlled:
 * the board uses the fingertip and pinch directly, and buttons elsewhere are
 * pressed by resting the hand cursor on them (see DwellCursor).
 */

type Status = "loading" | "active" | "error";
type Listener = (s: HandTrackingState) => void;

interface HandContextValue {
  status: Status;
  video: HTMLVideoElement | null;
  /** Latest sample, updated every tracked frame without re-rendering. */
  latest: React.MutableRefObject<HandTrackingState>;
  subscribe: (fn: Listener) => () => void;
  retry: () => void;
  /** Screens with their own pointer (the board) hide the global cursor while active. */
  setCursorHidden: (hidden: boolean) => void;
  cursorHidden: boolean;
}

const HandContext = createContext<HandContextValue | null>(null);

export function useHand(): HandContextValue {
  const ctx = useContext(HandContext);
  if (!ctx) throw new Error("useHand must be used inside HandProvider");
  return ctx;
}

const EMPTY: HandTrackingState = { point: null, pinch: false, landmarks: null };

export function HandProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [cursorHidden, setCursorHidden] = useState(false);
  const latest = useRef<HandTrackingState>(EMPTY);
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    let cancelled = false;
    let tracker: HandTracker | null = null;
    setStatus("loading");
    startHandTracking((s) => {
      latest.current = s;
      listeners.current.forEach((fn) => fn(s));
    })
      .then((t) => {
        if (cancelled) { t.stop(); return; }
        tracker = t;
        setVideo(t.video);
        setStatus("active");
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      tracker?.stop();
      latest.current = EMPTY;
    };
  }, [attempt]);

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => { listeners.current.delete(fn); };
  }, []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <HandContext.Provider
      value={{ status, video, latest, subscribe, retry, setCursorHidden, cursorHidden }}
    >
      {children}
      <DwellCursor />
    </HandContext.Provider>
  );
}

const DWELL_MS = 900;
// Buttons ignore the hand for a moment after a screen or overlay appears, so a
// hand already resting where a button is drawn cannot press it by accident.
const ARM_MS = 1500;

/**
 * Hand cursor plus hover-to-press for every element marked `data-dwell`.
 * `data-dwell="1500"` sets a custom hold time in ms; an empty value uses the
 * default. Progress is exposed to CSS as `--dwell` (0..1) on the element.
 */
function DwellCursor() {
  const { latest, cursorHidden } = useHand();
  const dotRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef(cursorHidden);
  hiddenRef.current = cursorHidden;

  useEffect(() => {
    let raf = 0;
    let target: HTMLElement | null = null;
    let start = 0;
    let armedAt = performance.now() + ARM_MS;

    const release = () => {
      target?.style.setProperty("--dwell", "0");
      target = null;
    };

    // Re-arm whenever new pressable elements appear (route change, overlay…).
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of Array.from(r.addedNodes)) {
          if (n instanceof HTMLElement && (n.matches("[data-dwell]") || n.querySelector("[data-dwell]"))) {
            armedAt = performance.now() + ARM_MS;
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dot = dotRef.current;
      if (!dot) return;
      const { point, pinch } = latest.current;
      if (!point) {
        dot.style.opacity = "0";
        release();
        return;
      }
      const x = point.x * window.innerWidth;
      const y = point.y * window.innerHeight;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      dot.style.opacity = hiddenRef.current ? "0" : "1";

      const now = performance.now();
      const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-dwell]") ?? null;
      if (hit !== target) {
        release();
        target = hit;
        start = now;
      }
      if (!target) return;
      // A pinch means the player is drawing, never pressing a button.
      if (pinch || now < armedAt || (target as HTMLButtonElement).disabled) {
        target.style.setProperty("--dwell", "0");
        start = now;
        return;
      }
      const ms = Number(target.dataset.dwell) || DWELL_MS;
      const p = Math.min(1, (now - start) / ms);
      target.style.setProperty("--dwell", String(p));
      if (p >= 1) {
        const pressed = target;
        release();
        armedAt = now + ARM_MS;
        pressed.click();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      release();
    };
  }, [latest]);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] -ml-4 -mt-4 size-8 rounded-full border-4 border-[color:var(--neon-cyan)] bg-[color:var(--neon-cyan)]/20 shadow-[0_0_18px_var(--neon-cyan)] transition-opacity"
      style={{ opacity: 0 }}
    />
  );
}
