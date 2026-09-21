import { useEffect, useRef, useState } from 'react';
import GameScreen from './components/GameScreen';
import { Landing, ModeSelect, Tutorial, Shop, Results, SettingsScreen } from './components/menus';
import { getMode, type ModeId } from './data/modes';
import { getSkin, SKINS } from './data/skins';
import type { RunResult } from './game/engine';
import type { Settings } from './utils/constants';
import {
  loadProgress, loadSettings, saveSettings, recordRun, buySkin, selectSkin, type Progress,
} from './utils/storage';

type Screen = 'landing' | 'modes' | 'tutorial' | 'game' | 'results' | 'shop' | 'settings';

function postScore(score: number) {
  try { window.parent?.postMessage({ type: 'GAME_COMPLETE', score }, '*'); } catch { /* ignore */ }
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>('landing');
  const [modeId, setModeId] = useState<ModeId>('endless');
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const afterTutorial = useRef<Screen>('game');

  useEffect(() => { saveSettings(settings); }, [settings]);

  const mode = getMode(modeId);
  const skin = getSkin(progress.selectedSkin);

  const launchGame = () => { setRunKey((k) => k + 1); setScreen('game'); };

  const pickMode = (id: ModeId) => {
    setModeId(id);
    if (!settings.tutorialDone) { afterTutorial.current = 'game'; setScreen('tutorial'); return; }
    setRunKey((k) => k + 1); setScreen('game');
  };

  const finishTutorial = () => {
    setSettings((s) => ({ ...s, tutorialDone: true }));
    const dest = afterTutorial.current;
    if (dest === 'game') { setRunKey((k) => k + 1); setScreen('game'); }
    else setScreen(dest);
  };

  const onComplete = (r: RunResult) => {
    const prevBest = progress.highScore[r.modeId] ?? 0;
    const { progress: next, unlocked: ach } = recordRun(progress, r);
    setProgress(next);
    setResult(r);
    setNewBest(r.score > prevBest);
    setUnlocked(ach);
    postScore(r.score);
    setScreen('results');
  };

  if (screen === 'game') {
    return (
      <GameScreen key={`${modeId}-${runKey}`} mode={mode} skin={skin} settings={settings}
        onComplete={onComplete}
        onRestart={() => setRunKey((k) => k + 1)}
        onQuit={() => setScreen('landing')} />
    );
  }

  if (screen === 'tutorial') return <Tutorial onDone={finishTutorial} />;

  if (screen === 'modes')
    return <ModeSelect progress={progress} onPick={pickMode} onBack={() => setScreen('landing')} />;

  if (screen === 'results' && result)
    return (
      <Results result={result} mode={mode} best={progress.highScore[result.modeId] ?? 0}
        newBest={newBest} unlocked={unlocked}
        onRetry={launchGame} onMenu={() => setScreen('landing')} />
    );

  if (screen === 'shop')
    return (
      <Shop progress={progress}
        onBuy={(id) => { const sk = SKINS.find((s) => s.id === id); if (sk) setProgress((p) => buySkin(p, id, sk.cost)); }}
        onSelect={(id) => setProgress((p) => selectSkin(p, id))}
        onBack={() => setScreen('landing')} />
    );

  if (screen === 'settings')
    return (
      <SettingsScreen settings={settings} onChange={setSettings}
        onTutorial={() => { afterTutorial.current = 'settings'; setSettings((s) => ({ ...s, tutorialDone: false })); setScreen('tutorial'); }}
        onBack={() => setScreen('landing')} />
    );

  return (
    <Landing progress={progress}
      onPlay={() => setScreen('modes')}
      onShop={() => setScreen('shop')}
      onHowTo={() => { afterTutorial.current = 'landing'; setSettings((s) => ({ ...s, tutorialDone: false })); setScreen('tutorial'); }}
      onSettings={() => setScreen('settings')} />
  );
}
