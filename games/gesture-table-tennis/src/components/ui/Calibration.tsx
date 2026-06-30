import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HandData } from '../../gestures/useMediaPipe';

interface Props {
  handRef: React.MutableRefObject<HandData>;
  onComplete: () => void;
  onBack: () => void;
}

type CalibStep = 'intro' | 'center' | 'left' | 'right' | 'raise' | 'done';

export default function Calibration({ handRef, onComplete, onBack }: Props) {
  const [step, setStep] = useState<CalibStep>('intro');
  const [detected, setDetected] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  useEffect(() => {
    const HOLD_NEEDED = 1.5; // seconds
    let held = 0;
    let raf: number;

    const STEP_TARGETS: Record<CalibStep, (h: HandData) => boolean> = {
      intro: () => false,
      center: (h) => h.detected && Math.abs(h.palmX - 0.5) < 0.15 && Math.abs(h.palmY - 0.5) < 0.15,
      left:   (h) => h.detected && h.palmX < 0.25,
      right:  (h) => h.detected && h.palmX > 0.75,
      raise:  (h) => h.detected && h.palmY < 0.3,
      done:   () => false,
    };

    function tick() {
      const h = handRef.current;
      setDetected(h.detected);

      if (step !== 'intro' && step !== 'done') {
        const ok = STEP_TARGETS[step](h);
        if (ok) {
          held += 1 / 60;
          setHoldProgress(Math.min(1, held / HOLD_NEEDED));
          if (held >= HOLD_NEEDED) {
            held = 0;
            setHoldProgress(0);
            const sequence: CalibStep[] = ['intro', 'center', 'left', 'right', 'raise', 'done'];
            const idx = sequence.indexOf(step);
            const next = sequence[idx + 1] ?? 'done';
            setStep(next);
            if (next === 'done') setTimeout(onComplete, 800);
          }
        } else {
          held = Math.max(0, held - 0.5 / 60);
          setHoldProgress(Math.max(0, held / HOLD_NEEDED));
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, handRef, onComplete]);

  const STEP_CONFIGS: Record<CalibStep, { icon: string; title: string; instruction: string }> = {
    intro:  { icon: '👋', title: 'Calibration',     instruction: 'Stand comfortably in front of the camera. Press Start when ready.' },
    center: { icon: '✋', title: 'Center Your Hand', instruction: 'Hold your hand in the center of the frame.' },
    left:   { icon: '👈', title: 'Move Left',        instruction: 'Extend your arm to the left.' },
    right:  { icon: '👉', title: 'Move Right',       instruction: 'Extend your arm to the right.' },
    raise:  { icon: '☝️', title: 'Raise Your Hand',  instruction: 'Raise your hand high!' },
    done:   { icon: '✅', title: 'Ready!',            instruction: 'Calibration complete. Starting game…' },
  };

  const config = STEP_CONFIGS[step];
  const steps: CalibStep[] = ['center', 'left', 'right', 'raise'];
  const progress = steps.indexOf(step as CalibStep);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center"
         style={{ background: 'radial-gradient(ellipse at 50% 50%, #1a003a 0%, #0a0014 70%)' }}>

      <AnimatePresence mode="wait">
        <motion.div key={step} className="flex flex-col items-center gap-6 text-center px-8 max-w-lg"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35 }}>

          <motion.div className="text-8xl" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            {config.icon}
          </motion.div>

          <h2 className="text-4xl font-black text-white">{config.title}</h2>
          <p className="text-purple-200 text-xl">{config.instruction}</p>

          {/* Hand detected indicator */}
          <div className={`flex items-center gap-3 px-6 py-3 rounded-full ${detected ? 'bg-green-900/30 border border-green-500/40' : 'bg-red-900/30 border border-red-500/40'}`}>
            <div className={`w-3 h-3 rounded-full ${detected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={`font-semibold ${detected ? 'text-green-300' : 'text-red-300'}`}>
              {detected ? 'Hand Detected' : 'No Hand Detected'}
            </span>
          </div>

          {/* Hold progress arc */}
          {step !== 'intro' && step !== 'done' && (
            <div className="relative w-24 h-24">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#a855f7" strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${264 * holdProgress} 264`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-purple-300 font-bold text-lg">
                {Math.round(holdProgress * 100)}%
              </div>
            </div>
          )}

          {/* Step dots */}
          {step !== 'intro' && step !== 'done' && (
            <div className="flex gap-2">
              {steps.map((s, i) => (
                <div key={s} className={`w-3 h-3 rounded-full ${i < progress ? 'bg-green-400' : i === progress ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'}`} />
              ))}
            </div>
          )}

          {/* Buttons */}
          {step === 'intro' && (
            <div className="flex gap-4 mt-4">
              <button onClick={onBack} className="px-8 py-3 rounded-2xl font-bold text-gray-300 bg-white/10 hover:bg-white/15 transition-all">
                ← Back
              </button>
              <button onClick={() => setStep('center')}
                className="px-8 py-3 rounded-2xl font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                Start Calibration
              </button>
            </div>
          )}
          {step === 'done' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl">🎉</motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
