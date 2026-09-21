/** Settings screen — music, sound, gesture sensitivity, graphics quality. */
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Settings as SettingsType } from '../../types';
import { playUiClick, setMusicEnabled, setSoundEnabled } from '../../game/audio/audioSystem';
import { resetSave } from '../../hooks/useSaveSystem';

interface Props {
  settings:  SettingsType;
  onChange:  (s: Partial<SettingsType>) => void;
  onBack:    () => void;
  onReset:   () => void;
}

export default function Settings({ settings, onChange, onBack, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);

  function toggle(key: keyof SettingsType) {
    playUiClick();
    const val = !settings[key as 'music' | 'sound'];
    onChange({ [key]: val });
    if (key === 'music') setMusicEnabled(val as boolean);
    if (key === 'sound') setSoundEnabled(val as boolean);
  }

  function ToggleRow({ label, icon, settingKey }: { label: string; icon: string; settingKey: 'music' | 'sound' }) {
    const on = settings[settingKey];
    return (
      <div className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="text-white font-medium text-sm">{label}</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => toggle(settingKey)}
          className="w-12 h-6 rounded-full flex items-center px-0.5 transition-all"
          style={{ background: on ? '#FF6B35' : 'rgba(255,255,255,0.15)' }}
        >
          <motion.div
            className="w-5 h-5 bg-white rounded-full shadow"
            animate={{ x: on ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        </motion.button>
      </div>
    );
  }

  function SliderRow({ label, icon, value, min, max, step, fmt, onChange: change }: {
    label: string; icon: string; value: number;
    min: number; max: number; step: number;
    fmt: (v: number) => string;
    onChange: (v: number) => void;
  }) {
    return (
      <div className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <span className="text-white font-medium text-sm">{label}</span>
          </div>
          <span className="text-white/60 text-sm font-bold">{fmt(value)}</span>
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => change(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
      </div>
    );
  }

  const qualities: Array<SettingsType['graphicsQuality']> = ['low', 'medium', 'high'];

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0b0e1a,#1a1040)' }}
    >
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { playUiClick(); onBack(); }}
          className="glass rounded-xl px-4 py-2 text-white font-bold text-sm"
        >
          ← Back
        </motion.button>
        <h2 className="text-2xl font-black text-white">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
        <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest">Audio</h3>
        <ToggleRow label="Music"        icon="🎵" settingKey="music" />
        <ToggleRow label="Sound Effects" icon="🔊" settingKey="sound" />

        <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mt-2">Controls</h3>
        <SliderRow
          label="Gesture Sensitivity" icon="✋"
          value={settings.gestureSensitivity} min={0.5} max={2} step={0.1}
          fmt={v => `${v.toFixed(1)}×`}
          onChange={v => onChange({ gestureSensitivity: v })}
        />

        <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mt-2">Graphics</h3>
        <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🖥️</span>
            <span className="text-white font-medium text-sm">Quality</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {qualities.map(q => (
              <motion.button
                key={q}
                whileTap={{ scale: 0.95 }}
                onClick={() => { playUiClick(); onChange({ graphicsQuality: q }); }}
                className="py-2 rounded-xl text-sm font-bold capitalize"
                style={{
                  background: settings.graphicsQuality === q
                    ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.08)',
                  border: `1.5px solid ${settings.graphicsQuality === q
                    ? 'rgba(255,107,53,0.7)' : 'rgba(255,255,255,0.12)'}`,
                  color: settings.graphicsQuality === q ? '#FF6B35' : 'rgba(255,255,255,0.7)',
                }}
              >
                {q}
              </motion.button>
            ))}
          </div>
        </div>

        <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mt-2">Data</h3>
        {!confirmReset ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { playUiClick(); setConfirmReset(true); }}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(239,83,80,0.15)', border: '1.5px solid rgba(239,83,80,0.35)', color: '#ef5350' }}
          >
            🗑️ Reset All Progress
          </motion.button>
        ) : (
          <div className="rounded-xl p-4" style={{ background: 'rgba(239,83,80,0.1)', border: '1.5px solid rgba(239,83,80,0.4)' }}>
            <p className="text-red-400 text-sm font-bold mb-3">⚠️ This will erase all coins, unlocks and stats. Are you sure?</p>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { playUiClick(); resetSave(); onReset(); }}
                className="flex-1 py-2 rounded-lg text-sm font-bold bg-red-600 text-white"
              >Yes, Reset</motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2 rounded-lg text-sm font-bold glass text-white"
              >Cancel</motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
