"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { COPY, FONT_SPECS, FORMATS, POSTER_TIME } from "../constants";
import { advanceLoop, fitStage, pickFrameRate, shouldDraw, type Size } from "../logic/loop";
import { FILM_LENGTH } from "../logic/timeline";
import { Film } from "./Film";
import { fitLines } from "./line-sizes";

/** The film starts without its face after this long, rather than waiting on a slow network forever. */
const FONT_WAIT_MS = 4000;
const FRAME_SAMPLES = 60;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const useReducedMotion = () =>
  useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);

/** A wide box gets the 2:1 stage, a tall one the 4:5 stage. */
const pickFormat = (box: Size) => (box.width >= box.height ? FORMATS.desktop : FORMATS.phone);

/**
 * The home page film: a looping animation about playing with your hands,
 * drawn live on a fixed stage that covers the box it is given. It pauses
 * off screen, holds one still frame for visitors who prefer reduced motion,
 * and gives screen readers a written description instead.
 */
export function HomeFilm({ language = "en", className }: { language?: keyof typeof COPY; className?: string }) {
  const copy = COPY[language];
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Size | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [time, setTime] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((previous) => (previous?.width === width && previous.height === height ? previous : { width, height }));
    });
    const visibility = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    resize.observe(element);
    visibility.observe(element);
    return () => {
      resize.disconnect();
      visibility.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loaded = Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec)));
    const capped = new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS));
    Promise.race([loaded, capped])
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setFontsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const playing = fontsReady && onScreen && !reducedMotion && box !== null;

  useEffect(() => {
    if (!playing) return;
    let request = 0;
    let lastFrame = performance.now();
    let lastDrawn = lastFrame;
    const recent: number[] = [];
    const tick = (now: number) => {
      request = requestAnimationFrame(tick);
      recent.push(now - lastFrame);
      if (recent.length > FRAME_SAMPLES) recent.shift();
      lastFrame = now;
      if (!shouldDraw(now, lastDrawn, pickFrameRate(recent))) return;
      const elapsed = (now - lastDrawn) / 1000;
      lastDrawn = now;
      setTime((current) => advanceLoop(current, elapsed, FILM_LENGTH));
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [playing]);

  const format = box ? pickFormat(box) : null;
  const text = useMemo(() => (fontsReady && format ? fitLines(format, copy) : null), [fontsReady, format, copy]);
  const fit = box && format ? fitStage(box, format) : null;

  return (
    <div ref={boxRef} className={className} style={{ position: "relative", overflow: "hidden", background: "#EAF4FF" }}>
      <p className="sr-only">{copy.description}</p>
      {format && fit && fit.scale > 0 && (
        <div
          aria-hidden
          translate="no"
          style={{
            position: "absolute",
            left: fit.left,
            top: fit.top,
            width: format.width,
            height: format.height,
            transform: `scale(${fit.scale})`,
            transformOrigin: "0 0",
          }}
        >
          <Film time={reducedMotion ? POSTER_TIME : time} format={format} text={text} />
        </div>
      )}
    </div>
  );
}
