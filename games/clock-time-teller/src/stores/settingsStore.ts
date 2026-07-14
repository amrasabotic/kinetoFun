import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GestureSettings } from '../types';

interface SettingsState extends GestureSettings {
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  toggleMirrorCamera: () => void;
  toggleColorblindMode: () => void;
  toggleHighContrast: () => void;
  toggleLargerCursor: () => void;
  toggleSlowerPace: () => void;
  toggleAudioNarration: () => void;
}

const DEFAULTS: GestureSettings = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  mirrorCamera: true,
  colorblindMode: false,
  highContrast: false,
  largerCursor: false,
  slowerPace: false,
  audioNarration: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMusicVolume: (v) => set({ musicVolume: v }),
      setSfxVolume: (v) => set({ sfxVolume: v }),
      toggleMirrorCamera: () => set((s) => ({ mirrorCamera: !s.mirrorCamera })),
      toggleColorblindMode: () => set((s) => ({ colorblindMode: !s.colorblindMode })),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleLargerCursor: () => set((s) => ({ largerCursor: !s.largerCursor })),
      toggleSlowerPace: () => set((s) => ({ slowerPace: !s.slowerPace })),
      toggleAudioNarration: () => set((s) => ({ audioNarration: !s.audioNarration })),
    }),
    { name: 'shape-color-sorter-settings' },
  ),
);
