import { useEffect, useState } from 'react';
import * as audio from '../game/audio';

interface Props {
  label?: string;
  onDone: () => void;
}

export default function CountdownOverlay({ label, onDone }: Props) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    audio.playCountdownBeep(false);
    if (count === 0) {
      audio.playCountdownBeep(true);
      const t = setTimeout(onDone, 550);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 pointer-events-none z-30">
      {label && <div className="text-white/70 text-xl font-bold mb-4 tracking-widest uppercase">{label}</div>}
      <div
        key={count}
        className="font-black text-white animate-pulse-glow"
        style={{ fontSize: '10rem', textShadow: '0 0 40px #39ff88', lineHeight: 1 }}
      >
        {count === 0 ? 'GO!' : count}
      </div>
    </div>
  );
}
