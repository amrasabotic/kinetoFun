import { useEffect, useRef, useState } from 'react';
import { useGesture } from '../../mediaPipe/GestureProvider';
import { playHandLost } from '../../audio/sound';

/** Shows a "Hand Lost" pause overlay whenever tracking drops for more than half a second. Auto-resumes. */
export default function HandLostOverlay() {
  const { frame, status } = useGesture();
  const [lost, setLost] = useState(false);
  const timerRef = useRef<number | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    if (frame.detected) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      setLost(false);
      playedRef.current = false;
      return;
    }
    if (status !== 'tracking') return;
    if (timerRef.current) return;
    timerRef.current = window.setTimeout(() => {
      setLost(true);
      if (!playedRef.current) { playedRef.current = true; playHandLost(); }
    }, 600);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [frame.detected, status]);

  if (!lost) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="h-20 w-20 rounded-full border-4 border-white/30 border-t-violet-400 animate-spin mb-6" />
      <h2 className="text-2xl font-bold text-white mb-2">Hand Lost</h2>
      <p className="text-white/60 text-sm">Show your hand to the camera to continue — resuming automatically…</p>
    </div>
  );
}
