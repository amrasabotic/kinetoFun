import { useEffect, useRef, useState } from 'react';
import GestureDetector, { DwellButton } from './GestureDetector';
import type { HandData } from '../hooks/useMediaPipe';
import { HeldGestureTracker, GESTURE_HOLD_MS } from '../hooks/useGestureControl';

interface Props {
  handRef: React.RefObject<HandData>;
  onResume: () => void;
  onRestart: () => void;
  onQuitToMenu: () => void;
}

export default function PauseScreen({ handRef, onResume, onRestart, onQuitToMenu }: Props) {
  const trackerRef = useRef(new HeldGestureTracker(GESTURE_HOLD_MS));
  const [progress, setProgress] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    function loop(now: number) {
      const hand = handRef.current;
      const state = trackerRef.current.update(hand?.isFist ?? false, now);
      setProgress(state.progress);
      if (state.justFired && !firedRef.current) {
        firedRef.current = true;
        onResume();
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-6">
      <GestureDetector handRef={handRef}>
        {(dwell) => (
          <>
            <h1 className="text-4xl font-black text-white tracking-widest">PAUSED</h1>

            <div className="flex flex-col items-center gap-1">
              <svg width="72" height="72" className="-rotate-90">
                <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                <circle
                  cx="36" cy="36" r="30" fill="none" stroke="#39ff88" strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 30}
                  strokeDashoffset={2 * Math.PI * 30 * (1 - progress)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-white/60 text-sm -mt-14">✊</span>
              <span className="text-white/50 text-xs mt-6">Make a fist to resume</span>
            </div>

            <div className="flex flex-col gap-3 w-72">
              <DwellButton id="restart" dwell={dwell} onClick={onRestart} className="py-3.5 rounded-2xl font-bold text-white bg-white/10 border border-white/15">
                🔄 Restart Level
              </DwellButton>
              <DwellButton id="quit" dwell={dwell} onClick={onQuitToMenu} className="py-3.5 rounded-2xl font-bold text-white/70 bg-white/5 border border-white/10">
                🏠 Quit to Menu
              </DwellButton>
            </div>
          </>
        )}
      </GestureDetector>
    </div>
  );
}
