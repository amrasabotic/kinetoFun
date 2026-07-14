/** Vehicle skin selection screen. */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { VEHICLE_SKINS } from '../../constants/gameConfig';
import type { SaveData, VehicleSkin } from '../../types';
import { playUiClick } from '../../game/audio/audioSystem';

interface Props {
  save:        SaveData;
  onBack:      () => void;
  onSelect:    (skinId: string) => void;
  onPurchase:  (skin: VehicleSkin) => boolean; // returns true if purchased
}

export default function Garage({ save, onBack, onSelect, onPurchase }: Props) {
  const [selected, setSelected] = useState(save.selectedSkin);
  const [bought,   setBought]   = useState<string | null>(null);

  function handleSelect(skin: VehicleSkin) {
    playUiClick();
    if (save.unlockedSkins.includes(skin.id)) {
      setSelected(skin.id);
      onSelect(skin.id);
    } else {
      if (onPurchase(skin)) {
        setBought(skin.id);
        setSelected(skin.id);
        onSelect(skin.id);
        setTimeout(() => setBought(null), 1500);
      }
    }
  }

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0b0e1a,#1a1040)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { playUiClick(); onBack(); }}
          className="glass rounded-xl px-4 py-2 text-white font-bold text-sm"
        >
          ← Back
        </motion.button>
        <h2 className="text-2xl font-black text-white">Garage</h2>
        <div className="ml-auto flex items-center gap-2 glass rounded-full px-4 py-1.5">
          <span className="text-base">🪙</span>
          <span className="text-white font-bold">{save.coins}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="grid grid-cols-2 gap-4">
          {VEHICLE_SKINS.map((skin, i) => {
            const owned = save.unlockedSkins.includes(skin.id);
            const isSelected = selected === skin.id;
            const canAfford = save.coins >= skin.cost;
            const justBought = bought === skin.id;

            return (
              <motion.div
                key={skin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-all
                  ${isSelected ? 'ring-2 ring-brand-orange' : ''}`}
                style={{
                  background: isSelected
                    ? 'rgba(255,107,53,0.18)'
                    : 'rgba(255,255,255,0.06)',
                  border: isSelected
                    ? '1.5px solid rgba(255,107,53,0.6)'
                    : '1.5px solid rgba(255,255,255,0.1)',
                }}
                onClick={() => handleSelect(skin)}
              >
                {/* Skin preview (mini vehicle) */}
                <div className="flex items-center justify-center h-16 rounded-xl"
                  style={{ background: `${skin.bodyColor}22` }}>
                  <MiniVehicle skin={skin} />
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-base">{skin.emoji}</span>
                    <span className="text-white font-bold text-sm">{skin.name}</span>
                  </div>
                  <p className="text-white/45 text-[11px] leading-relaxed">{skin.description}</p>
                </div>

                <div className="mt-auto">
                  {owned ? (
                    <div className={`text-center py-1.5 rounded-lg text-sm font-bold
                      ${isSelected ? 'bg-brand-orange text-white' : 'bg-white/10 text-white/70'}`}>
                      {isSelected ? '✓ Selected' : 'Select'}
                    </div>
                  ) : (
                    <div className={`text-center py-1.5 rounded-lg text-sm font-bold
                      ${canAfford ? 'cursor-pointer' : 'opacity-40'}`}
                      style={{
                        background: canAfford ? 'rgba(255,214,0,0.2)' : 'rgba(255,255,255,0.06)',
                        color: canAfford ? '#FFD600' : '#666',
                        border: canAfford ? '1px solid rgba(255,214,0,0.4)' : '1px solid rgba(255,255,255,0.1)',
                      }}>
                      {justBought ? '🎉 Unlocked!' : `🪙 ${skin.cost}`}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** SVG mini-vehicle preview for the garage card */
function MiniVehicle({ skin }: { skin: VehicleSkin }) {
  return (
    <svg width="90" height="44" viewBox="0 0 90 44">
      {/* Rear wheel */}
      <circle cx="20" cy="34" r="10" fill={skin.wheelColor} />
      <circle cx="20" cy="34" r="6"  fill={skin.rimColor} />
      {/* Front wheel */}
      <circle cx="70" cy="34" r="10" fill={skin.wheelColor} />
      <circle cx="70" cy="34" r="6"  fill={skin.rimColor} />
      {/* Body */}
      <rect x="8" y="18" width="74" height="20" rx="6" fill={skin.bodyColor} />
      {/* Cabin */}
      <rect x="26" y="6" width="38" height="16" rx="5" fill={skin.cabinColor} />
      {/* Window */}
      <rect x="30" y="9" width="30" height="10" rx="3" fill="rgba(150,220,255,0.6)" />
      {/* Accent stripe */}
      <line x1="12" y1="28" x2="74" y2="28" stroke={skin.accentColor} strokeWidth="3" strokeLinecap="round" />
      {/* Headlight */}
      <ellipse cx="82" cy="27" rx="4" ry="3" fill="#FFFF88" />
    </svg>
  );
}
