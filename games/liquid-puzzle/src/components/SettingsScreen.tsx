import { AnimatedBackground } from './AnimatedBackground';
import { DwellButton } from './DwellButton';
import { Cursor } from './Cursor';
import type { GestureState, Settings } from '../types';

interface SettingsScreenProps {
  settings: Settings;
  onChange: (partial: Partial<Settings>) => void;
  onResetProgress: () => void;
  onBack: () => void;
  gesture: GestureState;
}

/** A stepped +/- control rather than a drag-slider — this game has no pinch-drag gesture defined, so every numeric setting is adjusted in discrete hover-dwell steps instead. */
function SteppedRow({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="lp-settings-row">
      <span className="lp-settings-row__label">{label}</span>
      <div className="lp-settings-row__control">
        <DwellButton label="−" holdMs={400} onActivate={onDec} className="lp-step-btn" />
        <div className="lp-settings-row__bar">
          <div className="lp-settings-row__bar-fill" style={{ width: `${Math.round(value * 100)}%` }} />
        </div>
        <DwellButton label="+" holdMs={400} onActivate={onInc} className="lp-step-btn" />
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="lp-settings-row">
      <span className="lp-settings-row__label">{label}</span>
      <DwellButton label={value ? 'On' : 'Off'} onActivate={onToggle} className={`lp-toggle-btn ${value ? 'lp-toggle-btn--on' : ''}`} />
    </div>
  );
}

const STEP = 0.1;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function SettingsScreen({ settings, onChange, onResetProgress, onBack, gesture }: SettingsScreenProps) {
  return (
    <div className="lp-screen">
      <AnimatedBackground />
      <div className="lp-panel">
        <h2 className="lp-screen__title">Settings</h2>

        <SteppedRow
          label="Gesture Sensitivity"
          value={settings.gestureSensitivity}
          onDec={() => onChange({ gestureSensitivity: clamp01(settings.gestureSensitivity - STEP) })}
          onInc={() => onChange({ gestureSensitivity: clamp01(settings.gestureSensitivity + STEP) })}
        />
        <SteppedRow
          label="Cursor Speed"
          value={settings.cursorSpeed}
          onDec={() => onChange({ cursorSpeed: clamp01(settings.cursorSpeed - STEP) })}
          onInc={() => onChange({ cursorSpeed: clamp01(settings.cursorSpeed + STEP) })}
        />
        <ToggleRow
          label="High-Quality Animation"
          value={settings.animationQuality === 'high'}
          onToggle={() => onChange({ animationQuality: settings.animationQuality === 'high' ? 'low' : 'high' })}
        />
        <SteppedRow
          label="Music Volume"
          value={settings.musicVolume}
          onDec={() => onChange({ musicVolume: clamp01(settings.musicVolume - STEP) })}
          onInc={() => onChange({ musicVolume: clamp01(settings.musicVolume + STEP) })}
        />
        <SteppedRow
          label="SFX Volume"
          value={settings.sfxVolume}
          onDec={() => onChange({ sfxVolume: clamp01(settings.sfxVolume - STEP) })}
          onInc={() => onChange({ sfxVolume: clamp01(settings.sfxVolume + STEP) })}
        />
        <ToggleRow label="Colorblind Mode" value={settings.colorblindMode} onToggle={() => onChange({ colorblindMode: !settings.colorblindMode })} />
        <ToggleRow label="Left-Handed Layout" value={settings.leftHandedMode} onToggle={() => onChange({ leftHandedMode: !settings.leftHandedMode })} />

        <DwellButton label="Reset Progress" holdMs={1200} onActivate={onResetProgress} className="lp-menu-btn lp-menu-btn--danger" />
        <DwellButton label="Back" onActivate={onBack} className="lp-menu-btn lp-menu-btn--warn" />
      </div>
      <Cursor gesture={gesture} />
    </div>
  );
}
