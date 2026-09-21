import { motion } from 'framer-motion';

interface Props {
  onResume: () => void;
  onMenu: () => void;
}

export default function PauseMenu({ onResume, onMenu }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>

      <motion.div
        initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="flex flex-col items-center gap-6 p-10 rounded-3xl"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>

        <div className="text-7xl">⏸️</div>
        <h2 className="text-4xl font-black text-white">Paused</h2>
        <p className="text-gray-400">Game paused — take a breather!</p>

        <div className="flex flex-col gap-3 w-56">
          <button onClick={onResume}
            className="w-full py-4 rounded-2xl font-black text-xl text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            ▶ Resume
          </button>
          <button onClick={onMenu}
            className="w-full py-3 rounded-2xl font-bold text-gray-300 transition-all hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            ← Main Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
