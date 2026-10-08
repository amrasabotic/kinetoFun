'use client';

import { useEffect, useRef, useState } from 'react';
import { DwellTracker } from '@/lib/gestures';

// Buttons ignore the hand for a moment after they appear, so a hand already
// resting where a new screen puts a button does not press it.
const ARM_MS = 1500;

interface DwellButtonProps {
  cursorX: number;
  cursorY: number;
  handPresent: boolean;
  onDone: () => void;
  className?: string;
  children: React.ReactNode;
}

/** A button pressed by holding the hand cursor over it until the ring fills. */
export function DwellButton({ cursorX, cursorY, handPresent, onDone, className = '', children }: DwellButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dwellRef = useRef(new DwellTracker(1200));
  const shownAt = useRef(Date.now());
  const doneRef = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || doneRef.current) return;
    const r = el.getBoundingClientRect();
    const x = cursorX * window.innerWidth;
    const y = cursorY * window.innerHeight;
    const over =
      handPresent &&
      Date.now() - shownAt.current >= ARM_MS &&
      x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    const { completed, progress: p } = dwellRef.current.update(over ? 'btn' : null);
    setProgress(over ? p : 0);
    if (completed) {
      doneRef.current = true;
      onDone();
    }
  }, [cursorX, cursorY, handPresent, onDone]);

  return (
    <div ref={ref} className={`relative overflow-hidden cursor-none ${className}`}>
      <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${progress * 100}%` }} />
      <span className="relative">{children}</span>
    </div>
  );
}

const STEPS = [
  { icon: '👋', title: 'Wave to start', desc: 'Wave your hand at the camera on the main screen.' },
  { icon: '☝️', title: 'Point and hold', desc: 'Point at a mode or an answer and hold still until the ring fills. Or pinch 🤏 to pick it at once.' },
  { icon: '✈️', title: 'Visit places', desc: 'Read about each destination, then wave, show a thumbs up 👍 or an open palm ✋ to continue.' },
  { icon: '🏆', title: 'Score points', desc: 'Answer 10 questions per trip. In Time Challenge, faster answers earn a bonus.' },
];

interface HowToPlayProps {
  cursorX: number;
  cursorY: number;
  handPresent: boolean;
  onDone: () => void;
}

export default function HowToPlay({ cursorX, cursorY, handPresent, onDone }: HowToPlayProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white px-8 select-none">
      <h1 className="text-6xl font-black tracking-tight mb-2 bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent">
        How to Play
      </h1>
      <p className="text-xl text-blue-200 mb-8">Travel the world and answer questions using only your hand.</p>

      <div className="grid grid-cols-2 gap-5 max-w-4xl w-full mb-8">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex gap-4 items-start bg-white/10 border border-white/20 rounded-3xl p-5">
            <div className="text-5xl leading-none">{s.icon}</div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-yellow-300">Step {i + 1}</div>
              <div className="text-2xl font-bold">{s.title}</div>
              <p className="text-white/70 text-base mt-1">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <DwellButton
        cursorX={cursorX}
        cursorY={cursorY}
        handPresent={handPresent}
        onDone={onDone}
        className="px-16 py-5 rounded-3xl bg-gradient-to-r from-yellow-400 to-orange-400 text-[#1a1440] text-3xl font-black shadow-2xl"
      >
        Let&apos;s Play
      </DwellButton>
      <p className="mt-4 text-white/50 text-lg">☝️ Point at the button and hold still</p>
    </div>
  );
}
