import GestureDetector, { DwellButton } from './GestureDetector';
import type { HandData } from '../hooks/useMediaPipe';
import { ENEMY_LABELS } from '../game/EnemyAI';

interface Props {
  handRef: React.RefObject<HandData>;
  onBack: () => void;
}

const ROWS: [string, string][] = [
  ['🖐️ Move your hand', 'Steer through the maze — up/down/left/right zones around center'],
  ['🖐️ Open palm (hold 0.7s)', 'Pause the game'],
  ['✊ Closed fist (hold 0.7s)', 'Resume from pause'],
  ['👍 Thumbs up (hold 0.7s)', 'Confirm / continue'],
  ['✌️ Victory sign (hold 0.7s)', 'Restart the level'],
  ['🖐️ Hover any button (1.2s)', 'Selects it — no clicking required'],
];

export default function HowToPlayScreen({ handRef, onBack }: Props) {
  // Laid out to fit one TV screen: there is no way to scroll by hand.
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(160deg,#04060f 0%,#0d1626 100%)' }}>
      <GestureDetector handRef={handRef}>
        {(dwell) => (
          <div className="h-full flex flex-col items-center justify-center px-8 py-6 gap-5">
            <h1 className="text-5xl font-black text-white">How to Play</h1>

            <div className="w-full max-w-6xl grid grid-cols-2 gap-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h2 className="text-emerald-300 font-bold mb-3 uppercase tracking-wider text-sm">Gesture Controls</h2>
                <div className="grid gap-2">
                  {ROWS.map(([g, d]) => (
                    <div key={g} className="bg-black/30 rounded-lg px-3 py-2">
                      <div className="text-white font-semibold">{g}</div>
                      <div className="text-white/65 text-sm">{d}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h2 className="text-cyan-300 font-bold mb-2 uppercase tracking-wider text-sm">Goal</h2>
                  <p className="text-white/75 leading-snug">
                    Eat every orb in the maze and dodge the four hunters. A glowing <b className="text-amber-300">power orb</b> lets
                    you catch hunters for 8 seconds. Clear all orbs to reach the next sector.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h2 className="text-fuchsia-300 font-bold mb-2 uppercase tracking-wider text-sm">The Hunters</h2>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><b className="text-red-400">{ENEMY_LABELS.chaser}</b> <span className="text-white/65">heads straight for you</span></div>
                    <div><b className="text-orange-400">{ENEMY_LABELS.ambusher}</b> <span className="text-white/65">cuts you off</span></div>
                    <div><b className="text-violet-400">{ENEMY_LABELS.patroller}</b> <span className="text-white/65">walks a fixed loop</span></div>
                    <div><b className="text-cyan-400">{ENEMY_LABELS.hunter}</b> <span className="text-white/65">hard to predict</span></div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h2 className="text-amber-300 font-bold mb-2 uppercase tracking-wider text-sm">Scoring</h2>
                  <p className="text-white/75 text-sm leading-snug">
                    Orb 10 · Power orb 50 · Gem 100 · Hunter 200 · Treasure 500. Gems and treasures appear only briefly. Combo streaks multiply everything.
                  </p>
                </div>
              </div>
            </div>

            <DwellButton id="back" dwell={dwell} onClick={onBack} className="px-14 py-4 rounded-2xl font-black text-xl text-white bg-emerald-600 border border-emerald-400/50">
              Let's Play
            </DwellButton>
          </div>
        )}
      </GestureDetector>
    </div>
  );
}
