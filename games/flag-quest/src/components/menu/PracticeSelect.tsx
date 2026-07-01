import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import { ALL_FLAGS } from '../../flags';
import { useProgressStore } from '../../stores/progressStore';
import FlagPreview from '../game/FlagPreview';

export default function PracticeSelect({ onSelect, onBack }: { onSelect: (flagId: string) => void; onBack: () => void }) {
  const isCountryUnlocked = useProgressStore((s) => s.isCountryUnlocked);
  const unlockedFlags = ALL_FLAGS.filter((f) => isCountryUnlocked(f.id));

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0f2a1e] via-[#0c1230] to-[#0b0620] flex flex-col items-center text-white px-6 py-8 overflow-hidden">
      <h1 className="text-3xl font-extrabold mb-1">Practice Mode</h1>
      <p className="text-white/50 text-sm mb-6">Unlimited time · hints enabled · no score pressure</p>

      <div className="grid grid-cols-5 gap-4 max-w-5xl overflow-y-auto">
        {unlockedFlags.map((flag, i) => (
          <motion.div key={flag.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
            <HoverButton
              onActivate={() => onSelect(flag.id)}
              ringColor="#2FA35A"
              className="flex flex-col items-center gap-1.5 w-32 rounded-xl bg-white/5 border border-white/10 p-2"
            >
              <div className="w-full aspect-[3/2] rounded-md overflow-hidden bg-black/30">
                <FlagPreview flag={flag} />
              </div>
              <span className="text-xs font-semibold">{flag.country}</span>
            </HoverButton>
          </motion.div>
        ))}
      </div>

      <div className="mt-8">
        <HoverButton onActivate={onBack} ringColor="#E4362E" className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-sm font-semibold">
          ← Back
        </HoverButton>
      </div>
    </div>
  );
}
