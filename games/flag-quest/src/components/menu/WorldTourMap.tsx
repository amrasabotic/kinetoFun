import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import { CONTINENT_ORDER, getFlagsByContinent } from '../../flags';
import { useProgressStore } from '../../stores/progressStore';
import type { Continent } from '../../types';

const CONTINENT_ICON: Record<Continent, string> = {
  Europe: '🏰', Asia: '🏯', Africa: '🦁', 'North America': '🗽', 'South America': '🌴', Oceania: '🏝',
};

export default function WorldTourMap({ onSelect, onBack }: { onSelect: (c: Continent) => void; onBack: () => void }) {
  const unlockedContinents = useProgressStore((s) => s.unlockedContinents);
  const starsByFlag = useProgressStore((s) => s.starsByFlag);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0d1b3a] via-[#0c1230] to-[#0b0620] flex flex-col items-center justify-center text-white px-6">
      <h1 className="text-3xl font-extrabold mb-1">World Tour</h1>
      <p className="text-white/50 text-sm mb-8">Hover a continent to explore its flags</p>

      <div className="grid grid-cols-3 gap-6 max-w-4xl">
        {CONTINENT_ORDER.map((c, i) => {
          const unlocked = unlockedContinents.includes(c);
          const flags = getFlagsByContinent(c);
          const stars = flags.reduce((s, f) => s + (starsByFlag[f.id] ?? 0), 0);
          const maxStars = flags.length * 3;
          return (
            <motion.div key={c} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <HoverButton
                onActivate={() => unlocked && onSelect(c)}
                disabled={!unlocked}
                ringColor="#2A5CD6"
                className="flex flex-col items-center justify-center gap-1.5 w-44 h-40 rounded-3xl bg-white/5 border border-white/10"
              >
                <span className="text-4xl">{unlocked ? CONTINENT_ICON[c] : '🔒'}</span>
                <span className="font-bold text-lg">{c}</span>
                <span className="text-xs text-white/50">{flags.length} flags</span>
                {unlocked && <span className="text-xs text-yellow-300">⭐ {stars}/{maxStars}</span>}
              </HoverButton>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-10">
        <HoverButton onActivate={onBack} ringColor="#E4362E" className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-sm font-semibold">
          ← Back
        </HoverButton>
      </div>
    </div>
  );
}
