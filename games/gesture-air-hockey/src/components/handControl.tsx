/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";

/*
 * One camera + hand landmarker shared by the whole game, so the menus and
 * the match are both hand-controlled. The game runs on TVs with no mouse:
 * menu buttons are pressed by resting the hand cursor on them (see
 * DwellCursor), and the mallet follows the palm during a match.
 */

export interface HandSample {
  /** Index fingertip, mirrored and normalised to 0..1 — drives the menu cursor. Null when no hand is visible. */
  cursorX: number | null;
  cursorY: number | null;
  /** Palm centre, mirrored and normalised to 0..1 — drives the mallet. Keeps its last value when the hand is lost. */
  palmX: number | null;
  palmY: number | null;
}

interface HandContextValue {
  hand: MutableRefObject<HandSample>;
  stream: MediaStream | null;
  ready: boolean;
  error: string | null;
}

const HandContext = createContext<HandContextValue | null>(null);

export function useHand(): HandContextValue {
  const ctx = useContext(HandContext);
  if (!ctx) throw new Error("useHand must be used inside HandProvider");
  return ctx;
}

// Palm landmarks averaged for a steady mallet: wrist, index/middle/ring/pinky MCP.
const PALM_IDS = [0, 5, 9, 13, 17];
const INDEX_TIP = 8;
// Exponential smoothing: higher follows the hand faster, lower is steadier.
const PALM_ALPHA = 0.55;
const CURSOR_ALPHA = 0.45;

export function HandProvider({ children }: { children: ReactNode }) {
  const hand = useRef<HandSample>({ cursorX: null, cursorY: null, palmX: null, palmY: null });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let media: MediaStream | null = null;
    let landmarker: any = null;
    let rafId = 0;

    async function init() {
      try {
        media = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user", frameRate: { ideal: 60, max: 60 } },
          audio: false,
        });
        if (stopped) return;
        setStream(media);
        const video = videoRef.current!;
        video.srcObject = media;
        await video.play();

        const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;
        const vision: any = await dynImport(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs",
        );
        const fileset = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
        );
        landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (stopped) return;
        setReady(true);

        let lastTs = -1;
        const loop = () => {
          if (stopped) return;
          const v = videoRef.current;
          if (v && v.readyState >= 2 && landmarker) {
            const ts = performance.now();
            if (ts !== lastTs) {
              lastTs = ts;
              const res = landmarker.detectForVideo(v, ts);
              const h = hand.current;
              if (res?.landmarks?.length) {
                const lms = res.landmarks[0];
                let ax = 0, ay = 0;
                for (const i of PALM_IDS) { ax += lms[i].x; ay += lms[i].y; }
                const px = 1 - ax / PALM_IDS.length;
                const py = ay / PALM_IDS.length;
                h.palmX = h.palmX == null ? px : h.palmX + (px - h.palmX) * PALM_ALPHA;
                h.palmY = h.palmY == null ? py : h.palmY + (py - h.palmY) * PALM_ALPHA;

                const cx = 1 - lms[INDEX_TIP].x;
                const cy = lms[INDEX_TIP].y;
                h.cursorX = h.cursorX == null ? cx : h.cursorX + (cx - h.cursorX) * CURSOR_ALPHA;
                h.cursorY = h.cursorY == null ? cy : h.cursorY + (cy - h.cursorY) * CURSOR_ALPHA;
              } else {
                h.cursorX = null;
                h.cursorY = null;
              }
            }
          }
          rafId = requestAnimationFrame(loop);
        };
        loop();
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Could not access webcam");
      }
    }
    init();
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      if (media) media.getTracks().forEach((t) => t.stop());
      if (landmarker?.close) landmarker.close();
    };
  }, []);

  return (
    <HandContext.Provider value={{ hand, stream, ready, error }}>
      {children}
      {/* Detection source only; the visible preview lives in the match screen. */}
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
  const { hand } = useHand();
  const dotRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    let raf = 0;
    let target: HTMLElement | null = null;
    let start = 0;
    let armedAt = performance.now() + ARM_MS;

    const release = () => {
      if (target) target.style.setProperty("--dwell", "0");
      target = null;
    };

    // Re-arm whenever new pressable elements appear (a new screen, the
    // game-over panel, …), not only after a press.
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
      const { cursorX, cursorY } = hand.current;
      if (!dot) return;
      if (cursorX == null || cursorY == null) {
        dot.style.opacity = "0";
        release();
        return;
      }
      const x = cursorX * window.innerWidth;
      const y = cursorY * window.innerHeight;
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
  }, [hand]);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] -ml-4 -mt-4 h-8 w-8 rounded-full border-4 border-amber-300 bg-amber-300/40 shadow-[0_0_18px_rgba(252,211,77,0.8)] transition-opacity"
      style={{ opacity: 0 }}
    />
  );
}
