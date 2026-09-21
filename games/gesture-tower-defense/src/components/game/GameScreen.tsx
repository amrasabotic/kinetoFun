import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameMode, TowerTypeId } from '../../types';
import { mapById } from '../../data/maps';
import { TOWER_DEFS, TOWER_ORDER } from '../../data/towers';
import { ENEMY_DEFS } from '../../data/enemies';
import { preparePath } from '../../systems/pathing';
import {
  createInitialBattle,
  moveTower,
  placeTower,
  sellTower,
  startWave,
  tickBattle,
} from '../../systems/combatEngine';
import { generateWave } from '../../systems/waveEngine';
import { mulberry32 } from '../../utils/helpers';
import { usePinchDrag, type DragPayload } from '../../hooks/usePinchDrag';
import { useGesture } from '../../mediaPipe/GestureProvider';
import { useGameStore } from '../../stores/gameStore';
import {
  playBaseHit,
  playEnemyDeath,
  playPlaceTower,
  playSellTower,
  playShoot,
  playVictory,
  playDefeat,
  playWaveStart,
} from '../../audio/sound';
import { Battlefield } from './Battlefield';
import { BuildTray } from './BuildTray';
import { HUD } from './HUD';
import HoverButton from '../common/HoverButton';

export interface BattleResult {
  won: boolean;
  lost: boolean;
  wavesCleared: number;
  currencyEarned: number;
  baseHealthFraction: number; // remaining base health / max, at the moment the battle ended — used for star grading
}

interface GameScreenProps {
  mode: GameMode;
  mapId: string;
  totalWaves: number;
  startingCurrency: number;
  startingBaseHealth: number;
  seed: number;
  levelLabel: string;
  onExit: () => void;
  onResult: (result: BattleResult) => void;
}

export function GameScreen({
  mode,
  mapId,
  totalWaves,
  startingCurrency,
  startingBaseHealth,
  seed,
  levelLabel,
  onExit,
  onResult,
}: GameScreenProps) {
  const map = useMemo(() => mapById(mapId), [mapId]);
  const prepared = useMemo(() => preparePath(map.path), [map]);
  const { frame } = useGesture();

  const [battle, setBattle] = useState(() => createInitialBattle(mapId, totalWaves, startingCurrency, startingBaseHealth));
  const [paused, setPaused] = useState(false);
  const [resultReported, setResultReported] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const rngRef = useRef(mulberry32(seed));

  const trayElsRef = useRef<Partial<Record<TowerTypeId, HTMLDivElement | null>>>({});
  const slotElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const trashElRef = useRef<HTMLDivElement | null>(null);

  // Main simulation loop — ticks the pure combat engine and dispatches
  // whatever discrete events it reports (shots/kills/base hits/wave clears)
  // to sound and lifetime stats, exactly the events tickBattle returns
  // rather than being inferred by diffing state.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    function loop() {
      const now = performance.now();
      const dt = Math.min(50, now - last);
      last = now;
      if (!pausedRef.current) {
        setBattle((prev) => {
          const { state: next, events } = tickBattle(prev, dt, map.buildSlots, prepared, ENEMY_DEFS);
          for (const ev of events) {
            if (ev.type === 'shot') playShoot(ev.towerType);
            else if (ev.type === 'kill') {
              playEnemyDeath();
              useGameStore.getState().recordEnemyDefeated(ev.reward);
            } else if (ev.type === 'baseHit') playBaseHit();
            else if (ev.type === 'waveCleared') useGameStore.getState().recordWaveCleared();
          }
          return next;
        });
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [map.buildSlots, prepared]);

  useEffect(() => {
    if ((battle.won || battle.lost) && !resultReported) {
      setResultReported(true);
      if (battle.won) playVictory();
      else playDefeat();
      onResult({
        won: battle.won,
        lost: battle.lost,
        wavesCleared: battle.waveIndex + 1,
        currencyEarned: battle.currency - startingCurrency,
        baseHealthFraction: battle.baseHealth / battle.maxBaseHealth,
      });
    }
  }, [battle.won, battle.lost, battle.waveIndex, battle.currency, battle.baseHealth, battle.maxBaseHealth, resultReported, onResult, startingCurrency]);

  const handleStartWave = useCallback(() => {
    const nextIndex = battle.waveIndex + 1;
    const wave = generateWave(nextIndex, rngRef.current);
    setBattle((prev) => startWave(prev, wave));
    playWaveStart();
  }, [battle.waveIndex]);

  const getGrabbables = useCallback((): { id: string; rect: DOMRect; data: DragPayload }[] => {
    const entries: { id: string; rect: DOMRect; data: DragPayload }[] = [];
    for (const typeId of TOWER_ORDER) {
      const el = trayElsRef.current[typeId];
      if (el && battle.currency >= TOWER_DEFS[typeId].cost) {
        entries.push({ id: `tray-${typeId}`, rect: el.getBoundingClientRect(), data: { source: 'tray', typeId } });
      }
    }
    for (const tower of battle.towers) {
      const el = slotElsRef.current[tower.slotIndex];
      if (el) entries.push({ id: `placed-${tower.id}`, rect: el.getBoundingClientRect(), data: { source: 'placed', typeId: tower.typeId, placedTowerId: tower.id } });
    }
    return entries;
  }, [battle.currency, battle.towers]);

  const getDropzones = useCallback((): { id: string; rect: DOMRect; data: null }[] => {
    const entries: { id: string; rect: DOMRect; data: null }[] = [];
    map.buildSlots.forEach((_, i) => {
      if (!battle.towers.some((t) => t.slotIndex === i)) {
        const el = slotElsRef.current[i];
        if (el) entries.push({ id: `slot-${i}`, rect: el.getBoundingClientRect(), data: null });
      }
    });
    if (trashElRef.current) entries.push({ id: 'trash', rect: trashElRef.current.getBoundingClientRect(), data: null });
    return entries;
  }, [map.buildSlots, battle.towers]);

  const handleDrop = useCallback((payload: DragPayload, dropZoneId: string) => {
    if (dropZoneId === 'trash') {
      if (payload.source === 'placed' && payload.placedTowerId) {
        setBattle((prev) => sellTower(prev, payload.placedTowerId!));
        playSellTower();
      }
      return;
    }
    const slotIndex = Number(dropZoneId.replace('slot-', ''));
    if (payload.source === 'tray') {
      setBattle((prev) => {
        const next = placeTower(prev, slotIndex, payload.typeId);
        if (next !== prev) {
          playPlaceTower();
          useGameStore.getState().recordTowerPlaced();
        }
        return next;
      });
    } else if (payload.source === 'placed' && payload.placedTowerId) {
      setBattle((prev) => moveTower(prev, payload.placedTowerId!, slotIndex));
    }
  }, []);

  const { held, cursorPx } = usePinchDrag({ getGrabbables, getDropzones, onDrop: handleDrop });

  const trackingLabel = frame.detected ? 'Hand tracked' : 'Raise your hand';
  const waveLabel = `${levelLabel} — Wave ${Math.max(1, battle.waveIndex + 1)}/${totalWaves >= 999 ? '∞' : totalWaves}`;

  return (
    <div className="td-game-screen">
      <HUD
        mode={mode}
        waveLabel={waveLabel}
        currency={battle.currency}
        baseHealth={battle.baseHealth}
        maxBaseHealth={battle.maxBaseHealth}
        waveActive={battle.waveActive}
        onStartWave={handleStartWave}
        onPause={() => setPaused(true)}
        trackingLabel={trackingLabel}
      />

      <div className="td-layout">
        <Battlefield
          map={map}
          battle={battle}
          hoveredSlot={null}
          slotRef={(i, el) => {
            slotElsRef.current[i] = el;
          }}
        />
        <BuildTray
          currency={battle.currency}
          trayRef={(typeId, el) => {
            trayElsRef.current[typeId] = el;
          }}
          trashRef={(el) => {
            trashElRef.current = el;
          }}
          draggingFromTray={held?.source === 'tray' ? held.typeId : null}
        />
      </div>

      {held && (
        <div
          className="td-dragging-chip"
          style={{ left: cursorPx.x, top: cursorPx.y, background: TOWER_DEFS[held.typeId].color }}
        />
      )}

      {paused && !battle.won && !battle.lost && (
        <div className="td-overlay">
          <div className="td-overlay__panel">
            <h2 className="td-overlay__title">Paused</h2>
            <div className="td-overlay__row">
              <HoverButton onActivate={() => setPaused(false)} ringColor="#4ADE80" className="td-menu-btn td-menu-btn--primary">
                Resume
              </HoverButton>
              <HoverButton onActivate={onExit} ringColor="#F87171" className="td-menu-btn td-menu-btn--warn">
                Exit to Menu
              </HoverButton>
            </div>
          </div>
        </div>
      )}

      {battle.won && (
        <div className="td-overlay td-overlay--win">
          <div className="td-overlay__panel">
            <h2 className="td-overlay__title td-overlay__title--win">Victory!</h2>
            <p className="td-overlay__stat">Waves cleared: {battle.waveIndex + 1}</p>
            <HoverButton onActivate={onExit} ringColor="#4ADE80" className="td-menu-btn td-menu-btn--primary">
              Continue
            </HoverButton>
          </div>
        </div>
      )}

      {battle.lost && (
        <div className="td-overlay td-overlay--lose">
          <div className="td-overlay__panel">
            <h2 className="td-overlay__title td-overlay__title--lose">Base Destroyed</h2>
            <p className="td-overlay__stat">Waves cleared: {battle.waveIndex}</p>
            <HoverButton onActivate={onExit} ringColor="#F87171" className="td-menu-btn td-menu-btn--warn">
              Back to Menu
            </HoverButton>
          </div>
        </div>
      )}
    </div>
  );
}
