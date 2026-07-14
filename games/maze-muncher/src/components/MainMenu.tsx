import GestureDetector, { DwellButton } from './GestureDetector';
import type { HandData } from '../hooks/useMediaPipe';

interface Props {
  handRef: React.RefObject<HandData>;
  highScore: number;
  onStart: () => void;
  onHowToPlay: () => void;
  onSettings: () => void;
  onHighScores: () => void;
  onQuit: () => void;
}

export default function MainMenu({ handRef, highScore, onStart, onHowToPlay, onSettings, onHighScores, onQuit }: Props) {
  return (
    <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 20%, #0d1a2b 0%, #04060f 70%)' }}>
      <GestureDetector handRef={handRef}>
        {(dwell) => (
          <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-6">
            <div className="text-center">
              <div className="text-6xl mb-2">👾</div>
              <h1
                className="font-black text-5xl tracking-tight"
                style={{ color: '#39ff88', textShadow: '0 0 20px #39ff88, 0 0 50px rgba(57,255,136,0.5)' }}
              >
                MAZE MUNCHER
              </h1>
              <div className="text-xl font-bold text-white/60 mt-1 tracking-[0.3em]">GESTURE EDITION</div>
              <div className="text-white/40 text-sm mt-3">High Score: {highScore.toLocaleString()}</div>
            </div>

            <div className="flex flex-col gap-3 w-80">
              <DwellButton
                id="start"
                dwell={dwell}
                onClick={onStart}
                className="py-5 rounded-2xl text-2xl font-black text-black"
                style={{ background: 'linear-gradient(135deg,#39ff88,#0af0ff)', boxShadow: '0 4px 30px rgba(57,255,136,0.4)' }}
              >
                ▶ START GAME
              </DwellButton>
              <div className="grid grid-cols-2 gap-3">
                <DwellButton id="howto" dwell={dwell} onClick={onHowToPlay} className="py-3.5 rounded-2xl text-base font-bold text-white bg-white/10 border border-white/15">
                  ❔ How to Play
                </DwellButton>
                <DwellButton id="settings" dwell={dwell} onClick={onSettings} className="py-3.5 rounded-2xl text-base font-bold text-white bg-white/10 border border-white/15">
                  ⚙️ Settings
                </DwellButton>
              </div>
              <DwellButton id="highscores" dwell={dwell} onClick={onHighScores} className="py-3.5 rounded-2xl text-base font-bold text-white bg-white/10 border border-white/15">
                🏆 High Scores
              </DwellButton>
              <DwellButton id="quit" dwell={dwell} onClick={onQuit} className="py-3 rounded-2xl text-sm font-semibold text-white/50 bg-white/5 border border-white/10">
                ✕ Quit
              </DwellButton>
            </div>

            <p className="text-white/35 text-xs max-w-md text-center">
              Move your hand to steer through the maze · Open palm to pause · Hover a button for a second to select it
            </p>
          </div>
        )}
      </GestureDetector>
    </div>
  );
}
