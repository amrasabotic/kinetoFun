import { useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMediaPipe } from './gestures/useMediaPipe';
import { useGameStore } from './stores/useGameStore';
import GestureCursor from './components/ui/GestureCursor';
import MainMenu from './components/ui/MainMenu';
import GameModes from './components/ui/GameModes';
import GameCanvas from './components/game/GameCanvas';
import Cosmetics from './components/ui/Cosmetics';
import StatisticsScreen from './components/ui/Statistics';
import SettingsScreen from './components/ui/Settings';
import HowToPlay from './components/ui/HowToPlay';
import Credits from './components/ui/Credits';

const T = { duration: 0.25, ease: 'easeInOut' as const };

export default function App() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const store = useGameStore();
  const handRef = useMediaPipe(
    videoRef as React.RefObject<HTMLVideoElement>,
    store.save.settings.handSmoothing,
  );

  const { screen, save, pendingMode, pendingDifficulty, pendingArena } = store;

  const handleGameEnd = useCallback((coins: number, won: boolean) => {
    store.addCoins(coins);
    store.updateStatistics({
      matchesPlayed: save.statistics.matchesPlayed + 1,
      matchesWon: save.statistics.matchesWon + (won ? 1 : 0),
      coinsEarned: save.statistics.coinsEarned + coins,
    });
    store.recordHighScore(pendingMode, coins * 10);
  }, [save.statistics, pendingMode, store]);

  const isPlaying = screen === 'playing';

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#0a0014' }}>
      {/* Hidden camera — always mounted for fast startup */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute opacity-0 pointer-events-none w-1 h-1"
        muted playsInline
      />

      {/* Game canvas — always rendered when playing */}
      <div className={isPlaying ? 'block' : 'hidden'} style={{ width: '100%', height: '100%' }}>
        <GameCanvas
          handRef={handRef}
          canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
          mode={pendingMode}
          difficulty={pendingDifficulty}
          arenaId={pendingArena}
          paddleSkin={save.selectedPaddle}
          ballSkin={save.selectedBall}
          trail={save.selectedTrail}
          settings={save.settings}
          onGameEnd={handleGameEnd}
          onMenu={() => store.setScreen('menu')}
        />
      </div>

      {/* Gesture cursor — shown on all screens, hidden during gameplay (hand silhouette on canvas handles that) */}
      {!isPlaying && <GestureCursor handRef={handRef} />}

      {/* UI screens */}
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div key="menu" className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T}>
            <MainMenu
              save={save}
              onPlay={() => store.setScreen('modeSelect')}
              onModes={() => store.setScreen('modeSelect')}
              onCosmetics={() => store.setScreen('cosmetics')}
              onStats={() => store.setScreen('statistics')}
              onSettings={() => store.setScreen('settings')}
              onHowToPlay={() => store.setScreen('howToPlay')}
              onCredits={() => store.setScreen('credits')}
            />
          </motion.div>
        )}

        {screen === 'modeSelect' && (
          <motion.div key="modes" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <GameModes
              pendingMode={pendingMode}
              pendingDifficulty={pendingDifficulty}
              pendingArena={pendingArena}
              onSelectMode={store.setPendingMode}
              onSelectDifficulty={store.setPendingDifficulty}
              onSelectArena={store.setPendingArena}
              onPlay={() => store.setScreen('playing')}
              onBack={() => store.setScreen('menu')}
            />
          </motion.div>
        )}

        {screen === 'cosmetics' && (
          <motion.div key="cosmetics" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <Cosmetics
              save={save}
              onSelectPaddle={store.selectPaddle}
              onSelectBall={store.selectBall}
              onSelectTrail={store.selectTrail}
              onPurchasePaddle={(id, cost) => { if (save.coins < cost) return false; store.addCoins(-cost); store.unlockPaddle(id); return true; }}
              onPurchaseBall={(id, cost) => { if (save.coins < cost) return false; store.addCoins(-cost); store.unlockBall(id); return true; }}
              onPurchaseTrail={(id, cost) => { if (save.coins < cost) return false; store.addCoins(-cost); store.unlockTrail(id); return true; }}
              onBack={() => store.setScreen('menu')}
            />
          </motion.div>
        )}

        {screen === 'statistics' && (
          <motion.div key="stats" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <StatisticsScreen
              stats={save.statistics}
              coins={save.coins}
              onBack={() => store.setScreen('menu')}
            />
          </motion.div>
        )}

        {screen === 'settings' && (
          <motion.div key="settings" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <SettingsScreen
              settings={save.settings}
              onChange={store.updateSettings}
              onBack={() => store.setScreen('menu')}
              onReset={() => { store.resetProgress(); }}
            />
          </motion.div>
        )}

        {screen === 'howToPlay' && (
          <motion.div key="how" className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={T}>
            <HowToPlay onBack={() => store.setScreen('menu')} />
          </motion.div>
        )}

        {screen === 'credits' && (
          <motion.div key="credits" className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T}>
            <Credits onBack={() => store.setScreen('menu')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
