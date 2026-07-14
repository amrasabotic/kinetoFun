import HoverButton from '../common/HoverButton';
import GestureSlider from '../common/GestureSlider';
import { useSettingsStore } from '../../stores/settingsStore';
import type { DifficultyTier } from '../../types';
import { setVolumes } from '../../audio/sound';

const DIFFICULTIES: DifficultyTier[] = ['easy', 'medium', 'hard', 'expert'];

function ToggleRow({ label, value, onToggle, color = '#8C5CFF' }: { label: string; value: boolean; onToggle: () => void; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-white/80">{label}</span>
      <HoverButton
        onActivate={onToggle}
        ringColor={color}
        dwellMs={550}
        className={`w-16 h-8 rounded-full border flex items-center px-1 ${value ? 'bg-violet-500/80 border-violet-300' : 'bg-white/10 border-white/20'}`}
      >
        <span
          className="h-6 w-6 rounded-full bg-white block transition-transform"
          style={{ transform: value ? 'translateX(32px)' : 'translateX(0)' }}
        />
      </HoverButton>
    </div>
  );
}

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const s = useSettingsStore();

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1a1140] via-[#160b30] to-[#0b0620] flex flex-col items-center text-white px-6 py-8 overflow-y-auto">
      <h1 className="text-3xl font-extrabold mb-1">Settings</h1>
      <p className="text-white/50 text-sm mb-6">Everything here is controlled with your hand</p>

      <div className="w-full max-w-lg space-y-6 bg-white/5 border border-white/10 rounded-3xl p-6">
        <GestureSlider
          label="Music Volume" value={s.musicVolume} color="#2A5CD6"
          onChange={(v) => { s.setMusicVolume(v); setVolumes(v, s.sfxVolume); }}
        />
        <GestureSlider
          label="SFX Volume" value={s.sfxVolume} color="#F07A26"
          onChange={(v) => { s.setSfxVolume(v); setVolumes(s.musicVolume, v); }}
        />

        <div>
          <p className="text-xs text-white/60 mb-2">Difficulty</p>
          <div className="grid grid-cols-4 gap-2">
            {DIFFICULTIES.map((d) => (
              <HoverButton
                key={d}
                onActivate={() => s.setDifficulty(d)}
                dwellMs={550}
                ringColor="#8C5CFF"
                className={`py-2 rounded-xl text-xs font-bold uppercase border ${s.difficulty === d ? 'bg-violet-500/70 border-violet-300' : 'bg-white/5 border-white/10'}`}
              >
                {d}
              </HoverButton>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-white/60 mb-2">Dominant Hand</p>
          <div className="grid grid-cols-2 gap-2">
            {(['right', 'left'] as const).map((h) => (
              <HoverButton
                key={h}
                onActivate={() => s.setDominantHand(h)}
                dwellMs={550}
                ringColor="#8C5CFF"
                className={`py-2 rounded-xl text-xs font-bold uppercase border ${s.dominantHand === h ? 'bg-violet-500/70 border-violet-300' : 'bg-white/5 border-white/10'}`}
              >
                {h}
              </HoverButton>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-1">
          <ToggleRow label="Mirror Camera" value={s.mirrorCamera} onToggle={s.toggleMirrorCamera} />
          <ToggleRow label="Colorblind Mode" value={s.colorblindMode} onToggle={s.toggleColorblindMode} color="#2FA35A" />
          <ToggleRow label="High Contrast" value={s.highContrast} onToggle={s.toggleHighContrast} color="#F4C430" />
          <ToggleRow label="Larger Cursor" value={s.largerCursor} onToggle={s.toggleLargerCursor} />
          <ToggleRow label="Slower Painting" value={s.slowerPainting} onToggle={s.toggleSlowerPainting} />
          <ToggleRow label="Audio Narration" value={s.audioNarration} onToggle={s.toggleAudioNarration} color="#F07A26" />
        </div>
      </div>

      <div className="mt-6 mb-4">
        <HoverButton onActivate={onBack} ringColor="#E4362E" className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-sm font-semibold">
          ← Back
        </HoverButton>
      </div>
    </div>
  );
}
