import { motion } from 'framer-motion';

interface Props { onBack: () => void; }

export default function Credits({ onBack }: Props) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center"
         style={{ background: 'radial-gradient(ellipse at 50% 50%, #0d0028 0%, #0a0014 70%)' }}>

      <button onClick={onBack} className="absolute top-6 left-6 text-purple-300 hover:text-white transition-colors text-2xl">←</button>

      <motion.div className="flex flex-col items-center gap-6 text-center px-8 max-w-lg"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

        <motion.div className="text-7xl" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
          🏓
        </motion.div>

        <h1 className="text-4xl font-black"
            style={{ background: 'linear-gradient(135deg,#c084fc,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Gesture Table Tennis Arena
        </h1>
        <p className="text-purple-300 text-sm uppercase tracking-widest">A KinetoFun Original</p>

        <div className="mt-4 flex flex-col gap-3 w-full">
          {[
            { role: 'Game Design', name: 'KinetoFun Studio' },
            { role: 'Programming', name: 'KinetoFun Engineering' },
            { role: 'Art & UI', name: 'KinetoFun Design' },
            { role: 'Hand Tracking', name: 'MediaPipe (Google)' },
            { role: 'Framework', name: 'React + Vite + TypeScript' },
          ].map(c => (
            <div key={c.role} className="flex justify-between items-center px-4 py-3 rounded-xl"
                 style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-gray-400 text-sm">{c.role}</span>
              <span className="text-white font-semibold text-sm">{c.name}</span>
            </div>
          ))}
        </div>

        <p className="text-gray-600 text-sm mt-4">
          All gameplay, code, and assets are original works<br/>created for the KinetoFun platform. © 2025
        </p>

        <button onClick={onBack}
          className="mt-4 px-8 py-3 rounded-2xl font-bold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
          ← Back to Menu
        </button>
      </motion.div>
    </div>
  );
}
