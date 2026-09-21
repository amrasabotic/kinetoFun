import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import { ALL_FLAGS } from '../../flags';
import { useProgressStore } from '../../stores/progressStore';
import FlagPreview from '../game/FlagPreview';
import type { FlagDef } from '../../types';

export default function GalleryScreen({ onBack }: { onBack: () => void }) {
  const isCountryUnlocked = useProgressStore((s) => s.isCountryUnlocked);
  const starsByFlag = useProgressStore((s) => s.starsByFlag);
  const bestScoreByFlag = useProgressStore((s) => s.bestScoreByFlag);
  const flagsCompleted = useProgressStore((s) => s.flagsCompleted);
  const [viewing, setViewing] = useState<FlagDef | null>(null);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#2a1a0f] via-[#0c1230] to-[#0b0620] flex flex-col items-center text-white px-6 py-8 overflow-hidden">
      <h1 className="text-3xl font-extrabold mb-1">Flag Gallery</h1>
      <p className="text-white/50 text-sm mb-6">{flagsCompleted.length} / {ALL_FLAGS.length} discovered</p>

      <div className="grid grid-cols-6 gap-3 max-w-5xl overflow-y-auto">
        {ALL_FLAGS.map((flag, i) => {
          const unlocked = isCountryUnlocked(flag.id);
          const stars = starsByFlag[flag.id] ?? 0;
          return (
            <motion.div key={flag.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}>
              <HoverButton
                onActivate={() => unlocked && setViewing(flag)}
                disabled={!unlocked}
                ringColor="#F4C430"
                className="flex flex-col items-center gap-1 w-24 rounded-lg bg-white/5 border border-white/10 p-1.5"
              >
                <div className="w-full aspect-[3/2] rounded overflow-hidden bg-black/30 flex items-center justify-center">
                  {unlocked ? <FlagPreview flag={flag} /> : <span className="text-lg">🔒</span>}
                </div>
                <span className="text-[10px] font-semibold truncate w-full text-center">{unlocked ? flag.country : '???'}</span>
                {unlocked && <span className="text-[9px] text-yellow-300">{'⭐'.repeat(stars) || '—'}</span>}
              </HoverButton>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6">
        <HoverButton onActivate={onBack} ringColor="#E4362E" className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-sm font-semibold">
          ← Back
        </HoverButton>
      </div>

      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1140] border border-white/15 rounded-3xl p-8 max-w-md w-full"
            >
              <div className="w-full aspect-[3/2] rounded-xl overflow-hidden mb-4 border border-white/10">
                <FlagPreview flag={viewing} />
              </div>
              <h2 className="text-2xl font-bold mb-1">{viewing.country}</h2>
              <p className="text-white/50 text-sm mb-4">{viewing.continent} · {viewing.difficulty}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                <dt className="text-white/40">Capital</dt><dd>{viewing.facts.capital}</dd>
                <dt className="text-white/40">Population</dt><dd>{viewing.facts.population}</dd>
                <dt className="text-white/40">Language</dt><dd>{viewing.facts.language}</dd>
                <dt className="text-white/40">Independence</dt><dd>{viewing.facts.independence}</dd>
                <dt className="text-white/40">Best score</dt><dd>{bestScoreByFlag[viewing.id] ?? 0}</dd>
                <dt className="text-white/40">Stars</dt><dd>{'⭐'.repeat(starsByFlag[viewing.id] ?? 0) || '—'}</dd>
              </dl>
              <p className="text-violet-200 text-sm italic mb-6">"{viewing.facts.funFact}"</p>
              <HoverButton
                onActivate={() => setViewing(null)}
                ringColor="#8C5CFF"
                className="px-6 py-2.5 rounded-full bg-white/10 border border-white/15 text-sm font-semibold w-full"
              >
                Close
              </HoverButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
