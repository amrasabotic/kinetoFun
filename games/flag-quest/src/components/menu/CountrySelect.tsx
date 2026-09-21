import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import { getFlagsByContinent } from '../../flags';
import { useProgressStore } from '../../stores/progressStore';
import type { Continent } from '../../types';
import FlagPreview from '../game/FlagPreview';

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: '#2FA35A', medium: '#F4C430', hard: '#F07A26', expert: '#E4362E',
};

export default function CountrySelect({
  continent, onSelect, onBack,
}: { continent: Continent; onSelect: (flagId: string) => void; onBack: () => void }) {
  const flags = getFlagsByContinent(continent);
  const isCountryUnlocked = useProgressStore((s) => s.isCountryUnlocked);
  const starsByFlag = useProgressStore((s) => s.starsByFlag);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0d1b3a] via-[#0c1230] to-[#0b0620] flex flex-col items-center text-white px-6 py-8 overflow-hidden">
      <h1 className="text-3xl font-extrabold mb-1">{continent}</h1>
      <p className="text-white/50 text-sm mb-6">Hover a flag to start painting</p>

      <div className="grid grid-cols-4 gap-5 max-w-5xl overflow-y-auto">
        {flags.map((flag, i) => {
          const unlocked = isCountryUnlocked(flag.id);
          const stars = starsByFlag[flag.id] ?? 0;
          return (
            <motion.div key={flag.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
              <HoverButton
                onActivate={() => unlocked && onSelect(flag.id)}
                disabled={!unlocked}
                ringColor={DIFFICULTY_COLOR[flag.difficulty]}
                className="flex flex-col items-center gap-2 w-40 rounded-2xl bg-white/5 border border-white/10 p-3"
              >
                <div className="w-full aspect-[3/2] rounded-lg overflow-hidden bg-black/30 relative flex items-center justify-center">
                  {unlocked ? <FlagPreview flag={flag} /> : <span className="text-3xl">🔒</span>}
                </div>
                <span className="text-sm font-semibold">{flag.country}</span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                    style={{ background: `${DIFFICULTY_COLOR[flag.difficulty]}33`, color: DIFFICULTY_COLOR[flag.difficulty] }}
                  >
                    {flag.difficulty}
                  </span>
                  {unlocked && (
                    <span className="text-xs text-yellow-300">{'⭐'.repeat(stars) || '☆☆☆'}</span>
                  )}
                </div>
              </HoverButton>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8">
        <HoverButton onActivate={onBack} ringColor="#E4362E" className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-sm font-semibold">
          ← Back to Map
        </HoverButton>
      </div>
    </div>
  );
}
