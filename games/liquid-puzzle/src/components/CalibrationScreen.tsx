import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCalibration } from '../hooks/useCalibration';
import type { CalibrationStep } from '../hooks/useCalibration';

const STEP_COPY: Record<CalibrationStep, { title: string; hint: string }> = {
  'wait-hand': { title: 'Please stand in front of the camera', hint: 'Raise a hand so the camera can find it.' },
  palm: { title: 'Hold an open palm', hint: 'Spread your fingers and hold still.' },
  left: { title: 'Move your hand left', hint: 'Slide your open hand toward the left side of the frame.' },
  right: { title: 'Move your hand right', hint: 'Slide your open hand toward the right side of the frame.' },
  up: { title: 'Move your hand up', hint: 'Raise your hand toward the top of the frame.' },
  down: { title: 'Move your hand down', hint: 'Lower your hand toward the bottom of the frame.' },
  done: { title: "You're calibrated!", hint: 'Loading the menu…' },
};

export function CalibrationScreen({ onComplete }: { onComplete: () => void }) {
  const { step, progress, isDone } = useCalibration();

  useEffect(() => {
    if (!isDone) return;
    const t = setTimeout(onComplete, 500);
    return () => clearTimeout(t);
  }, [isDone, onComplete]);

  const copy = STEP_COPY[step];

  return (
    <div className="lp-screen lp-calibration">
      <div className="lp-calibration__icon-wrap">
        <motion.div
          className="lp-calibration__camera-icon"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className={`lp-calibration__hand-dot ${step === 'wait-hand' ? 'lp-calibration__hand-dot--searching' : 'lp-calibration__hand-dot--found'}`} />
      </div>
      <h1 className="lp-calibration__title">{copy.title}</h1>
      <p className="lp-calibration__hint">{copy.hint}</p>
      <div className="lp-calibration__progress-track">
        <motion.div className="lp-calibration__progress-fill" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.1 }} />
      </div>
      <div className="lp-calibration__steps">
        {(['palm', 'left', 'right', 'up', 'down'] as CalibrationStep[]).map((s) => (
          <span key={s} className={`lp-calibration__step-dot ${s === step ? 'lp-calibration__step-dot--active' : ''}`} />
        ))}
      </div>
    </div>
  );
}
