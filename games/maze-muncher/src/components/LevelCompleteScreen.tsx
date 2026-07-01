import { useEffect, useRef, useState } from 'react';
import GestureDetector, { DwellButton } from './GestureDetector';
import type { HandData } from '../hooks/useMediaPipe';
import { HeldGestureTracker, GESTURE_HOLD_MS } from '../hooks/useGestureControl';

interface Props {
  handRef: React.RefObject<HandData>;
  score: number;
  level: number;
  onContinue: () => void;
}

export default function LevelCompleteScreen({ handRef, score, level, onContinue }: Props) {
  const trackerRef = useRef(new HeldGestureTracker(GESTURE_HOLD_MS));
  const [progress, setProgress] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    function loop(now: number) {
      const hand = handRef.current;
      const state = trackerRef.current.update(hand?.isThumbsUp ?? false, now);
      setProgress(state.progress);
      if (state.justFired && !firedRef.current) {
        firedRef.current = true;
        onContinue();
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-5">
      <GestureDetector handRef={handRef}>
        {(dwell) => (
          <>
            <div className="text-6xl">🎉</div>
            <h1 className="text-4xl font-black" style={{ color: '#39ff88', textShadow: '0 0 20px #39ff88' }}>
              SECTOR CLEARED
            </h1>
            <div className="text-white/70">
              Level {level} complete · Score <b className="text-white">{score.toLocaleString()}</b>
            </div>

            <div className="flex flex-col items-center gap-1 mt-2">
              <svg width="64" height="64" className="-rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                <circle
                  cx="32" cy="32" r="26" fill="none" stroke="#ffd23f" strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - progress)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-white/50 text-xs mt-6">👍 Thumbs up to continue</span>
            </div>

            <DwellButton id="continue" dwell={dwell} onClick={onContinue} className="mt-2 px-10 py-3.5 rounded-2xl font-black text-black" style={{ background: 'linear-gradient(135deg,#39ff88,#0af0ff)' }}>
              NEXT SECTOR →
            </DwellButton>
          </>
        )}
      </GestureDetector>
    </div>
  );
}
