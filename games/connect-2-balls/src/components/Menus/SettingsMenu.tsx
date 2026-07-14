import { ArrowLeft, Volume2, VolumeX, Monitor, Hand, Eye, Palette } from 'lucide-react';
import { Theme, GameSettings } from '../../data/types';
import { GestureButton, GestureSlider, GestureToggle } from '../GestureUI';

interface SettingsMenuProps {
  theme: Theme;
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  onBack: () => void;
}

export default function SettingsMenu({ theme, settings, onUpdate, onBack }: SettingsMenuProps) {
  return (
    <div className="min-h-screen flex flex-col p-6" style={{ background: theme.background }}>
      <div className="flex items-center gap-4 mb-8">
        <GestureButton
          onActivate={onBack}
          className="p-2 rounded-full backdrop-blur-md"
          style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
        >
          <ArrowLeft className="w-5 h-5" />
        </GestureButton>
        <h2 className="text-2xl font-bold" style={{ color: theme.textColor }}>Settings</h2>
      </div>

      <div className="max-w-md mx-auto w-full space-y-6">
        {/* Controls */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 opacity-60" style={{ color: theme.textColor }}>
            Controls
          </h3>
          <div className="space-y-3">
            <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <GestureSlider
                value={settings.sensitivity}
                min={0.3}
                max={2}
                step={0.1}
                onChange={(val) => onUpdate({ ...settings, sensitivity: val })}
                label="Sensitivity"
                accentColor={theme.accentColor}
              />
            </div>
            <GestureToggle
              value={settings.leftHanded}
              onChange={(val) => onUpdate({ ...settings, leftHanded: val })}
              label="Left-Handed Mode"
              icon={<Hand className="w-5 h-5" />}
              accentColor={theme.accentColor}
            />
            <GestureToggle
              value={settings.largeCursor}
              onChange={(val) => onUpdate({ ...settings, largeCursor: val })}
              label="Large Cursor"
              icon={<Monitor className="w-5 h-5" />}
              accentColor={theme.accentColor}
            />
          </div>
        </section>

        {/* Audio */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 opacity-60" style={{ color: theme.textColor }}>
            Audio
          </h3>
          <div className="space-y-3">
            <GestureToggle
              value={settings.soundEnabled}
              onChange={(val) => onUpdate({ ...settings, soundEnabled: val })}
              label="Sound Effects"
              icon={settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              accentColor={theme.accentColor}
            />
            <GestureToggle
              value={settings.musicEnabled}
              onChange={(val) => onUpdate({ ...settings, musicEnabled: val })}
              label="Music"
              icon={settings.musicEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              accentColor={theme.accentColor}
            />
            <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <GestureSlider
                value={settings.volume}
                min={0}
                max={1}
                step={0.1}
                onChange={(val) => onUpdate({ ...settings, volume: val })}
                label="Volume"
                accentColor={theme.accentColor}
              />
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3 opacity-60" style={{ color: theme.textColor }}>
            Accessibility
          </h3>
          <div className="space-y-3">
            <GestureToggle
              value={settings.colorblindMode}
              onChange={(val) => onUpdate({ ...settings, colorblindMode: val })}
              label="Colorblind Mode"
              icon={<Palette className="w-5 h-5" />}
              accentColor={theme.accentColor}
            />
            <GestureToggle
              value={settings.highContrast}
              onChange={(val) => onUpdate({ ...settings, highContrast: val })}
              label="High Contrast"
              icon={<Eye className="w-5 h-5" />}
              accentColor={theme.accentColor}
            />
            <GestureToggle
              value={settings.reducedParticles}
              onChange={(val) => onUpdate({ ...settings, reducedParticles: val })}
              label="Reduced Particles"
              icon={<Eye className="w-5 h-5" />}
              accentColor={theme.accentColor}
            />
          </div>
        </section>
      </div>

      {/* Gesture hint */}
      <div className="mt-8 text-center text-xs opacity-40" style={{ color: theme.textColor }}>
        Pinch slider to adjust - Pinch toggle to switch - Open palm to go back
      </div>
    </div>
  );
}
