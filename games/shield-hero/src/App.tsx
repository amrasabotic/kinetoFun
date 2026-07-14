import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Menu } from './components/Menu';
import { Game } from './components/Game';
import { PauseMenu } from './components/PauseMenu';
import { GameOver } from './components/GameOver';
import { Narrative } from './components/NarrativeScene';
import { LevelComplete } from './components/LevelComplete';
import { LevelMap } from './components/LevelMap';
import { CameraFeed } from './components/CameraFeed';
import { useHandTracking } from './hooks/useHandTracking';
import { GameState, GameMode, GameStats, Level } from './types/game';
import { levels } from './data/levels';
import { getHighScore, submitHighScore } from './services/highScoreService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('endless');
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    starsCollected: 0,
    applesBlocked: 0,
    level: 1,
    highScore: 0
  });
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [showNarrative, setShowNarrative] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [completedLevel, setCompletedLevel] = useState<Level | null>(null);
  // Track best score per story level (index-aligned with levels array)
  const [storyScores, setStoryScores] = useState<number[]>(Array(levels.length).fill(0));
  // How many levels have been completed (unlocks the next one on the map)
  const [unlockedUpTo, setUnlockedUpTo] = useState(0);

  const {
    initialize: initHandTracking,
    startCamera,
    getPosition,
    stop: stopTracking,
    isInitialized,
    isStarting,
    error: initError
  } = useHandTracking();

  const gameKeyRef = useRef(0);

  useEffect(() => {
    const loadHighScores = async () => {
      const hs = await getHighScore('endless');
      setStats(prev => ({ ...prev, highScore: hs }));
    };
    loadHighScores();
  }, []);

  const handleStartGame = useCallback(async (mode: GameMode) => {
    setGameMode(mode);
    gameKeyRef.current++;
    setCurrentLevelIndex(0);
    setStats(prev => ({
      ...prev,
      score: 0,
      starsCollected: 0,
      applesBlocked: 0,
      level: 1
    }));
    setIsPaused(false);
    setIsNewHighScore(false);
    setCompletedLevel(null);

    if (mode === 'story') {
      // Show map — no need to init tracking yet
      setGameState('levelMap');
    } else {
      await initHandTracking();
      setShowNarrative(false);
      setGameState('endless');
    }
  }, [initHandTracking]);

  // Called when the player clicks "Begin Level" on the map
  const handleMapSelectLevel = useCallback(async (levelIndex: number) => {
    setCurrentLevelIndex(levelIndex);
    setStats(prev => ({
      ...prev,
      score: 0,
      starsCollected: 0,
      applesBlocked: 0,
      level: levelIndex + 1
    }));
    setCompletedLevel(null);
    gameKeyRef.current++;

    await initHandTracking();

    setShowNarrative(true);
    setGameState('narrative');
  }, [initHandTracking]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    setGameState('paused');
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    if (gameMode === 'story') {
      setGameState('story');
    } else {
      setGameState('endless');
    }
  }, [gameMode]);

  const handleQuit = useCallback(() => {
    stopTracking();
    setGameState('menu');
    setIsPaused(false);
  }, [stopTracking]);

  const handleBackToMap = useCallback(() => {
    setGameState('levelMap');
    setIsPaused(false);
    setCompletedLevel(null);
  }, []);

  const handleRestart = useCallback(async () => {
    gameKeyRef.current++;
    setIsPaused(false);
    setStats(prev => ({
      ...prev,
      score: 0,
      starsCollected: 0,
      applesBlocked: 0,
      level: currentLevelIndex + 1
    }));
    setCompletedLevel(null);

    if (gameMode === 'story') {
      // Restart goes back to map in story mode
      setGameState('levelMap');
    } else {
      setGameState('endless');
    }
  }, [gameMode, currentLevelIndex]);

  const handleGameOver = useCallback(async (finalStats: GameStats) => {
    setStats(finalStats);

    if (gameMode === 'endless' && finalStats.score > stats.highScore) {
      setIsNewHighScore(true);
      await submitHighScore(
        finalStats.score,
        finalStats.level,
        finalStats.starsCollected,
        'endless'
      );
      setStats(prev => ({ ...prev, highScore: finalStats.score }));
    }

    window.parent.postMessage({ type: 'GAME_COMPLETE', score: finalStats.score }, '*');
    setGameState('gameOver');
  }, [stats.highScore, gameMode]);

  const handleLevelComplete = useCallback((levelStats: GameStats, level: Level) => {
    setStats(levelStats);
    setCompletedLevel(level);

    // Update best score for this level
    setStoryScores(prev => {
      const next = [...prev];
      const idx = level.id - 1;
      if (levelStats.score > (next[idx] ?? 0)) next[idx] = levelStats.score;
      return next;
    });
    // Unlock the next level on the map
    setUnlockedUpTo(prev => Math.max(prev, level.id));

    setGameState('gameOver');
  }, []);

  const handleNarrativeComplete = useCallback(() => {
    setShowNarrative(false);
    setGameState('story');
  }, []);

  const handleVideoReady = useCallback(async (video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<boolean> => {
    return await startCamera(video, canvas);
  }, [startCamera]);

  const handleNextLevel = useCallback(() => {
    const nextIndex = currentLevelIndex + 1;
    if (nextIndex < levels.length) {
      // Go back to map so the player can see the new unlock
      setGameState('levelMap');
      setCompletedLevel(null);
    } else {
      // All levels complete
      stopTracking();
      setGameState('menu');
    }
  }, [currentLevelIndex, stopTracking]);

  const currentLevel = levels[currentLevelIndex];

  const showCamera = isInitialized && gameState !== 'menu' && gameState !== 'levelMap';

  const isPlaying = gameState === 'story' || gameState === 'endless';
  const isPausedState = gameState === 'paused';
  const isGameOverState = gameState === 'gameOver';

  return (
    <div className="w-screen h-screen bg-slate-900 relative overflow-hidden">
      {gameState === 'menu' && (
        <Menu
          onStartStory={() => handleStartGame('story')}
          onStartEndless={() => handleStartGame('endless')}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          isInitializing={isStarting}
          initError={initError}
        />
      )}

      {gameState === 'levelMap' && (
        <LevelMap
          levels={levels}
          unlockedUpTo={unlockedUpTo}
          completedScores={storyScores}
          onSelectLevel={handleMapSelectLevel}
          onBack={handleQuit}
        />
      )}

      {/* Game canvas rendered in all active states so it persists through pauses/overlays */}
      {(isPlaying || isPausedState || isGameOverState) && (
        <Game
          key={gameKeyRef.current}
          mode={gameMode}
          getPosition={getPosition}
          onGameOver={handleGameOver}
          onLevelComplete={handleLevelComplete}
          onPause={handlePause}
          isPaused={isPaused || isPausedState || isGameOverState}
        />
      )}

      {isPausedState && (
        <PauseMenu
          onResume={handleResume}
          onRestart={handleRestart}
          onQuit={gameMode === 'story' ? handleBackToMap : handleQuit}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
        />
      )}

      {isGameOverState && (
        completedLevel ? (
          <LevelComplete
            stats={stats}
            completedLevel={completedLevel}
            onNextLevel={handleNextLevel}
            onQuit={gameMode === 'story' ? handleBackToMap : handleQuit}
          />
        ) : (
          <GameOver
            stats={stats}
            onRestart={gameMode === 'story' ? handleBackToMap : handleRestart}
            onQuit={handleQuit}
            isNewHighScore={isNewHighScore}
          />
        )
      )}

      {gameState === 'narrative' && showNarrative && currentLevel && (
        <Narrative
          level={currentLevel}
          onComplete={handleNarrativeComplete}
          type="intro"
        />
      )}

      {/* Single persistent CameraFeed — never remounts, tracking loop stays alive */}
      {showCamera && (
        <CameraFeed onVideoReady={handleVideoReady} />
      )}
    </div>
  );
};

export default App;
