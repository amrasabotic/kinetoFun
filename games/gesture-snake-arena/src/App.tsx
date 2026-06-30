import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMediaPipe } from './gestures/useMediaPipe';
import { useGameStore } from './stores/useGameStore';
import { SNAKE_SKINS, HEAD_ACCESSORIES, TRAILS } from './constants/gameConfig';
import MainMenu    from './components/ui/MainMenu';
import GameCanvas  from './components/game/GameCanvas';
import SkinsScreen from './components/ui/SkinsScreen';
import Statistics  from './components/ui/Statistics';
import SettingsScreen from './components/ui/Settings';
import HowToPlay   from './components/ui/HowToPlay';
import Credits     from './components/ui/Credits';

const T = { duration: 0.25, ease: 'easeInOut' as const };

export default function App() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handRef   = useMediaPipe(videoRef as React.RefObject<HTMLVideoElement>);

  const screen         = useGameStore(s => s.screen);
  const setScreen      = useGameStore(s => s.setScreen);
  const save           = useGameStore(s => s.save);
  const updateSettings = useGameStore(s => s.updateSettings);
  const addCoins       = useGameStore(s => s.addCoins);
  const unlockSkin     = useGameStore(s => s.unlockSkin);
  const selectSkin     = useGameStore(s => s.selectSkin);
  const unlockAccessory = useGameStore(s => s.unlockAccessory);
  const selectAccessory = useGameStore(s => s.selectAccessory);
  const unlockTrail    = useGameStore(s => s.unlockTrail);
  const selectTrail    = useGameStore(s => s.selectTrail);

  function handlePurchaseSkin(id: typeof save.selectedSkin, cost: number): boolean {
    if (save.coins < cost) return false;
    addCoins(-cost);
    unlockSkin(id);
    return true;
  }

  function handlePurchaseAccessory(id: typeof save.selectedAccessory, cost: number): boolean {
    if (save.coins < cost) return false;
    addCoins(-cost);
    unlockAccessory(id);
    return true;
  }

  function handlePurchaseTrail(id: typeof save.selectedTrail, cost: number): boolean {
    if (save.coins < cost) return false;
    addCoins(-cost);
    unlockTrail(id);
    return true;
  }

  const showCanvas = screen === 'playing';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0b0e1a]">
      {/* Hidden camera video — always mounted */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1"
        muted playsInline
      />

      {/* Game canvas — always rendered when playing */}
      <div className={showCanvas ? 'block' : 'hidden'}>
        <GameCanvas handRef={handRef} canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>} />
      </div>

      {/* UI screens */}
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div key="menu" className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T}>
            <MainMenu
              save={save}
              onPlay={() => setScreen('playing')}
              onSkins={() => setScreen('skins')}
              onStats={() => setScreen('statistics')}
              onSettings={() => setScreen('settings')}
              onHowToPlay={() => setScreen('howtoplay')}
              onCredits={() => setScreen('credits')}
            />
          </motion.div>
        )}

        {screen === 'skins' && (
          <motion.div key="skins" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <SkinsScreen
              save={save}
              onBack={() => setScreen('menu')}
              onSelectSkin={selectSkin}
              onSelectAccessory={selectAccessory}
              onSelectTrail={selectTrail}
              onPurchaseSkin={handlePurchaseSkin}
              onPurchaseAccessory={handlePurchaseAccessory}
              onPurchaseTrail={handlePurchaseTrail}
            />
          </motion.div>
        )}

        {screen === 'statistics' && (
          <motion.div key="stats" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <Statistics stats={save.statistics} onBack={() => setScreen('menu')} />
          </motion.div>
        )}

        {screen === 'settings' && (
          <motion.div key="settings" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <SettingsScreen
              settings={save.settings}
              onChange={updateSettings}
              onBack={() => setScreen('menu')}
              onReset={() => { localStorage.clear(); window.location.reload(); }}
            />
          </motion.div>
        )}

        {screen === 'howtoplay' && (
          <motion.div key="how" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <HowToPlay onBack={() => setScreen('menu')} />
          </motion.div>
        )}

        {screen === 'credits' && (
          <motion.div key="credits" className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T}>
            <Credits onBack={() => setScreen('menu')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
