interface Props {
  country: string;
  score: number;
  combo: number;
  comboMult: number;
  mistakes: number;
  completed: number;
  total: number;
  elapsedSec: number;
  targetSec: number;
  practiceMode?: boolean;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function HUD({ country, score, combo, comboMult, mistakes, completed, total, elapsedSec, targetSec, practiceMode }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white">
      <div>
        <p className="text-xs text-white/50">Painting</p>
        <p className="font-bold text-lg">{country}</p>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <p className="text-white/50 text-[10px] uppercase">Regions</p>
          <p className="font-bold">{completed}/{total}</p>
        </div>
        <div className="text-center">
          <p className="text-white/50 text-[10px] uppercase">Mistakes</p>
          <p className="font-bold">{mistakes}</p>
        </div>
        {!practiceMode && (
          <div className="text-center">
            <p className="text-white/50 text-[10px] uppercase">Time</p>
            <p className={`font-bold font-mono ${elapsedSec > targetSec ? 'text-orange-300' : ''}`}>
              {fmtTime(elapsedSec)} / {fmtTime(targetSec)}
            </p>
          </div>
        )}
        {combo >= 2 && (
          <div className="text-center animate-pulse">
            <p className="text-yellow-300 text-[10px] uppercase">Combo</p>
            <p className="font-bold text-yellow-300">x{comboMult}</p>
          </div>
        )}
        {!practiceMode && (
          <div className="text-center">
            <p className="text-white/50 text-[10px] uppercase">Score</p>
            <p className="font-bold text-violet-300">{score}</p>
          </div>
        )}
      </div>
    </div>
  );
}
