import { motion } from 'framer-motion';
import { playClick } from '../../game/audio/audioSystem';

export default function Credits({ onBack }: { onBack: () => void }) {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a1e, #0d0d35)' }}>
      <motion.div
        className="flex flex-col items-center gap-6 px-8 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-5xl">🐍</div>
        <h2 className="text-3xl font-black font-display text-white">Gesture Snake Arena</h2>
        <div className="text-white/50 font-sans leading-relaxed max-w-sm">
          <p className="mb-2">An original gesture-controlled snake arena game.</p>
          <p className="mb-2">Built for the <span className="text-violet-400 font-bold">KinetoFun</span> platform.</p>
          <p className="text-sm">Powered by React, HTML5 Canvas,<br/>MediaPipe Hands, and Zustand.</p>
        </div>
        <div className="text-white/20 text-xs font-sans">
          All designs and gameplay are original works.<br/>
          No existing games were copied or cloned.
        </div>
        <button
          className="mt-4 px-8 py-3 rounded-2xl font-display font-bold text-white transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
          onClick={() => { playClick(); onBack(); }}>
          ← Back
        </button>
      </motion.div>
    </div>
  );
}
