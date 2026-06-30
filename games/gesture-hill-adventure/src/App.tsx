/**
 * App.tsx — root component.
 * Owns the single MediaPipe instance (videoRef / handRef) and routes between
 * screens using the Zustand store.  GameCanvas is always mounted so the
 * canvas persists across the game-over overlay.
 */
import { useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMediaPipe } from './hooks/useMediaPipe';
import { useGameStore } from './stores/useGameStore';
import { VEHICLE_SKINS } from './constants/gameConfig';
import { initAudio } from './game/audio/audioSystem';
import MainMenu    from './components/ui/MainMenu';
import GameCanvas  from './components/game/GameCanvas';
import Garage      from './components/ui/Garage';
import HowToPlay   from './components/ui/HowToPlay';
import SettingsScreen  from './components/ui/Settings';
import Statistics  from './components/ui/Statistics';
import type { VehicleSkin } from './types';

const TRANSITION = { duration: 0.28, ease: 'easeInOut' as const };

export default function App() {
  // ── Shared MediaPipe (one camera stream for the whole app) ──────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const handRef  = useMediaPipe(videoRef as React.RefObject<HTMLVideoElement>);

  // Separate canvas ref so GameCanvas can be mounted permanently
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Store ──────────────────────────────────────────────────────────────────
  const screen       = useGameStore(s => s.screen);
  const setScreen    = useGameStore(s => s.setScreen);
  const save         = useGameStore(s => s.save);
  const setSave      = useGameStore(s => s.setSave);
  const updateSettings = useGameStore(s => s.updateSettings);
  const unlockSkin   = useGameStore(s => s.unlockSkin);
  const selectSkin   = useGameStore(s => s.selectSkin);

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeSkin = useMemo<VehicleSkin>(
    () => VEHICLE_SKINS.find(s => s.id === save.selectedSkin) ?? VEHICLE_SKINS[0],
    [save.selectedSkin],
  );

  const engineSettings = useMemo(() => ({
    gestureSensitivity: save.settings.gestureSensitivity,
    sound:              save.settings.sound,
    music:              save.settings.music,
    graphicsQuality:    save.settings.graphicsQuality,
  }), [save.settings]);

  // ── Garage purchase handler ────────────────────────────────────────────────
  function handlePurchase(skin: VehicleSkin): boolean {
    if (save.coins < skin.cost) return false;
    setSave(prev => ({ ...prev, coins: prev.coins - skin.cost }));
    unlockSkin(skin.id);
    return true;
  }

  // ── Check if game canvas should be visible ─────────────────────────────────
  const showCanvas = screen === 'playing' || screen === 'game-over';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0b0e1a]">
      {/* Shared hidden video always mounted — MediaPipe grabs camera once */}
      <video ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />

      {/* Game canvas — always mounted, shown only during play / game-over */}
      <div className={showCanvas ? 'block' : 'hidden'}>
        <GameCanvas
          handRef={handRef}
          skin={activeSkin}
          settings={engineSettings}
          canvasRef={canvasRef}
        />
      </div>

      {/* UI screens (menus) — animated in/out */}
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div key="menu" className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={TRANSITION}>
            <MainMenu
              save={save}
              onPlay={() => { initAudio(); setScreen('playing'); }}
              onGarage={() => setScreen('garage')}
              onStats={() => setScreen('statistics')}
              onSettings={() => setScreen('settings')}
              onHowToPlay={() => setScreen('howtoplay')}
            />
          </motion.div>
        )}

        {screen === 'garage' && (
          <motion.div key="garage" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={TRANSITION}>
            <Garage
              save={save}
              onBack={() => setScreen('menu')}
              onSelect={selectSkin}
              onPurchase={handlePurchase}
            />
          </motion.div>
        )}

        {screen === 'howtoplay' && (
          <motion.div key="how" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={TRANSITION}>
            <HowToPlay onBack={() => setScreen('menu')} />
          </motion.div>
        )}

        {screen === 'settings' && (
          <motion.div key="settings" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={TRANSITION}>
            <SettingsScreen
              settings={save.settings}
              onChange={updateSettings}
              onBack={() => setScreen('menu')}
              onReset={() => window.location.reload()}
            />

          </motion.div>
        )}

        {screen === 'statistics' && (
          <motion.div key="stats" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={TRANSITION}>
            <Statistics
              stats={save.statistics}
              onBack={() => setScreen('menu')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
