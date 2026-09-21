import GestureDetector, { DwellButton } from './GestureDetector';
import type { HandData } from '../hooks/useMediaPipe';
import type { Settings } from '../types/GameTypes';

interface Props {
  handRef: React.RefObject<HandData>;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onCalibrate: () => void;
  onBack: () => void;
  onResetProgress: () => void;
}

function Stepper({ id, dwell, label, value, onDec, onInc, format }: { id: string; dwell: { active: string | null; progress: number }; label: string; value: number; onDec: () => void; onInc: () => void; format: (v: number) => string }) {
  return (
    <div className="flex items-center justify-between bg-black/30 rounded-xl px-4 py-2.5">
      <span className="text-white/80 text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <DwellButton id={`${id}-dec`} dwell={dwell} onClick={onDec} className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold border border-white/15">
          −
        </DwellButton>
        <span className="text-white font-mono w-12 text-center">{format(value)}</span>
        <DwellButton id={`${id}-inc`} dwell={dwell} onClick={onInc} className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold border border-white/15">
          +
        </DwellButton>
      </div>
    </div>
  );
}

function Toggle({ id, dwell, label, value, onToggle }: { id: string; dwell: { active: string | null; progress: number }; label: string; value: boolean; onToggle: () => void }) {
  return (
    <DwellButton id={id} dwell={dwell} onClick={onToggle} className="flex items-center justify-between bg-black/30 rounded-xl px-4 py-2.5 w-full">
      <span className="text-white/80 text-sm font-medium">{label}</span>
      <div className={`w-11 h-6 rounded-full relative transition-colors ${value ? 'bg-emerald-400' : 'bg-white/15'}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </div>
    </DwellButton>
  );
}

export default function SettingsScreen({ handRef, settings, onChange, onCalibrate, onBack, onResetProgress }: Props) {
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: 'linear-gradient(160deg,#04060f 0%,#0d1626 100%)' }}>
      <GestureDetector handRef={handRef}>
        {(dwell) => (
          <div className="min-h-full flex flex-col items-center px-6 py-10 gap-4">
            <h1 className="text-3xl font-black text-white mb-2">Settings</h1>

            <div className="w-full max-w-lg flex flex-col gap-2.5">
              <Stepper id="sens" dwell={dwell} label="Gesture Sensitivity" value={settings.sensitivity} format={(v) => v.toFixed(1)}
                onDec={() => onChange({ sensitivity: Math.max(0.5, Math.round((settings.sensitivity - 0.1) * 10) / 10) })}
                onInc={() => onChange({ sensitivity: Math.min(2, Math.round((settings.sensitivity + 0.1) * 10) / 10) })} />
              <Stepper id="smooth" dwell={dwell} label="Movement Smoothing" value={settings.smoothing} format={(v) => v.toFixed(1)}
                onDec={() => onChange({ smoothing: Math.max(0, Math.round((settings.smoothing - 0.1) * 10) / 10) })}
                onInc={() => onChange({ smoothing: Math.min(0.9, Math.round((settings.smoothing + 0.1) * 10) / 10) })} />
              <Stepper id="dz" dwell={dwell} label="Dead Zone" value={settings.deadzone} format={(v) => v.toFixed(2)}
                onDec={() => onChange({ deadzone: Math.max(0.03, Math.round((settings.deadzone - 0.01) * 100) / 100) })}
                onInc={() => onChange({ deadzone: Math.min(0.2, Math.round((settings.deadzone + 0.01) * 100) / 100) })} />
              <Stepper id="music" dwell={dwell} label="Music Volume" value={settings.musicVolume} format={(v) => `${Math.round(v * 100)}%`}
                onDec={() => onChange({ musicVolume: Math.max(0, Math.round((settings.musicVolume - 0.1) * 10) / 10) })}
                onInc={() => onChange({ musicVolume: Math.min(1, Math.round((settings.musicVolume + 0.1) * 10) / 10) })} />
              <Stepper id="sfx" dwell={dwell} label="Sound Effects Volume" value={settings.sfxVolume} format={(v) => `${Math.round(v * 100)}%`}
                onDec={() => onChange({ sfxVolume: Math.max(0, Math.round((settings.sfxVolume - 0.1) * 10) / 10) })}
                onInc={() => onChange({ sfxVolume: Math.min(1, Math.round((settings.sfxVolume + 0.1) * 10) / 10) })} />

              <Toggle id="sound" dwell={dwell} label="Sound Enabled" value={settings.sound} onToggle={() => onChange({ sound: !settings.sound })} />
              <Toggle id="contrast" dwell={dwell} label="High Contrast Mode" value={settings.highContrast} onToggle={() => onChange({ highContrast: !settings.highContrast })} />
              <Toggle id="colorblind" dwell={dwell} label="Colorblind-Friendly Palette" value={settings.colorblindMode} onToggle={() => onChange({ colorblindMode: !settings.colorblindMode })} />
              <Toggle id="largeui" dwell={dwell} label="Large UI Text" value={settings.largeUI} onToggle={() => onChange({ largeUI: !settings.largeUI })} />
              <Toggle id="lefthand" dwell={dwell} label="Left-Handed Mode" value={settings.leftHanded} onToggle={() => onChange({ leftHanded: !settings.leftHanded })} />
              <Toggle id="fps" dwell={dwell} label="Show FPS" value={settings.showFps} onToggle={() => onChange({ showFps: !settings.showFps })} />
              <Toggle id="aimassist" dwell={dwell} label="Turn Assist (snap to nearest open path)" value={settings.aimAssist} onToggle={() => onChange({ aimAssist: !settings.aimAssist })} />

              <DwellButton id="calibrate" dwell={dwell} onClick={onCalibrate} className="mt-2 py-3 rounded-xl font-bold text-black bg-cyan-300">
                🎯 Calibrate Center (hold hand at rest, then select)
              </DwellButton>
              <DwellButton id="resetprogress" dwell={dwell} onClick={onResetProgress} className="py-2.5 rounded-xl font-semibold text-red-300 bg-red-500/10 border border-red-500/30">
                Reset High Scores & Settings
              </DwellButton>
            </div>

            <DwellButton id="back" dwell={dwell} onClick={onBack} className="mt-2 px-8 py-3 rounded-2xl font-bold text-white bg-white/10 border border-white/15">
              ← Back
            </DwellButton>
          </div>
        )}
      </GestureDetector>
    </div>
  );
}
