import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMediaPipe } from './gestures/useMediaPipe';
import { MenuCursorProvider } from './gestures/MenuCursor';
import { useGameStore } from './stores/useGameStore';
import GestureCursorDot from './components/common/GestureCursorDot';
import CalibrationScreen from './components/ui/CalibrationScreen';
import MainMenu from './components/ui/MainMenu';
import GameCanvas from './components/game/GameCanvas';
import ShopScreen from './components/ui/ShopScreen';
import LeaderboardScreen from './components/ui/LeaderboardScreen';
import SettingsScreen from './components/ui/SettingsScreen';
import HowToPlay from './components/ui/HowToPlay';
import Credits from './components/ui/Credits';

const T = { duration: 0.25, ease: 'easeInOut' as const };

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const settings = useGameStore((s) => s.save.settings);
  const handRef = useMediaPipe(videoRef as RefObject<HTMLVideoElement>, settings.cameraDeviceId);

  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const save = useGameStore((s) => s.save);
  const updateSettings = useGameStore((s) => s.updateSettings);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  const showCanvas = screen === 'playing';
  const showCursor = screen !== 'playing' && screen !== 'calibrating';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0b0e1a]">
      {/* The MediaPipe input video is always hidden — CalibrationScreen renders its own
          visible mirrored preview (CameraPreview) that shares this element's stream. */}
      <video
        ref={videoRef as RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1"
        muted playsInline
      />

      <MenuCursorProvider handRef={handRef}>
      <div className={showCanvas ? 'block' : 'hidden'}>
        <GameCanvas handRef={handRef} canvasRef={canvasRef as RefObject<HTMLCanvasElement>} />
      </div>

      {showCursor && <GestureCursorDot />}
      <AnimatePresence mode="wait">
        {screen === 'calibrating' && (
          <motion.div key="calibrating" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T}>
            <CalibrationScreen
              videoRef={videoRef as RefObject<HTMLVideoElement>}
              handRef={handRef}
              cameraDeviceId={settings.cameraDeviceId}
              onSelectDevice={(id) => updateSettings({ cameraDeviceId: id })}
              onReady={() => setScreen('menu')}
            />
          </motion.div>
        )}

        {screen === 'menu' && (
          <motion.div key="menu" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T}>
            <MainMenu
              coins={save.coins}
              highScore={save.statistics.highScore}
              onNavigate={setScreen}
              onFullscreen={handleFullscreen}
            />
          </motion.div>
        )}

        {screen === 'shop' && (
          <motion.div key="shop" className="absolute inset-0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <ShopScreen onBack={() => setScreen('menu')} />
          </motion.div>
        )}

        {screen === 'leaderboard' && (
          <motion.div key="leaderboard" className="absolute inset-0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <LeaderboardScreen onBack={() => setScreen('menu')} />
          </motion.div>
        )}

        {screen === 'settings' && (
          <motion.div key="settings" className="absolute inset-0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <SettingsScreen onBack={() => setScreen('menu')} />
          </motion.div>
        )}

        {screen === 'howtoplay' && (
          <motion.div key="howtoplay" className="absolute inset-0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <HowToPlay onBack={() => setScreen('menu')} />
          </motion.div>
        )}

        {screen === 'credits' && (
          <motion.div key="credits" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T}>
            <Credits onBack={() => setScreen('menu')} />
          </motion.div>
        )}
      </AnimatePresence>
      </MenuCursorProvider>
    </div>
  );
}
