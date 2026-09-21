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
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: 'linear-gradient(160deg,#04060f 0%,#0d1626 100%)' }}>
      <GestureDetector handRef={handRef}>
        {(dwell) => (
          <div className="min-h-full flex flex-col items-center px-6 py-10 gap-6">
            <h1 className="text-3xl font-black text-white">How to Play</h1>

            <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-emerald-300 font-bold mb-3 uppercase tracking-wider text-sm">Gesture Controls</h2>
              <div className="grid gap-2">
                {ROWS.map(([g, d]) => (
                  <div key={g} className="flex justify-between gap-4 text-sm bg-black/30 rounded-lg px-3 py-2">
                    <span className="text-white font-semibold whitespace-nowrap">{g}</span>
                    <span className="text-white/60 text-right">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-cyan-300 font-bold mb-3 uppercase tracking-wider text-sm">Objective</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Collect every energy orb in the maze while avoiding the four AI hunters. Grab a glowing <b className="text-amber-300">power orb</b> to
                turn the tables for 8 seconds — hunters flash blue and you can defeat them for bonus points. Rare <b className="text-amber-300">gems</b> and{' '}
                <b className="text-fuchsia-300">treasures</b> appear briefly for big score bonuses. Clear all orbs to advance to the next sector.
              </p>
            </div>

            <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-fuchsia-300 font-bold mb-3 uppercase tracking-wider text-sm">The Hunters</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-black/30 rounded-lg px-3 py-2">
                  <b className="text-red-400">{ENEMY_LABELS.chaser}</b>
                  <div className="text-white/60 text-xs">Always paths straight toward you</div>
                </div>
                <div className="bg-black/30 rounded-lg px-3 py-2">
                  <b className="text-orange-400">{ENEMY_LABELS.ambusher}</b>
                  <div className="text-white/60 text-xs">Predicts where you're headed and cuts you off</div>
                </div>
                <div className="bg-black/30 rounded-lg px-3 py-2">
                  <b className="text-violet-400">{ENEMY_LABELS.patroller}</b>
                  <div className="text-white/60 text-xs">Follows a fixed patrol loop</div>
                </div>
                <div className="bg-black/30 rounded-lg px-3 py-2">
                  <b className="text-cyan-400">{ENEMY_LABELS.hunter}</b>
                  <div className="text-white/60 text-xs">Unpredictable — sometimes random, sometimes biased toward you</div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-amber-300 font-bold mb-3 uppercase tracking-wider text-sm">Scoring</h2>
              <p className="text-white/70 text-sm">Orb 10 · Power Orb 50 · Gem 100 · Enemy Defeated 200 · Treasure 500 — combo streaks multiply everything up to x5.</p>
            </div>

            <DwellButton id="back" dwell={dwell} onClick={onBack} className="mt-2 px-8 py-3 rounded-2xl font-bold text-white bg-white/10 border border-white/15">
              ← Back
            </DwellButton>
          </div>
        )}
      </GestureDetector>
    </div>
  );
}
