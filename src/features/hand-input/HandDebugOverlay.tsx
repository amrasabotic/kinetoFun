"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Delegate, TrackerStatus } from "./tracker";

/** Running totals the provider updates on every camera sample. */
export interface HandStats {
  frames: number;
  samples: number;
  inferenceMsTotal: number;
  lastScore: number;
  lastPoint: { x: number; y: number } | null;
  delegate: Delegate | null;
}

export function createHandStats(): HandStats {
  return { frames: 0, samples: 0, inferenceMsTotal: 0, lastScore: 0, lastPoint: null, delegate: null };
}

interface Reading {
  cameraFps: number;
  fps: number;
  inferenceMs: number;
  score: number;
  point: { x: number; y: number } | null;
  delegate: Delegate | null;
}

/**
 * `?handdebug=1` panel for tuning hand control on real hardware: camera frame
 * rate, inference rate, time per inference and detection confidence. Inference
 * rate is the number that decides whether a given Pi + camera is good enough;
 * the camera rate shows how many of the delivered frames it keeps up with.
 */
export function HandDebugOverlay({
  statsRef,
  status,
}: {
  statsRef: RefObject<HandStats>;
  status: TrackerStatus;
}) {
  const [reading, setReading] = useState<Reading>({
    cameraFps: 0,
    fps: 0,
    inferenceMs: 0,
    score: 0,
    point: null,
    delegate: null,
  });

  useEffect(() => {
    // The totals count from the provider's mount, which can be long before the
    // panel opens; the first reading must not include that history.
    const start = statsRef.current;
    let last = {
      at: performance.now(),
      frames: start.frames,
      samples: start.samples,
      inferenceMsTotal: start.inferenceMsTotal,
    };
    const id = setInterval(() => {
      const stats = statsRef.current;
      const now = performance.now();
      const samples = stats.samples - last.samples;
      const seconds = (now - last.at) / 1000;
      setReading({
        cameraFps: (stats.frames - last.frames) / seconds,
        fps: samples / seconds,
        inferenceMs: samples > 0 ? (stats.inferenceMsTotal - last.inferenceMsTotal) / samples : 0,
        score: stats.lastScore,
        point: stats.lastPoint,
        delegate: stats.delegate,
      });
      last = {
        at: now,
        frames: stats.frames,
        samples: stats.samples,
        inferenceMsTotal: stats.inferenceMsTotal,
      };
    }, 500);
    return () => clearInterval(id);
  }, [statsRef]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[1001] rounded-xl bg-black/75 px-5 py-4 font-mono text-base leading-7 text-white">
      <div>status: {status}</div>
      <div>backend: {reading.delegate ?? "…"}</div>
      <div>camera: {reading.cameraFps.toFixed(1)} fps</div>
      <div>inference: {reading.fps.toFixed(1)} fps</div>
      <div>per frame: {reading.inferenceMs.toFixed(1)} ms</div>
      <div>confidence: {reading.score.toFixed(2)}</div>
      <div>
        cursor:{" "}
        {reading.point ? `${Math.round(reading.point.x)}, ${Math.round(reading.point.y)}` : "no hand"}
      </div>
    </div>
  );
}
