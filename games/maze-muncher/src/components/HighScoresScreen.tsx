import GestureDetector, { DwellButton } from './GestureDetector';
import type { HandData } from '../hooks/useMediaPipe';
import type { SaveData } from '../types/GameTypes';

interface Props {
  handRef: React.RefObject<HandData>;
  save: SaveData;
  onBack: () => void;
}

export default function HighScoresScreen({ handRef, save, onBack }: Props) {
  return (
    <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#04060f 0%,#0d1626 100%)' }}>
      <GestureDetector handRef={handRef}>
        {(dwell) => (
          <div className="w-full h-full flex flex-col items-center justify-center px-6 gap-6">
            <h1 className="text-3xl font-black text-white">🏆 High Scores</h1>
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {save.highScores.length === 0 ? (
                <div className="text-white/50 text-center py-10">No scores yet — play a game!</div>
              ) : (
                save.highScores.map((entry, i) => (
                  <div key={i} className={`flex items-center justify-between px-5 py-3 ${i % 2 === 0 ? 'bg-white/[0.03]' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className={`font-black w-6 text-center ${i === 0 ? 'text-amber-300' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-white/40'}`}>
                        {i + 1}
                      </span>
                      <span className="text-white/50 text-xs">Lv.{entry.level}</span>
                    </div>
                    <span className="text-white font-bold tabular-nums">{entry.score.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
            <DwellButton id="back" dwell={dwell} onClick={onBack} className="px-8 py-3 rounded-2xl font-bold text-white bg-white/10 border border-white/15">
              ← Back
            </DwellButton>
          </div>
        )}
      </GestureDetector>
    </div>
  );
}
