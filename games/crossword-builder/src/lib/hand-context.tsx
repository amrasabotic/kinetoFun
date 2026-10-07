import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useHandTracking, type HandState } from "@/lib/use-hand-tracking";

/*
 * One camera + hand tracker for the whole game, started as soon as it loads.
 * The game is played on TVs with no mouse, so every screen is hand-controlled:
 * the level screen uses the fingertip and pinch directly, and buttons
 * elsewhere are pressed by resting the hand cursor on them (see DwellCursor).
 */

interface HandContextValue {
  hand: HandState;
  /** Screens with their own pointer (the level screen) hide the global cursor. */
  setCursorHidden: (hidden: boolean) => void;
}

const HandContext = createContext<HandContextValue | null>(null);

export function useHand(): HandContextValue {
  const ctx = useContext(HandContext);
  if (!ctx) throw new Error("useHand must be used inside HandProvider");
  return ctx;
}

export function HandProvider({ children }: { children: ReactNode }) {
  const hand = useHandTracking(true);
  const [cursorHidden, setCursorHidden] = useState(false);
  const handRef = useRef(hand);
  handRef.current = hand;

  return (
    <HandContext.Provider value={{ hand, setCursorHidden }}>
      {children}
      <DwellCursor handRef={handRef} hidden={cursorHidden} />
    </HandContext.Provider>
  );
}

const DWELL_MS = 900;
// Buttons ignore the hand for a moment after a screen or overlay appears, so a
// hand already resting where a button is drawn cannot press it by accident.
const ARM_MS = 1500;

/**
 * Hand cursor plus hover-to-press for every element marked `data-dwell`.
 * `data-dwell="2000"` sets a custom hold time in ms; an empty value uses the
 * default. Progress is exposed to CSS as `--dwell` (0..1) on the element.
 */
function DwellCursor({ handRef, hidden }: { handRef: React.MutableRefObject<HandState>; hidden: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;

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
      const h = handRef.current;
      if (!h.active || !h.landmarks) {
        dot.style.opacity = "0";
        release();
        return;
      }
      const x = h.x * window.innerWidth;
      const y = h.y * window.innerHeight;
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
      // A pinch means the player is grabbing a letter, never pressing a button.
      if (h.pinching || now < armedAt || (target as HTMLButtonElement).disabled) {
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
  }, [handRef]);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] -ml-5 -mt-5 size-10 rounded-full border-4 border-primary bg-primary/25 shadow-pop transition-opacity"
      style={{ opacity: 0 }}
    />
  );
}
