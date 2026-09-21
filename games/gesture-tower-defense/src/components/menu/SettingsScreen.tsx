import HoverButton from '../common/HoverButton';
import GestureSlider from '../common/GestureSlider';
import { useSettingsStore } from '../../stores/settingsStore';
import { useGameStore } from '../../stores/gameStore';

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const settings = useSettingsStore();
  const resetProgress = useGameStore((s) => s.resetProgress);

  return (
    <div className="td-screen td-menu">
      <h2 className="td-screen__title">Settings</h2>
      <div className="td-settings">
        <GestureSlider label="Music Volume" value={settings.musicVolume} onChange={settings.setMusicVolume} color="#A78BFA" />
        <GestureSlider label="SFX Volume" value={settings.sfxVolume} onChange={settings.setSfxVolume} color="#38BDF8" />
        <GestureSlider label="Gesture Sensitivity" value={settings.gestureSensitivity} onChange={settings.setGestureSensitivity} color="#FBBF24" />
        <HoverButton onActivate={settings.toggleMirrorCamera} ringColor="#94A3B8" className="td-menu-btn">
          Mirror Camera: {settings.mirrorCamera ? 'On' : 'Off'}
        </HoverButton>
        <HoverButton onActivate={resetProgress} dwellMs={1200} ringColor="#F87171" className="td-menu-btn td-menu-btn--warn">
          Reset Progress
        </HoverButton>
      </div>
      <HoverButton onActivate={onBack} ringColor="#F87171" className="td-menu-btn td-menu-btn--warn">
        Back
      </HoverButton>
    </div>
  );
}
