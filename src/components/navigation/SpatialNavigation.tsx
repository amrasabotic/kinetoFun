"use client";

import { useEffect } from "react";

/**
 * Remote-friendly spatial navigation.
 *
 * Listens globally for arrow keys and moves DOM focus to the nearest
 * focusable element in that direction. Any element tagged with
 * `data-focusable` participates (buttons, links, cards, inputs). This is the
 * forward-looking primitive the future gesture system will drive instead of
 * a keyboard — gestures will dispatch the same directional intent.
 *
 * Enter/Space already activate native buttons and links, so no extra handling
 * is needed for selection.
 */
const SELECTOR = "[data-focusable]:not([disabled]):not([aria-hidden='true'])";

type Direction = "up" | "down" | "left" | "right";

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function visibleCandidates(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(SELECTOR),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function centerOf(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function SpatialNavigation({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const direction = KEY_TO_DIR[event.key];
      if (!direction) return;

      const active = document.activeElement as HTMLElement | null;

      // Let users type / move the caret inside text fields normally.
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      ) {
        return;
      }

      const candidates = visibleCandidates();
      if (candidates.length === 0) return;

      // Nothing focused yet → focus the first candidate.
      if (!active || !candidates.includes(active)) {
        event.preventDefault();
        candidates[0].focus();
        return;
      }

      const from = centerOf(active.getBoundingClientRect());
      let best: HTMLElement | null = null;
      let bestScore = Infinity;

      for (const el of candidates) {
        if (el === active) continue;
        const to = centerOf(el.getBoundingClientRect());
        const dx = to.x - from.x;
        const dy = to.y - from.y;

        let aligned = false;
        let primary = 0;
        let secondary = 0;

        switch (direction) {
          case "left":
            aligned = dx < -2;
            primary = -dx;
            secondary = Math.abs(dy);
            break;
          case "right":
            aligned = dx > 2;
            primary = dx;
            secondary = Math.abs(dy);
            break;
          case "up":
            aligned = dy < -2;
            primary = -dy;
            secondary = Math.abs(dx);
            break;
          case "down":
            aligned = dy > 2;
            primary = dy;
            secondary = Math.abs(dx);
            break;
        }

        if (!aligned) continue;

        // Favor elements directly in line (low perpendicular offset).
        const score = primary + secondary * 2;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }

      if (best) {
        event.preventDefault();
        best.focus();
        best.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "smooth",
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <>{children}</>;
}
