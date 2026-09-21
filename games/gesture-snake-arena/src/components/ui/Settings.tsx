import type { GameSettings } from '../../types';
import { setMusicVolume, setSfxVolume, playClick } from '../../game/audio/audioSystem';

interface Props {
  settings: GameSettings;
  onChange: (partial: Partial<GameSettings>) => void;
  onBack: () => void;
  onReset: () => void;
}

export default function SettingsScreen({ settings, onChange, onBack, onReset }: Props) {
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a1e, #0d0d35)' }}>
      <div className="flex items-center gap-4 px-6 pt-6 pb-4">
        <button className="text-white/60 font-display text-lg hover:text-white transition-colors"
          onClick={() => { playClick(); onBack(); }}>← Back</button>
        <h2 className="text-2xl font-black font-display text-white">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-4">

        <Section title="Audio">
          <SliderRow label="Music" value={settings.musicVolume}
            onChange={v => { onChange({ musicVolume: v }); setMusicVolume(v); }} />
          <SliderRow label="Sound FX" value={settings.soundVolume}
            onChange={v => { onChange({ soundVolume: v }); setSfxVolume(v); }} />
        </Section>

        <Section title="Controls">
          <SliderRow label="Gesture Sensitivity" value={settings.gestureSensitivity}
            min={0.5} max={2} step={0.1}
            onChange={v => onChange({ gestureSensitivity: v })} />
        </Section>

        <Section title="Gameplay">
          <ToggleRow label="Self Collision" value={settings.selfCollision}
            onChange={v => onChange({ selfCollision: v })} />
        </Section>

        <Section title="Display">
          <SelectRow label="Graphics Quality" value={settings.graphicsQuality}
            options={[
              { value: 'low',    label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high',   label: 'High' },
            ]}
            onChange={v => onChange({ graphicsQuality: v as GameSettings['graphicsQuality'] })}
          />
          <ToggleRow label="Show Minimap" value={settings.showMinimap}
            onChange={v => onChange({ showMinimap: v })} />
          <ToggleRow label="Show FPS" value={settings.showFPS}
            onChange={v => onChange({ showFPS: v })} />
        </Section>

        <button
          className="w-full py-3 rounded-2xl font-display font-bold text-red-400 mt-4 transition-all active:scale-95"
          style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)' }}
          onClick={() => { if (confirm('Reset all progress?')) { playClick(); onReset(); } }}>
          Reset All Progress
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 py-2 text-xs font-display font-bold uppercase tracking-widest text-white/40"
        style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {title}
      </div>
      <div className="flex flex-col divide-y divide-white/5">
        {children}
      </div>
    </div>
  );
}

function SliderRow({ label, value, min = 0, max = 1, step = 0.05, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="text-sm font-sans text-white/80 w-40">{label}</div>
      <input type="range" min={min} max={max} step={step} value={value}
        className="flex-1 accent-violet-500"
        onChange={e => onChange(parseFloat(e.target.value))} />
      <div className="text-xs font-sans text-white/40 w-10 text-right">{value.toFixed(1)}</div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-sm font-sans text-white/80">{label}</div>
      <button
        className="w-12 h-6 rounded-full transition-all relative"
        style={{ background: value ? '#7C3AED' : 'rgba(255,255,255,0.15)' }}
        onClick={() => { playClick(); onChange(!value); }}>
        <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
          style={{ left: value ? '26px' : '2px' }} />
      </button>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-sm font-sans text-white/80">{label}</div>
      <select
        className="bg-transparent text-white/80 text-sm font-sans rounded-lg px-2 py-1 border border-white/10"
        value={value}
        onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>)}
      </select>
    </div>
  );
}
