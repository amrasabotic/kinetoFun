import { useEffect, useRef } from 'react';
import { inputManager } from '../input/InputManager';

const DWELL_MS = 900;

/**
 * Global hand cursor overlay.
 *
 * - Subscribes to InputManager `pointerMove` events (emitted by CameraInputProvider).
 * - Renders a ring cursor that follows the hand's index-tip position.
 * - Implements dwell-to-click: hovering over any button/link for DWELL_MS triggers
 *   a programmatic .click() so all existing screens work without modification.
 * - pointer-events:none so it never blocks clicks or gestures.
 */
export function HandNavigator() {
  const cvRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = cvRef.current!;
    let raf = 0;
    let handX = -1;
    let handY = -1;
    let visible = false;
    let visibleTimer = 0;

    let dwellEl: Element | null = null;
    let dwellStart = 0;
    // Buttons ignore the hand for a moment after they appear and after each
    // press, so a hand already resting on one cannot skip How to Play or press
    // through several screens in a row.
    const ARM_MS = 1500;
    let armedAt = performance.now() + ARM_MS;
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of Array.from(r.addedNodes)) {
          if (n instanceof Element && (n.matches('button, [role="button"], a') || n.querySelector('button, [role="button"], a'))) {
            armedAt = performance.now() + ARM_MS;
            dwellEl = null;
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const unsub = inputManager.on('pointerMove', ({ x, y }) => {
      handX = x;
      handY = y;
      visible = true;
      visibleTimer = Date.now();
    });

    const tick = () => {
      // Hide cursor if no hand detected for >1s
      if (Date.now() - visibleTimer > 1000) visible = false;

      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
      const ctx = cv.getContext('2d')!;
      ctx.clearRect(0, 0, cv.width, cv.height);

      if (!visible || handX < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // --- Dwell logic ---
      const el = document.elementFromPoint(handX, handY);
      const target = el?.closest('button, [role="button"], a') ?? null;

      let dwellProg = 0;
      const armed = performance.now() >= armedAt;
      if (target && !armed) {
        dwellEl = null;
      } else if (target) {
        if (target !== dwellEl) {
          dwellEl = target;
          dwellStart = Date.now();
        }
        dwellProg = Math.min(1, (Date.now() - dwellStart) / DWELL_MS);
        if (dwellProg >= 1) {
          (target as HTMLElement).click();
          dwellEl = null;
          dwellProg = 0;
          armedAt = performance.now() + ARM_MS;
        }
      } else if (!target) {
        dwellEl = null;
        dwellProg = 0;
      }

      // --- Draw cursor ---
      ctx.save();

      // Outer ring
      ctx.shadowColor = '#FF6B35';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(255,107,53,0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(handX, handY, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Centre dot
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#FF6B35';
      ctx.beginPath();
      ctx.arc(handX, handY, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Dwell progress arc (drawn on top, no shadow)
      if (dwellProg > 0) {
        ctx.save();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(handX, handY, 24, -Math.PI / 2, -Math.PI / 2 + dwellProg * Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={cvRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}
    />
  );
}
