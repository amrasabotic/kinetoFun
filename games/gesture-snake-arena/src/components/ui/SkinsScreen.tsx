import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { SaveData, SnakeSkinId, HeadAccessoryId, TrailId } from '../../types';
import { SNAKE_SKINS, HEAD_ACCESSORIES, TRAILS } from '../../constants/gameConfig';
import { playClick } from '../../game/audio/audioSystem';

interface Props {
  save: SaveData;
  onBack: () => void;
  onSelectSkin: (id: SnakeSkinId) => void;
  onSelectAccessory: (id: HeadAccessoryId) => void;
  onSelectTrail: (id: TrailId) => void;
  onPurchaseSkin: (id: SnakeSkinId, cost: number) => boolean;
  onPurchaseAccessory: (id: HeadAccessoryId, cost: number) => boolean;
  onPurchaseTrail: (id: TrailId, cost: number) => boolean;
}

type Tab = 'skins' | 'accessories' | 'trails';

export default function SkinsScreen({
  save, onBack, onSelectSkin, onSelectAccessory, onSelectTrail,
  onPurchaseSkin, onPurchaseAccessory, onPurchaseTrail,
}: Props) {
  const [tab, setTab] = useState<Tab>('skins');
  const [flash, setFlash] = useState('');

  function buy(action: () => boolean, label: string) {
    const ok = action();
    setFlash(ok ? `✓ Unlocked ${label}!` : '✗ Not enough coins');
    setTimeout(() => setFlash(''), 2000);
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a1e, #0d0d35)' }}>

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-6 pb-3">
        <button className="text-white/60 font-display text-lg hover:text-white transition-colors"
          onClick={() => { playClick(); onBack(); }}>← Back</button>
        <h2 className="text-2xl font-black font-display text-white flex-1">Cosmetics</h2>
        <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold font-sans"
          style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD740', border: '1px solid #FFD74040' }}>
          🪙 {save.coins}
        </div>
      </div>

      {/* Flash */}
      <AnimatePresence>
        {flash && (
          <motion.div className="mx-6 px-4 py-2 rounded-xl text-center text-sm font-bold font-sans"
            style={{ background: flash.startsWith('✓') ? 'rgba(105,240,174,0.2)' : 'rgba(255,82,82,0.2)',
              color: flash.startsWith('✓') ? '#69F0AE' : '#FF5252', border: '1px solid currentColor' }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {flash}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 px-6 py-3">
        {(['skins','accessories','trails'] as Tab[]).map(t => (
          <button key={t}
            className={`flex-1 py-2 rounded-xl text-sm font-display font-bold transition-all ${tab === t ? 'text-white' : 'text-white/40'}`}
            style={tab === t ? { background: 'rgba(124,58,237,0.5)', border: '1px solid rgba(124,58,237,0.8)' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={() => { playClick(); setTab(t); }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {tab === 'skins' && SNAKE_SKINS.map(skin => {
            const owned = save.unlockedSkins.includes(skin.id);
            const selected = save.selectedSkin === skin.id;
            return (
              <SkinCard
                key={skin.id}
                name={skin.name}
                colors={skin.colors}
                cost={skin.cost}
                owned={owned}
                selected={selected}
                onSelect={() => { playClick(); onSelectSkin(skin.id); }}
                onBuy={() => { playClick(); buy(() => onPurchaseSkin(skin.id, skin.cost), skin.name); }}
              />
            );
          })}
          {tab === 'accessories' && HEAD_ACCESSORIES.map(acc => {
            const owned = save.unlockedAccessories.includes(acc.id);
            const selected = save.selectedAccessory === acc.id;
            return (
              <SimpleCard
                key={acc.id}
                name={acc.name}
                cost={acc.cost}
                owned={owned}
                selected={selected}
                onSelect={() => { playClick(); onSelectAccessory(acc.id); }}
                onBuy={() => { playClick(); buy(() => onPurchaseAccessory(acc.id, acc.cost), acc.name); }}
              />
            );
          })}
          {tab === 'trails' && TRAILS.map(trail => {
            const owned = save.unlockedTrails.includes(trail.id);
            const selected = save.selectedTrail === trail.id;
            return (
              <SimpleCard
                key={trail.id}
                name={trail.name}
                cost={trail.cost}
                owned={owned}
                selected={selected}
                onSelect={() => { playClick(); onSelectTrail(trail.id); }}
                onBuy={() => { playClick(); buy(() => onPurchaseTrail(trail.id, trail.cost), trail.name); }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SkinCard({ name, colors, cost, owned, selected, onSelect, onBuy }: {
  name: string; colors: string[]; cost: number; owned: boolean; selected: boolean;
  onSelect: () => void; onBuy: () => void;
}) {
  return (
    <div className="rounded-2xl p-3 flex flex-col gap-2"
      style={{ background: selected ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${selected ? 'rgba(124,58,237,0.8)' : 'rgba(255,255,255,0.1)'}` }}>
      {/* Snake preview */}
      <div className="h-12 rounded-xl flex items-center justify-center gap-1"
        style={{ background: 'rgba(0,0,0,0.3)' }}>
        {colors.map((c, i) => (
          <div key={i} className="rounded-full" style={{ width: 28 - i * 4, height: 28 - i * 4, background: c }} />
        ))}
      </div>
      <div className="font-display font-bold text-white text-sm text-center">{name}</div>
      {owned
        ? <button className="py-1.5 rounded-xl text-xs font-bold font-sans transition-all"
            style={selected
              ? { background: 'rgba(124,58,237,0.6)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
            onClick={onSelect}>
            {selected ? '✓ Selected' : 'Select'}
          </button>
        : <button className="py-1.5 rounded-xl text-xs font-bold font-sans"
            style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD740', border: '1px solid #FFD74040' }}
            onClick={onBuy}>
            🪙 {cost}
          </button>
      }
    </div>
  );
}

function SimpleCard({ name, cost, owned, selected, onSelect, onBuy }: {
  name: string; cost: number; owned: boolean; selected: boolean;
  onSelect: () => void; onBuy: () => void;
}) {
  return (
    <div className="rounded-2xl p-3 flex flex-col gap-2"
      style={{ background: selected ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${selected ? 'rgba(124,58,237,0.8)' : 'rgba(255,255,255,0.1)'}` }}>
      <div className="h-12 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-2xl">{cost === 0 ? '🆓' : '⭐'}</span>
      </div>
      <div className="font-display font-bold text-white text-sm text-center">{name}</div>
      {owned
        ? <button className="py-1.5 rounded-xl text-xs font-bold font-sans"
            style={selected
              ? { background: 'rgba(124,58,237,0.6)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
            onClick={onSelect}>
            {selected ? '✓ Active' : 'Select'}
          </button>
        : <button className="py-1.5 rounded-xl text-xs font-bold font-sans"
            style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD740', border: '1px solid #FFD74040' }}
            onClick={onBuy}>
            🪙 {cost}
          </button>
      }
    </div>
  );
}
