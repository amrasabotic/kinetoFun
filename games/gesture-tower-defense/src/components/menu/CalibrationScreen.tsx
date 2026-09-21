import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGesture } from '../../mediaPipe/GestureProvider';
import CameraFeed from '../common/CameraFeed';
import type { HandFrame } from '../../types';
import { playConfirm } from '../../audio/sound';

interface Step { label: string; hint: string; check: (f: HandFrame) => boolean }

const STEPS: Step[] = [
  { label: 'Show me your hand!', hint: 'Hold your hand up so the camera can see it', check: (f) => f.detected },
  { label: 'Point at the target!', hint: 'Move your hand to the middle of the screen', check: (f) => f.detected && Math.abs(f.cursorX - 0.5) < 0.22 && Math.abs(f.cursorY - 0.5) < 0.22 },
];

const STEP_MAX_MS = 3000;
const STEP_HOLD_MS = 450;

export default function CalibrationScreen({ onDone }: { onDone: () => void }) {
  const { frame, status } = useGesture();
  const [stepIndex, setStepIndex] = useState(0);
  const holdStart = useRef<number | null>(null);
  const stepStart = useRef(performance.now());

  useEffect(() => {
    let raf = 0;
    function tick() {
      const step = STEPS[stepIndex];
      if (!step) return;
      const ok = step.check(frame);
      const now = performance.now();
      if (ok) {
        if (holdStart.current === null) holdStart.current = now;
      } else {
        holdStart.current = null;
      }
      const held = holdStart.current !== null && now - holdStart.current >= STEP_HOLD_MS;
      const timedOut = now - stepStart.current >= STEP_MAX_MS;
      if (held || timedOut) {
        playConfirm();
        if (stepIndex + 1 >= STEPS.length) {
          onDone();
          return;
        }
        setStepIndex((i) => i + 1);
        holdStart.current = null;
        stepStart.current = now;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, frame]);

  const step = STEPS[stepIndex];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#2a1a5e] via-[#3a1a6e] to-[#1a0e3d] flex flex-col items-center justify-center text-white overflow-hidden">
      <div className="relative w-[480px] max-w-[86vw] aspect-video rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl">
        <CameraFeed className="w-full h-full" />
        {status !== 'tracking' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white/80 text-sm">
            {status === 'initializing' && 'Starting camera…'}
            {status === 'no-camera' && 'Camera unavailable — check permissions'}
            {status === 'error' && 'Something went wrong starting hand tracking'}
          </div>
        )}
        {stepIndex === 1 && (
          <div
            className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border-4 border-dashed border-yellow-300/80"
            style={{ transform: 'translate(-50%,-50%)' }}
          />
        )}
        {frame.detected && (
          <div
            className="absolute w-10 h-10 rounded-full border-4 border-yellow-300 bg-yellow-300/40"
            style={{
              left: `${frame.cursorX * 100}%`, top: `${frame.cursorY * 100}%`,
              transform: 'translate(-50%,-50%)', transition: 'left 0.05s, top 0.05s',
            }}
          />
        )}
      </div>

      <div className="mt-8 text-center max-w-md">
        <AnimatePresence mode="wait">
          <motion.h1
            key={step?.label}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-4xl font-extrabold mb-2"
          >
            {step?.label}
          </motion.h1>
        </AnimatePresence>
        <p className="text-white/60 text-base">{step?.hint}</p>
      </div>

      <div className="mt-6 flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`h-2 w-12 rounded-full transition-colors ${i <= stepIndex ? 'bg-yellow-300' : 'bg-white/15'}`}
          />
        ))}
      </div>
    </div>
  );
}
