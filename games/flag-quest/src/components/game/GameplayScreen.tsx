import { useEffect, useRef, useState } from 'react';
import type { ColorId, FlagDef, GameMode, LevelResult } from '../../types';
import FlagCanvas, { type FlagCanvasHandle } from './FlagCanvas';
import ColorPalette from './ColorPalette';
import HUD from './HUD';
import HoverButton from '../common/HoverButton';
import { comboMultiplier, finalizeLevel, mistakePenalty, regionScore, HINT_GLOW_AT_SEC, HINT_REGION_PULSE_AT_SEC, HINT_COLOR_PULSE_AT_SEC } from '../../game/scoring';
import { colorLabel } from '../../flags/palette';

interface Props {
  flag: FlagDef;
  mode: GameMode;
  onExit: () => void;
  onLevelComplete: (result: LevelResult) => void;
}

export default function GameplayScreen({ flag, mode, onExit, onLevelComplete }: Props) {
  const practiceMode = mode === 'practice';
  const canvasHandleRef = useRef<FlagCanvasHandle | null>(null);

  const [selectedColor, setSelectedColor] = useState<ColorId | null>(null);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const [mistakes, setMistakes] = useState(0);
  const mistakesRef = useRef(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [hintStage, setHintStage] = useState(0);
  const [pulseColor, setPulseColor] = useState<ColorId | null>(null);

  const startRef = useRef(performance.now());
  const lastActivityRef = useRef(performance.now());
  const doneRef = useRef(false);
  const regionsCorrectFirstTryRef = useRef(0);
  const wrongOnFirstTryRef = useRef(new Set<string>());

  // No pause gesture: an open palm while painting kept pausing the round by mistake.
  useEffect(() => {
    let raf = 0;
    function loop() {
      const now = performance.now();

      if (!doneRef.current) {
        const elapsed = (now - startRef.current) / 1000;
        setElapsedSec(elapsed);

        const idleSec = (now - lastActivityRef.current) / 1000;
        const target = canvasHandleRef.current?.getHintTarget() ?? null;
        if (!target) {
          setHintStage(0);
          setPulseColor(null);
          canvasHandleRef.current?.setRegionPulsing(null);
        } else if (idleSec >= HINT_COLOR_PULSE_AT_SEC) {
          setHintStage(3);
          setPulseColor(target.colorId);
          canvasHandleRef.current?.setRegionPulsing(target.regionId);
        } else if (idleSec >= HINT_REGION_PULSE_AT_SEC) {
          setHintStage(2);
          setPulseColor(null);
          canvasHandleRef.current?.setRegionPulsing(target.regionId);
        } else if (idleSec >= HINT_GLOW_AT_SEC) {
          setHintStage(1);
          setPulseColor(null);
          canvasHandleRef.current?.setRegionPulsing(null);
        } else {
          setHintStage(0);
          setPulseColor(null);
          canvasHandleRef.current?.setRegionPulsing(null);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleRegionComplete() {
    lastActivityRef.current = performance.now();
    setCompletedCount((c) => c + 1);

    comboRef.current += 1;
    bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);
    setCombo(comboRef.current);

    if (!practiceMode) {
      scoreRef.current += regionScore(flag, comboRef.current);
      setScore(scoreRef.current);
    }
  }

  function handleMistake(regionId: string) {
    lastActivityRef.current = performance.now();
    wrongOnFirstTryRef.current.add(regionId);
    comboRef.current = 0;
    setCombo(0);
    mistakesRef.current += 1;
    setMistakes(mistakesRef.current);
    if (!practiceMode) {
      scoreRef.current = Math.max(0, scoreRef.current - mistakePenalty());
      setScore(scoreRef.current);
    }
  }

  function handleComplete() {
    if (doneRef.current) return;
    doneRef.current = true;
    regionsCorrectFirstTryRef.current = flag.regions.length - wrongOnFirstTryRef.current.size;
    const timeSec = (performance.now() - startRef.current) / 1000;
    const result = finalizeLevel({
      flag,
      score: scoreRef.current,
      mistakes: mistakesRef.current,
      bestCombo: bestComboRef.current,
      timeSec,
      regionsCorrectFirstTry: Math.max(0, regionsCorrectFirstTryRef.current),
      totalRegions: flag.regions.length,
    });
    window.setTimeout(() => onLevelComplete(result), 550);
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#12162a] via-[#0c1230] to-[#0b0620] flex flex-col text-white p-5 gap-4">
      <HUD
        country={flag.country}
        score={score}
        combo={combo}
        comboMult={comboMultiplier(combo)}
        mistakes={mistakes}
        completed={completedCount}
        total={flag.regions.length}
        elapsedSec={elapsedSec}
        targetSec={flag.targetTimeSec}
        practiceMode={practiceMode}
      />

      <div className={`flex-1 min-h-0 flex items-center justify-center rounded-3xl ${hintStage >= 1 ? 'fq-hint-glow' : ''}`}>
        <div className="w-full h-full max-w-4xl max-h-[60vh]">
          <FlagCanvas
            flag={flag}
            selectedColor={selectedColor}
            onRegionComplete={handleRegionComplete}
            onMistake={handleMistake}
            onComplete={handleComplete}
            handleRef={canvasHandleRef}
          />
        </div>
      </div>

      {hintStage >= 3 && pulseColor && (
        <p className="text-center text-yellow-300 text-sm animate-pulse -mt-2">
          Hint: try {colorLabel(pulseColor)}
        </p>
      )}

      <ColorPalette selected={selectedColor} onSelect={setSelectedColor} />

      <div className="absolute top-5 right-5">
        <HoverButton onActivate={onExit} dwellMs={900} ringColor="#E4362E" className="px-4 py-2 rounded-full bg-black/40 border border-white/15 text-xs font-semibold">
          Exit
        </HoverButton>
      </div>

    </div>
  );
}
