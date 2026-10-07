import React from 'react';

const STEPS: { icon: string; title: string; desc: string }[] = [
  { icon: '🛡️', title: 'Turn your shield', desc: 'Point your index finger at the camera and move it around in a circle. The shield turns to face your finger — follow the dotted circle in the camera view.' },
  { icon: '🍎', title: 'Block the apples', desc: 'Apples fly in from every side. Block them with the shield for 10 points. Each apple that hits you costs a heart — you have 3.' },
  { icon: '⭐', title: 'Let the stars in', desc: 'A star that reaches you is worth 50 points, so move the shield out of its way.' },
  { icon: '📖', title: 'Pick a mode', desc: 'Story Mode: survive 4 levels of 45–60 seconds each. Endless Mode: keep going until your hearts run out.' },
];

interface HowToPlayProps {
  onDone: () => void;
}

export const HowToPlay: React.FC<HowToPlayProps> = ({ onDone }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900 p-6">
    <div className="w-full max-w-3xl">
      <h1 className="mb-2 text-center text-5xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-yellow-400 bg-clip-text text-transparent">
        How to Play
      </h1>
      <p className="mb-8 text-center text-lg text-slate-400">Shield Hero is played with your hand — no mouse needed</p>

      <div className="mb-8 grid grid-cols-2 gap-4">
        {STEPS.map((s) => (
          <div key={s.title} className="flex gap-4 rounded-2xl border border-slate-700 bg-slate-800/80 p-5">
            <div className="shrink-0 text-4xl">{s.icon}</div>
            <div>
              <div className="text-lg font-semibold text-white">{s.title}</div>
              <div className="mt-1 text-sm leading-relaxed text-slate-300">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          data-dwell=""
          onClick={onDone}
          className="rounded-xl bg-emerald-500 px-12 py-4 text-2xl font-bold text-white shadow-lg shadow-emerald-500/30"
        >
          Let&apos;s Play!
        </button>
        <p className="text-sm text-slate-400">
          👉 Point at a button and hold your hand still until the ring around the cursor closes
        </p>
      </div>
    </div>
  </div>
);
