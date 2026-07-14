import { motion, AnimatePresence } from 'framer-motion';
import type { HandData } from '../../gestures/useMediaPipe';
import { useCalibration } from '../../hooks/useCalibration';
import CameraPreview from './CameraPreview';
import CameraCycleButton from '../common/CameraCycleButton';

const QUALITY_COLOR: Record<string, string> = {
  excellent: '#4ADE80',
  good: '#FACC15',
  poor: '#FB923C',
  none: '#6B7280',
};

const QUALITY_LABEL: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  poor: 'Poor',
  none: 'No Signal',
};

export default function CalibrationScreen({
  videoRef,
  handRef,
  cameraDeviceId,
  onSelectDevice,
  onReady,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  handRef: React.RefObject<HandData>;
  cameraDeviceId: string | null;
  onSelectDevice: (id: string | null) => void;
  onReady: () => void;
}) {
  const { state, quality, progressPct, detected } = useCalibration(handRef, onReady);

  // Recomputed on every render (this component re-renders ~10Hz via useCalibration's
  // internal tracking-quality sampler), which is plenty for a calibration outline.
  const box = computeHandBox(handRef.current?.landmarks);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#2a1a0f] via-[#1a0f20] to-[#0b0e1a] flex flex-col items-center justify-center text-white overflow-hidden px-4">
      <div className="relative w-[640px] max-w-[90vw] aspect-video rounded-3xl overflow-hidden border-2 border-white/15 shadow-2xl">
        {/* Mirrored wrapper: video + overlay flip together so the bounding box stays aligned */}
        <div className="absolute inset-0" style={{ transform: 'scaleX(-1)' }}>
          <CameraPreview sourceVideoRef={videoRef} className="w-full h-full" />
          {detected && box && (
            <div
              className="absolute rounded-2xl border-[3px]"
              style={{
                left: `${box.left}%`, top: `${box.top}%`,
                width: `${box.width}%`, height: `${box.height}%`,
                borderColor: QUALITY_COLOR[quality],
                boxShadow: `0 0 24px ${QUALITY_COLOR[quality]}88`,
                transition: 'left 0.06s linear, top 0.06s linear, width 0.06s linear, height 0.06s linear',
              }}
            />
          )}
        </div>

        {!detected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white/80 text-sm">
            Waiting for camera…
          </div>
        )}

        {/* Quality badge */}
        <div
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
          style={{ background: `${QUALITY_COLOR[quality]}22`, color: QUALITY_COLOR[quality], border: `1px solid ${QUALITY_COLOR[quality]}` }}
        >
          {QUALITY_LABEL[quality]}
        </div>

        {/* Progress ring toward auto-start */}
        {state !== 'waiting-for-hand' && (
          <div className="absolute bottom-3 left-3 right-3 h-1.5 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-100"
              style={{ width: `${progressPct}%`, background: QUALITY_COLOR[quality] }}
            />
          </div>
        )}
      </div>

      <div className="mt-8 text-center max-w-md">
        <AnimatePresence mode="wait">
          <motion.h1
            key={state}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-3xl font-extrabold mb-2"
          >
            {state === 'waiting-for-hand' && 'Raise your hand to begin'}
            {state === 'tracking' && 'Hold steady…'}
            {state === 'ready' && "You're ready!"}
          </motion.h1>
        </AnimatePresence>
        <p className="text-white/60 text-sm">
          Show your open hand to the camera. Mob Rally is played entirely with hand gestures — no mouse, keyboard, or touch.
        </p>
      </div>

      <div className="mt-6 w-56">
        <CameraCycleButton deviceId={cameraDeviceId} onChange={onSelectDevice} />
      </div>
    </div>
  );
}

function computeHandBox(lm: { x: number; y: number }[] | undefined) {
  if (!lm || lm.length === 0) return null;
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const p of lm) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = 0.05;
  return {
    left: Math.max(0, minX - pad) * 100,
    top: Math.max(0, minY - pad) * 100,
    width: Math.min(1, maxX - minX + pad * 2) * 100,
    height: Math.min(1, maxY - minY + pad * 2) * 100,
  };
}
