import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { getHandLandmarker } from "@/lib/hand-tracker";

/*
 * One camera + hand tracker for the whole game, started as soon as it loads.
 * The game is played on TVs with no mouse, so menus are hand-controlled too:
 * the paddle follows the palm during play, and buttons are pressed by resting
 * the fingertip cursor on them (see DwellCursor).
 */

export interface HandSample {
  /** Raw landmarks of the tracked hand (not mirrored), or null when no hand is visible. */
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  /** Mirrored, normalised 0..1 palm centre — drives the paddle. */
  palmX: number | null;
  /** Mirrored, normalised 0..1 index fingertip — drives the menu cursor. */
  tipX: number | null;
  tipY: number | null;
}

type Status = "loading" | "ready" | "denied" | "error";

interface HandContextValue {
  sample: MutableRefObject<HandSample>;
  stream: MediaStream | null;
  status: Status;
}

const HandContext = createContext<HandContextValue | null>(null);

export function useHand(): HandContextValue {
  const ctx = useContext(HandContext);
  if (!ctx) throw new Error("useHand must be used inside HandProvider");
  return ctx;
}

const CURSOR_ALPHA = 0.45;

export function HandProvider({ children }: { children: ReactNode }) {
  const sample = useRef<HandSample>({ landmarks: null, palmX: null, tipX: null, tipY: null });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    let media: MediaStream | null = null;
    let raf = 0;

    (async () => {
      try {
        const hl = await getHandLandmarker();
        media = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { media.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current!;
        video.srcObject = media;
        await video.play();
        setStream(media);
        setStatus("ready");

        let lastTs = 0;
        const loop = () => {
          if (cancelled) return;
          raf = requestAnimationFrame(loop);
          const v = videoRef.current;
          const ts = performance.now();
          if (!v || v.readyState < 2 || ts - lastTs < 16) return;
          lastTs = ts;
          const res = hl.detectForVideo(v, ts);
          const s = sample.current;
          const pts = res.landmarks?.[0];
          if (pts) {
            s.landmarks = pts;
            s.palmX = 1 - pts[9].x;
            const tx = 1 - pts[8].x;
            const ty = pts[8].y;
            s.tipX = s.tipX == null ? tx : s.tipX + (tx - s.tipX) * CURSOR_ALPHA;
            s.tipY = s.tipY == null ? ty : s.tipY + (ty - s.tipY) * CURSOR_ALPHA;
          } else {
            s.landmarks = null;
            s.palmX = null;
            s.tipX = null;
            s.tipY = null;
          }
        };
        raf = requestAnimationFrame(loop);
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus((e as Error).name === "NotAllowedError" ? "denied" : "error");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      media?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <HandContext.Provider value={{ sample, stream, status }}>
      {children}
      <video
        ref={videoRef}
        playsInline
        muted
        aria-hidden
        className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px opacity-0"
      />
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
export function DwellCursor({ visible }: { visible: boolean }) {
  const { sample } = useHand();
  const dotRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    let raf = 0;
    let target: HTMLElement | null = null;
    let start = 0;
    let armedAt = performance.now() + ARM_MS;

    const release = () => {
      target?.style.setProperty("--dwell", "0");
      target = null;
    };

    // Re-arm whenever new pressable elements appear (a new screen or overlay).
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
      const { tipX, tipY } = sample.current;
      if (tipX == null || tipY == null) {
        dot.style.opacity = "0";
        release();
        return;
      }
      const x = tipX * window.innerWidth;
      const y = tipY * window.innerHeight;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      dot.style.opacity = visibleRef.current ? "1" : "0";

      const now = performance.now();
      const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-dwell]") ?? null;
      if (hit !== target) {
        release();
        target = hit;
        start = now;
      }
      if (!target) return;
      if (now < armedAt || (target as HTMLButtonElement).disabled) {
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
  }, [sample]);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] -ml-4 -mt-4 h-8 w-8 rounded-full border-4 border-primary bg-primary/30 shadow-[0_0_18px_var(--primary)] transition-opacity"
      style={{ opacity: 0 }}
    />
  );
}
