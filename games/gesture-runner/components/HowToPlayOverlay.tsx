'use client';

interface HowToPlayOverlayProps {
  onContinue: () => void;
}

const MOVES = [
  { icon: '🙌', color: '#00ff88', title: 'Jump', body: 'Raise both hands above your shoulders to leap over low blocks.' },
  { icon: '🧎', color: '#ffe04d', title: 'Slide', body: 'Duck down to slide under high arches.' },
  { icon: '↔️', color: '#4dc8ff', title: 'Change lane', body: 'Lean left or right to switch between the 3 lanes and dodge cones, crates and barriers.' },
];

const POWER_UPS = [
  { name: 'Magnet', desc: 'pulls in coins' },
  { name: 'Shield', desc: 'absorbs one hit' },
  { name: 'Speed', desc: 'short boost' },
  { name: 'Double coins', desc: 'x2 coin score' },
];

/**
 * Forced "read this before you play" overlay. Dismissed only by a real click
 * button, never by a gesture — gesture dismissal fires on a hand already in pose.
 */
export function HowToPlayOverlay({ onContinue }: HowToPlayOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-[#000818]/95 flex items-center justify-center p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
    >
      <div className="w-full max-w-3xl flex flex-col gap-6 my-auto">
        <div className="text-center">
          <h1
            className="text-5xl font-black text-[#00ffcc]"
            style={{ textShadow: '0 0 30px #00ffcc80' }}
          >
            HOW TO PLAY
          </h1>
          <p className="text-gray-300 text-lg mt-3">
            Run as far as you can. Use your whole body to dodge obstacles and collect coins.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MOVES.map((m) => (
            <div key={m.title} className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-center">
              <div className="text-4xl mb-2">{m.icon}</div>
              <div className="text-xl font-bold mb-1" style={{ color: m.color }}>{m.title}</div>
              <p className="text-gray-400 text-sm leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-gray-300 text-sm space-y-2">
          <p><span className="text-[#ffe04d] font-bold">Coins</span> add to your score; distance adds too, and the run gets faster over time.</p>
          <p><span className="text-[#ff6b6b] font-bold">One hit ends the run</span> — unless you have a shield.</p>
          <p className="text-gray-400">
            Power-ups:{' '}
            {POWER_UPS.map((p, i) => (
              <span key={p.name}>
                <span className="text-[#00ffcc] font-semibold">{p.name}</span> ({p.desc}){i < POWER_UPS.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
          <p className="text-gray-400">
            Stand 2–4 m from the camera with your full body visible. Next you&apos;ll calibrate, and the game starts automatically once you&apos;re steady.
          </p>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="self-center px-14 py-4 rounded-xl bg-[#00ff88] text-black text-2xl font-bold hover:bg-[#00cc66] transition-colors"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}
