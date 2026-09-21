import { useEffect, useMemo, useRef, useState } from 'react';
import GameScreen from './components/GameScreen';
import {
  Landing, MissionSelect, Briefing, Tutorial, Results, EndlessOver, SettingsScreen,
} from './components/menus';
import { MISSIONS, makeEndlessMission } from './data/missions';
import type { MissionResult } from './game/engine';
import type { Settings } from './utils/constants';
import {
  loadProgress, saveSettings, loadSettings, recordMission, recordEndless, type Progress,
} from './utils/storage';

type Screen = 'landing' | 'missions' | 'briefing' | 'tutorial' | 'game' | 'results' | 'endlessOver' | 'settings';
type Mode = 'campaign' | 'endless';

function postScore(score: number) {
  try { window.parent?.postMessage({ type: 'GAME_COMPLETE', score }, '*'); } catch { /* ignore */ }
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<Mode>('campaign');
  const [missionIdx, setMissionIdx] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [wave, setWave] = useState(0);
  const [endlessScore, setEndlessScore] = useState(0);
  const afterTutorial = useRef<Screen>('game');

  useEffect(() => { saveSettings(settings); }, [settings]);

  const endlessMission = useMemo(() => makeEndlessMission(wave), [wave, runKey]);

  // ── navigation ─────────────────────────────────────────────────────────────
  const startCampaign = () => setScreen('missions');
  const pickMission = (idx: number) => { setMode('campaign'); setMissionIdx(idx); setScreen('briefing'); };

  const launch = (target: Screen) => {
    afterTutorial.current = target;
    if (!settings.tutorialDone) { setScreen('tutorial'); return; }
    setRunKey((k) => k + 1);
    setScreen(target);
  };

  const briefingStart = () => launch('game');

  const startEndless = () => {
    setMode('endless'); setWave(0); setEndlessScore(0);
    if (!settings.tutorialDone) { afterTutorial.current = 'game'; setScreen('tutorial'); return; }
    setRunKey((k) => k + 1); setScreen('game');
  };

  const finishTutorial = () => {
    setSettings((s) => ({ ...s, tutorialDone: true }));
    const dest = afterTutorial.current;
    if (dest === 'game') setRunKey((k) => k + 1);
    setScreen(dest);
  };

  // ── completion handlers ──────────────────────────────────────────────────────
  const onCampaignComplete = (r: MissionResult) => {
    const m = MISSIONS[missionIdx];
    setProgress((p) => recordMission(p, m.id, m.index, r.stars, r.score, MISSIONS.length));
    setResult(r);
    postScore(r.score);
    setScreen('results');
  };

  const onEndlessComplete = (r: MissionResult) => {
    const total = endlessScore + r.score;
    setEndlessScore(total);
    if (r.win) {
      setWave((w) => w + 1); // key change remounts next wave
    } else {
      setProgress((p) => recordEndless(p, total));
      postScore(total);
      setScreen('endlessOver');
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────
  if (screen === 'game') {
    if (mode === 'campaign') {
      const m = MISSIONS[missionIdx];
      return (
        <GameScreen key={`c-${missionIdx}-${runKey}`} mission={m} settings={settings}
          onComplete={onCampaignComplete}
          onRestart={() => setRunKey((k) => k + 1)}
          onQuit={() => setScreen('missions')} />
      );
    }
    return (
      <GameScreen key={`e-${wave}-${runKey}`} mission={endlessMission} settings={settings}
        onComplete={onEndlessComplete}
        onRestart={() => { setWave(0); setEndlessScore(0); setRunKey((k) => k + 1); }}
        onQuit={() => setScreen('landing')} />
    );
  }

  if (screen === 'tutorial') return <Tutorial onDone={finishTutorial} />;

  if (screen === 'missions')
    return <MissionSelect progress={progress} onPick={pickMission} onBack={() => setScreen('landing')} />;

  if (screen === 'briefing')
    return <Briefing mission={MISSIONS[missionIdx]} onStart={briefingStart} onBack={() => setScreen('missions')} />;

  if (screen === 'results' && result) {
    const m = MISSIONS[missionIdx];
    return (
      <Results result={result} mission={m} best={progress.best[m.id] ?? 0}
        hasNext={result.win && missionIdx < MISSIONS.length - 1}
        onNext={() => { setMissionIdx((i) => Math.min(MISSIONS.length - 1, i + 1)); setScreen('briefing'); }}
        onRetry={() => { setRunKey((k) => k + 1); setScreen('game'); }}
        onMenu={() => setScreen('missions')} />
    );
  }

  if (screen === 'endlessOver')
    return (
      <EndlessOver wave={wave} score={endlessScore} best={progress.endlessHigh}
        onAgain={() => { setWave(0); setEndlessScore(0); setRunKey((k) => k + 1); setScreen('game'); }}
        onMenu={() => setScreen('landing')} />
    );

  if (screen === 'settings')
    return (
      <SettingsScreen settings={settings} onChange={setSettings}
        onTutorial={() => { afterTutorial.current = 'settings'; setSettings((s) => ({ ...s, tutorialDone: false })); setScreen('tutorial'); }}
        onBack={() => setScreen('landing')} />
    );

  return (
    <Landing progress={progress}
      onCampaign={startCampaign} onEndless={startEndless}
      onHowTo={() => { afterTutorial.current = 'landing'; setSettings((s) => ({ ...s, tutorialDone: false })); setScreen('tutorial'); }}
      onSettings={() => setScreen('settings')} />
  );
}
