import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GestureSettings, DifficultyTier } from '../types';

interface SettingsState extends GestureSettings {
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setDifficulty: (d: DifficultyTier) => void;
  setDominantHand: (h: 'right' | 'left') => void;
  toggleMirrorCamera: () => void;
  toggleColorblindMode: () => void;
  toggleHighContrast: () => void;
  toggleLargerCursor: () => void;
  toggleSlowerPainting: () => void;
  toggleAudioNarration: () => void;
}

const DEFAULTS: GestureSettings = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  difficulty: 'medium',
  dominantHand: 'right',
  mirrorCamera: true,
  language: 'en',
  colorblindMode: false,
  highContrast: false,
  largerCursor: false,
  slowerPainting: false,
  audioNarration: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMusicVolume: (v) => set({ musicVolume: v }),
      setSfxVolume: (v) => set({ sfxVolume: v }),
      setDifficulty: (d) => set({ difficulty: d }),
      setDominantHand: (h) => set({ dominantHand: h }),
      toggleMirrorCamera: () => set((s) => ({ mirrorCamera: !s.mirrorCamera })),
      toggleColorblindMode: () => set((s) => ({ colorblindMode: !s.colorblindMode })),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleLargerCursor: () => set((s) => ({ largerCursor: !s.largerCursor })),
      toggleSlowerPainting: () => set((s) => ({ slowerPainting: !s.slowerPainting })),
      toggleAudioNarration: () => set((s) => ({ audioNarration: !s.audioNarration })),
    }),
    { name: 'flag-quest-settings' },
  ),
);
