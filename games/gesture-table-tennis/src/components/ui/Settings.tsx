import { motion } from 'framer-motion';
import type { GameSettings } from '../../types';

interface Props {
  settings: GameSettings;
  onChange: (p: Partial<GameSettings>) => void;
  onBack: () => void;
  onReset: () => void;
}

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-300 text-sm font-medium">{label}</span>
        <span className="text-purple-300 font-bold text-sm">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #7c3aed ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 0)` }}
      />
    </div>
  );
}

export default function SettingsScreen({ settings, onChange, onBack, onReset }: Props) {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden"
         style={{ background: 'radial-gradient(ellipse at 20% 80%, #1a003a 0%, #0a0014 70%)' }}>

      <div className="flex items-center gap-4 p-6 pb-4">
        <button onClick={onBack} className="text-purple-300 hover:text-white transition-colors text-2xl">←</button>
        <h2 className="text-3xl font-black text-white">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-6">

        {/* Audio */}
        <Section title="Audio" icon="🔊">
          <Slider label="Music Volume" value={settings.musicVolume} min={0} max={1} step={0.05}
            onChange={v => onChange({ musicVolume: v })} format={v => `${Math.round(v * 100)}%`} />
          <Slider label="SFX Volume" value={settings.sfxVolume} min={0} max={1} step={0.05}
            onChange={v => onChange({ sfxVolume: v })} format={v => `${Math.round(v * 100)}%`} />
        </Section>

        {/* Gesture */}
        <Section title="Gesture Control" icon="✋">
          <Slider label="Gesture Sensitivity" value={settings.gestureSensitivity} min={0.5} max={2.0} step={0.1}
            onChange={v => onChange({ gestureSensitivity: v })} format={v => v.toFixed(1)} />
          <Slider label="Hand Smoothing" value={settings.handSmoothing} min={0} max={0.95} step={0.05}
            onChange={v => onChange({ handSmoothing: v })} format={v => v.toFixed(2)} />
          <Toggle label="Handedness" value={settings.handedness}
            options={[{ v: 'right', label: '✋ Right' }, { v: 'left', label: '🤚 Left' }]}
            onChange={v => onChange({ handedness: v as 'left' | 'right' })} />
        </Section>

        {/* Graphics */}
        <Section title="Graphics" icon="🖥️">
          <Toggle label="Quality" value={settings.graphicsQuality}
            options={[{ v: 'low', label: 'Low' }, { v: 'medium', label: 'Medium' }, { v: 'high', label: 'High' }]}
            onChange={v => onChange({ graphicsQuality: v as 'low' | 'medium' | 'high' })} />
        </Section>

        {/* Defaults */}
        <Section title="Defaults" icon="🎮">
          <Toggle label="Difficulty" value={settings.defaultDifficulty}
            options={[{ v: 'easy', label: 'Easy' }, { v: 'medium', label: 'Medium' }, { v: 'hard', label: 'Hard' }, { v: 'expert', label: 'Expert' }]}
            onChange={v => onChange({ defaultDifficulty: v as GameSettings['defaultDifficulty'] })} />
        </Section>

        {/* Reset */}
        <button onClick={() => { if (confirm('Reset all progress? This cannot be undone.')) onReset(); }}
          className="py-3 rounded-2xl font-bold text-red-400 transition-all hover:bg-red-900/20"
          style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
          ⚠️ Reset All Progress
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h3 className="text-purple-300 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
        <span>{icon}</span>{title}
      </h3>
      {children}
    </motion.div>
  );
}

function Toggle({ label, value, options, onChange }: {
  label: string; value: string;
  options: { v: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-gray-300 text-sm font-medium">{label}</span>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button key={opt.v} onClick={() => onChange(opt.v)}
            className="px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
            style={value === opt.v
              ? { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
