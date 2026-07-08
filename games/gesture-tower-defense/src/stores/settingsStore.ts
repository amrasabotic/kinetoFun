import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GestureSettings } from '../types';

interface SettingsState extends GestureSettings {
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setGestureSensitivity: (v: number) => void;
  toggleMirrorCamera: () => void;
}

const DEFAULTS: GestureSettings = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  mirrorCamera: true,
  gestureSensitivity: 0.5,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMusicVolume: (v) => set({ musicVolume: v }),
      setSfxVolume: (v) => set({ sfxVolume: v }),
      setGestureSensitivity: (v) => set({ gestureSensitivity: v }),
      toggleMirrorCamera: () => set((s) => ({ mirrorCamera: !s.mirrorCamera })),
    }),
    { name: 'gesture-tower-defense-settings' },
  ),
);
