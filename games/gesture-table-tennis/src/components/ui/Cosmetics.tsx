import { useState } from 'react';
import { motion } from 'framer-motion';
import { PADDLE_SKINS, BALL_SKINS, TRAIL_SKINS } from '../../constants/gameConfig';
import type { SaveData, PaddleSkinId, BallSkinId, TrailId } from '../../types';

type Tab = 'paddles' | 'balls' | 'trails';

interface Props {
  save: SaveData;
  onSelectPaddle: (id: PaddleSkinId) => void;
  onSelectBall: (id: BallSkinId) => void;
  onSelectTrail: (id: TrailId) => void;
  onPurchasePaddle: (id: PaddleSkinId, cost: number) => boolean;
  onPurchaseBall: (id: BallSkinId, cost: number) => boolean;
  onPurchaseTrail: (id: TrailId, cost: number) => boolean;
  onBack: () => void;
}

export default function Cosmetics({ save, onSelectPaddle, onSelectBall, onSelectTrail, onPurchasePaddle, onPurchaseBall, onPurchaseTrail, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('paddles');
  const [flashMsg, setFlashMsg] = useState('');

  function flash(msg: string) {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(''), 2000);
  }

  function handlePaddleAction(skin: typeof PADDLE_SKINS[0]) {
    if (save.unlockedPaddles.includes(skin.id)) { onSelectPaddle(skin.id); flash('Equipped!'); }
    else if (onPurchasePaddle(skin.id, skin.cost)) flash(`Unlocked ${skin.name}!`);
    else flash('Not enough coins!');
  }
  function handleBallAction(skin: typeof BALL_SKINS[0]) {
    if (save.unlockedBalls.includes(skin.id)) { onSelectBall(skin.id); flash('Equipped!'); }
    else if (onPurchaseBall(skin.id, skin.cost)) flash(`Unlocked ${skin.name}!`);
    else flash('Not enough coins!');
  }
  function handleTrailAction(skin: typeof TRAIL_SKINS[0]) {
    if (save.unlockedTrails.includes(skin.id)) { onSelectTrail(skin.id); flash('Equipped!'); }
    else if (onPurchaseTrail(skin.id, skin.cost)) flash(`Unlocked ${skin.name}!`);
    else flash('Not enough coins!');
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'paddles', label: 'Paddles', icon: '🏓' },
    { id: 'balls',   label: 'Balls',   icon: '⚪' },
    { id: 'trails',  label: 'Trails',  icon: '✨' },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden"
         style={{ background: 'radial-gradient(ellipse at 70% 30%, #1a003a 0%, #0a0014 70%)' }}>

      {/* Header */}
      <div className="flex items-center gap-4 p-6 pb-2">
        <button onClick={onBack} className="text-purple-300 hover:text-white transition-colors text-2xl">←</button>
        <h2 className="text-3xl font-black text-white flex-1">Cosmetics</h2>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <span className="text-xl">🪙</span>
          <span className="text-yellow-300 font-black text-xl">{save.coins}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 mb-4">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-xl font-bold text-sm transition-all"
            style={tab === t.id
              ? { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Flash message */}
      {flashMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mx-6 mb-3 px-4 py-2 rounded-xl text-center font-bold text-sm"
          style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
          {flashMsg}
        </motion.div>
      )}

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {tab === 'paddles' && PADDLE_SKINS.map(skin => {
            const owned = save.unlockedPaddles.includes(skin.id);
            const selected = save.selectedPaddle === skin.id;
            return (
              <motion.button key={skin.id} onClick={() => handlePaddleAction(skin)}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="p-3 rounded-2xl flex flex-col items-center gap-2 transition-all"
                style={{
                  background: selected ? `${skin.colors[0]}33` : owned ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${selected ? skin.colors[0] : owned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: owned ? 1 : 0.75,
                }}>
                <div className="text-3xl">{skin.emoji}</div>
                <div className="text-white font-bold text-xs text-center">{skin.name}</div>
                <div className="text-xs font-bold" style={{ color: owned ? '#4ade80' : '#fbbf24' }}>
                  {selected ? '✓ Equipped' : owned ? 'Equip' : `🪙 ${skin.cost}`}
                </div>
              </motion.button>
            );
          })}
          {tab === 'balls' && BALL_SKINS.map(skin => {
            const owned = save.unlockedBalls.includes(skin.id);
            const selected = save.selectedBall === skin.id;
            return (
              <motion.button key={skin.id} onClick={() => handleBallAction(skin)}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="p-3 rounded-2xl flex flex-col items-center gap-2 transition-all"
                style={{
                  background: selected ? `${skin.color}33` : owned ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${selected ? skin.color : owned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: owned ? 1 : 0.75,
                }}>
                <div className="text-3xl">{skin.emoji}</div>
                <div className="text-white font-bold text-xs text-center">{skin.name}</div>
                <div className="text-xs font-bold" style={{ color: owned ? '#4ade80' : '#fbbf24' }}>
                  {selected ? '✓ Equipped' : owned ? 'Equip' : `🪙 ${skin.cost}`}
                </div>
              </motion.button>
            );
          })}
          {tab === 'trails' && TRAIL_SKINS.map(skin => {
            const owned = save.unlockedTrails.includes(skin.id);
            const selected = save.selectedTrail === skin.id;
            const previewColor = skin.colors[0] ?? '#aaa';
            return (
              <motion.button key={skin.id} onClick={() => handleTrailAction(skin)}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="p-3 rounded-2xl flex flex-col items-center gap-2 transition-all"
                style={{
                  background: selected ? `${previewColor}22` : owned ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${selected ? previewColor : owned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: owned ? 1 : 0.75,
                }}>
                <div className="text-3xl">{skin.emoji}</div>
                <div className="text-white font-bold text-xs text-center">{skin.name}</div>
                <div className="text-xs font-bold" style={{ color: owned ? '#4ade80' : '#fbbf24' }}>
                  {selected ? '✓ Equipped' : owned ? 'Equip' : skin.cost === 0 ? 'Free' : `🪙 ${skin.cost}`}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
