import { useEffect, useRef } from 'react';
import type { ColorId, FlagDef } from '../../types';
import { useGesture } from '../../mediaPipe/GestureProvider';
import { PaintEngine } from '../../game/PaintEngine';
import { ParticleSystem } from '../../particles/particleSystem';
import { colorHex } from '../../flags/palette';
import { polygonCentroid } from '../../utils/geometry';
import { playPaintTick, playRegionComplete, playWrong } from '../../audio/sound';
import { useSettingsStore } from '../../stores/settingsStore';

export interface HintTarget { regionId: string; colorId: ColorId; centroid: [number, number] }

export interface FlagCanvasHandle {
  /** First not-yet-complete region, used to drive the progressive hint system. */
  getHintTarget: () => HintTarget | null;
  setRegionPulsing: (regionId: string | null) => void;
}

interface Props {
  flag: FlagDef;
  selectedColor: ColorId | null;
  onRegionComplete: (regionId: string) => void;
  onMistake: (regionId: string) => void;
  onComplete: () => void;
  handleRef?: React.MutableRefObject<FlagCanvasHandle | null>;
}

export default function FlagCanvas({ flag, selectedColor, onRegionComplete, onMistake, onComplete, handleRef }: Props) {
  const { frameRef } = useGesture();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const polyRefs = useRef(new Map<string, SVGPolygonElement>());
  const baseRefs = useRef(new Map<string, SVGPolygonElement>());
  const engineRef = useRef<PaintEngine | null>(null);
  const pulsingIdRef = useRef<string | null>(null);
  const particlesRef = useRef(new ParticleSystem());
  const completedRef = useRef(false);
  const slowerPainting = useSettingsStore((s) => s.slowerPainting);
  const selectedColorRef = useRef(selectedColor);
  selectedColorRef.current = selectedColor;
  const lastTickRef = useRef(0);

  const [w, h] = flag.viewBox;

  useEffect(() => {
    completedRef.current = false;
    const engine = new PaintEngine(flag, {
      onProgress: (regionId, progress) => {
        const el = polyRefs.current.get(regionId);
        if (el) el.setAttribute('fill-opacity', String(progress));
        const now = performance.now();
        if (now - lastTickRef.current > 110) {
          lastTickRef.current = now;
          playPaintTick(progress);
        }
      },
      onRegionComplete: (regionId) => {
        const region = flag.regions.find((r) => r.id === regionId);
        const el = polyRefs.current.get(regionId);
        if (el) {
          el.setAttribute('fill-opacity', '1');
          el.classList.add('fq-pop');
          window.setTimeout(() => el.classList.remove('fq-pop'), 400);
        }
        if (region) spawnAt(polygonCentroid(region.points), 'sparkle');
        playRegionComplete();
        onRegionComplete(regionId);
        if (!completedRef.current && engine.isComplete) {
          completedRef.current = true;
          onComplete();
        }
      },
      onMistake: (regionId) => {
        const el = polyRefs.current.get(regionId);
        if (el) {
          el.classList.add('fq-shake');
          window.setTimeout(() => el.classList.remove('fq-shake'), 400);
          const region = flag.regions.find((r) => r.id === regionId);
          if (region) spawnAt(polygonCentroid(region.points), 'wrong');
        }
        playWrong();
        onMistake(regionId);
      },
    }, slowerPainting);
    engineRef.current = engine;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flag.id]);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      getHintTarget: () => {
        const engine = engineRef.current;
        if (!engine) return null;
        const region = flag.regions.find((r) => engine.states.get(r.id)?.state !== 'complete');
        if (!region) return null;
        return { regionId: region.id, colorId: region.colorId, centroid: polygonCentroid(region.points) };
      },
      setRegionPulsing: (regionId) => {
        if (pulsingIdRef.current && pulsingIdRef.current !== regionId) {
          baseRefs.current.get(pulsingIdRef.current)?.classList.remove('fq-hint-pulse');
        }
        pulsingIdRef.current = regionId;
        if (regionId) baseRefs.current.get(regionId)?.classList.add('fq-hint-pulse');
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleRef, flag.id]);

  function spawnAt(localPt: [number, number], kind: 'sparkle' | 'wrong') {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const rect = container.getBoundingClientRect();
    const px = (localPt[0] / w) * rect.width;
    const py = (localPt[1] / h) * rect.height;
    if (kind === 'sparkle') particlesRef.current.spawnSparkle(px, py);
    else particlesRef.current.spawnSplash(px, py, '#E4362E', 8);
  }

  // Main RAF loop: reads live cursor, drives the paint engine, redraws particles.
  useEffect(() => {
    let raf = 0;
    let lastT = performance.now();

    function loop() {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (container && canvas && engine) {
        const rect = container.getBoundingClientRect();
        const hand = frameRef.current;
        let local: { x: number; y: number } | null = null;
        if (hand.detected) {
          const px = hand.cursorX * window.innerWidth;
          const py = hand.cursorY * window.innerHeight;
          if (px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom) {
            local = { x: ((px - rect.left) / rect.width) * w, y: ((py - rect.top) / rect.height) * h };
          }
        }

        engine.update(local, selectedColorRef.current, dt);

        if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
          canvas.width = Math.round(rect.width);
          canvas.height = Math.round(rect.height);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          particlesRef.current.update(dt);
          particlesRef.current.draw(ctx);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [frameRef, w, h]);

  return (
    <div ref={containerRef} className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-white/15 shadow-2xl bg-[#20242e]">
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        {flag.regions.map((r) => (
          <g key={r.id}>
            <polygon
              ref={(el) => { if (el) baseRefs.current.set(r.id, el); }}
              points={r.points.map((p) => p.join(',')).join(' ')}
              fill="#3a3f4b"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1.2}
            />
            <polygon
              ref={(el) => { if (el) polyRefs.current.set(r.id, el); }}
              points={r.points.map((p) => p.join(',')).join(' ')}
              fill={colorHex(r.colorId)}
              fillOpacity={0}
              stroke="rgba(0,0,0,0.25)"
              strokeWidth={0.6}
            />
          </g>
        ))}
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </div>
  );
}
