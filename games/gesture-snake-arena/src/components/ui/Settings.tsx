import { useState } from 'react';
import type { GameSettings } from '../../types';
import { setMusicVolume, setSfxVolume, playClick } from '../../game/audio/audioSystem';

interface Props {
  settings: GameSettings;
  onChange: (partial: Partial<GameSettings>) => void;
  onBack: () => void;
  onReset: () => void;
}

export default function SettingsScreen({ settings, onChange, onBack, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a1e, #0d0d35)' }}>
      <div className="flex items-center gap-4 px-6 pt-6 pb-4">
        <button className="px-5 py-3 rounded-2xl bg-white/10 text-white/80 font-display text-lg hover:text-white transition-colors"
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
          className="w-full py-4 rounded-2xl font-display font-bold text-red-400 mt-4 transition-all active:scale-95"
          style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)' }}
          onClick={() => {
            playClick();
            // A browser confirm dialog cannot be answered by hand, so the
            // button asks for a second press instead.
            if (confirmReset) onReset(); else setConfirmReset(true);
          }}>
          {confirmReset ? 'Press again to erase everything' : 'Reset All Progress'}
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

// Settings are changed by hand on a TV, so every control is a large button:
// a slider or dropdown cannot be operated with the hand cursor.
const STEP_BTN = 'w-12 h-12 rounded-xl text-2xl font-bold text-white disabled:opacity-30';
const STEP_BTN_STYLE = { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' };

function SliderRow({ label, value, min = 0, max = 1, step = 0.1, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => {
    playClick();
    onChange(Math.round(Math.min(max, Math.max(min, v)) * 100) / 100);
  };
  const fill = (value - min) / (max - min);
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="text-sm font-sans text-white/80 w-40">{label}</div>
      <button className={STEP_BTN} style={STEP_BTN_STYLE} disabled={value <= min}
        onClick={() => set(value - step)} aria-label={`Lower ${label}`}>−</button>
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-violet-500" style={{ width: `${fill * 100}%` }} />
      </div>
      <button className={STEP_BTN} style={STEP_BTN_STYLE} disabled={value >= max}
        onClick={() => set(value + step)} aria-label={`Raise ${label}`}>+</button>
      <div className="text-xs font-sans text-white/40 w-10 text-right">{value.toFixed(1)}</div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-sm font-sans text-white/80">{label}</div>
      <button
        className="w-24 h-12 rounded-full transition-all relative"
        style={{ background: value ? '#7C3AED' : 'rgba(255,255,255,0.15)' }}
        onClick={() => { playClick(); onChange(!value); }}>
        <div className="absolute top-1 w-10 h-10 bg-white rounded-full shadow transition-all"
          style={{ left: value ? '52px' : '4px' }} />
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
      <div className="flex gap-2">
        {options.map(o => (
          <button key={o.value}
            className="px-4 h-12 rounded-xl text-sm font-bold font-sans"
            style={o.value === value
              ? { background: '#7C3AED', color: '#fff' }
              : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
            onClick={() => { playClick(); onChange(o.value); }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
