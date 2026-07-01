import { useEffect, useRef, useState } from 'react';
import GestureDetector, { DwellButton } from './GestureDetector';
import type { HandData } from '../hooks/useMediaPipe';
import { HeldGestureTracker, GESTURE_HOLD_MS } from '../hooks/useGestureControl';

interface Props {
  handRef: React.RefObject<HandData>;
  score: number;
  level: number;
  isNewHighScore: boolean;
  onRestart: () => void;
  onMenu: () => void;
}

export default function GameOverScreen({ handRef, score, level, isNewHighScore, onRestart, onMenu }: Props) {
  const trackerRef = useRef(new HeldGestureTracker(GESTURE_HOLD_MS));
  const [progress, setProgress] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    function loop(now: number) {
      const hand = handRef.current;
      const state = trackerRef.current.update(hand?.isVictory ?? false, now);
      setProgress(state.progress);
      if (state.justFired && !firedRef.current) {
        firedRef.current = true;
        onRestart();
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-5">
      <GestureDetector handRef={handRef}>
        {(dwell) => (
          <>
            <h1 className="text-5xl font-black text-red-400" style={{ textShadow: '0 0 20px rgba(255,80,80,0.6)' }}>
              GAME OVER
            </h1>
            {isNewHighScore && <div className="text-amber-300 font-bold uppercase tracking-widest animate-pulse-glow">✨ New High Score! ✨</div>}
            <div className="text-white/70 text-lg">
              Final Score <b className="text-white text-2xl">{score.toLocaleString()}</b>
            </div>
            <div className="text-white/40 text-sm">Reached Level {level}</div>

            <div className="flex flex-col items-center gap-1 mt-2">
              <svg width="64" height="64" className="-rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                <circle
                  cx="32" cy="32" r="26" fill="none" stroke="#0af0ff" strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - progress)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-white/50 text-xs mt-6">✌️ Victory sign to restart</span>
            </div>

            <div className="flex gap-3 mt-2">
              <DwellButton id="restart" dwell={dwell} onClick={onRestart} className="px-8 py-3.5 rounded-2xl font-black text-black" style={{ background: 'linear-gradient(135deg,#39ff88,#0af0ff)' }}>
                🔄 PLAY AGAIN
              </DwellButton>
              <DwellButton id="menu" dwell={dwell} onClick={onMenu} className="px-8 py-3.5 rounded-2xl font-bold text-white/80 bg-white/10 border border-white/15">
                🏠 MAIN MENU
              </DwellButton>
            </div>
          </>
        )}
      </GestureDetector>
    </div>
  );
}
