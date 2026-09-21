import { useGameStore } from '../../stores/useGameStore';
import { setMusicVolume, setSfxVolume } from '../../game/audio/audioSystem';
import HoverButton from '../common/HoverButton';
import GestureSlider from '../common/GestureSlider';
import CameraCycleButton from '../common/CameraCycleButton';

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const settings = useGameStore((s) => s.save.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);

  return (
    <div className="absolute inset-0 bg-[#12101a] text-white flex flex-col items-center px-8 py-6 overflow-y-auto">
      <div className="flex items-center justify-between w-full max-w-md mb-8">
        <h1 className="text-2xl font-extrabold">⚙ Settings</h1>
        <HoverButton onSelect={onBack} className="rounded-full overflow-hidden">
          <div className="px-4 py-1.5 bg-white/10 text-sm font-bold">Back</div>
        </HoverButton>
      </div>

      <div className="w-full max-w-md flex flex-col gap-6">
        <Field label="Camera">
          <CameraCycleButton
            deviceId={settings.cameraDeviceId}
            onChange={(id) => updateSettings({ cameraDeviceId: id })}
          />
        </Field>

        <GestureSlider
          label={`Gesture Sensitivity — ${settings.gestureSensitivity.toFixed(1)}`}
          min={0.5} max={2} step={0.1}
          value={settings.gestureSensitivity}
          onChange={(v) => updateSettings({ gestureSensitivity: v })}
        />

        <Field label="Graphics Quality">
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <HoverButton key={q} onSelect={() => updateSettings({ graphicsQuality: q })} className="flex-1 rounded-lg overflow-hidden">
                <div className={`py-2 text-sm font-bold capitalize text-center ${settings.graphicsQuality === q ? 'bg-orange-500' : 'bg-white/10'}`}>
                  {q}
                </div>
              </HoverButton>
            ))}
          </div>
        </Field>

        <GestureSlider
          label={`Music Volume — ${Math.round(settings.musicVolume * 100)}%`}
          min={0} max={1} step={0.05}
          value={settings.musicVolume}
          onChange={(v) => { updateSettings({ musicVolume: v }); setMusicVolume(v); }}
        />

        <GestureSlider
          label={`SFX Volume — ${Math.round(settings.sfxVolume * 100)}%`}
          min={0} max={1} step={0.05}
          value={settings.sfxVolume}
          onChange={(v) => { updateSettings({ sfxVolume: v }); setSfxVolume(v); }}
        />
      </div>

      <p className="mt-8 text-xs text-white/30">Hover a control with your fingertip to adjust it</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-white/60 mb-2">{label}</label>
      {children}
    </div>
  );
}
