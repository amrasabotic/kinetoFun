import type { GameState, GameAction, HandData, GameSession, MinigameId, MinigameResult } from '@/types';
import type { Dispatch } from 'react';
import type { MinigameContext } from '@/types/minigame';
import { MINIGAME_REGISTRY } from '@/minigames';
import { particleSystem } from '@/systems/ParticleSystem';
import { scoreSystem } from '@/systems/ScoreSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { storage } from '@/storage/localStorage';
import { drawTimerBar, drawHandCursor } from './drawHelpers';

import { initCalibration, updateCalibration, drawCalibration } from '@/screens/CalibrationScreen';
import { drawMenu, menuDwell } from '@/screens/MenuScreen';
import { drawStartBg, drawTitle, unit, font, INK } from '@/screens/startUi';
import { initCountdown, updateCountdown, drawCountdown } from '@/screens/CountdownScreen';
import { initTransition, updateTransition, drawTransition } from '@/screens/TransitionScreen';
import { initResults, updateResults, drawResults } from '@/screens/ResultsScreen';
import { initSettings, updateSettings, drawSettings } from '@/screens/SettingsScreen';
import { updateLeaderboard, drawLeaderboard } from '@/screens/LeaderboardScreen';
import { updateAchievements, drawAchievements } from '@/screens/AchievementsScreen';
import { initWorldMap, updateWorldMap, drawWorldMap } from '@/screens/WorldMapScreen';
import { updateDailyChallenge, drawDailyChallenge, completeDailyChallenge } from '@/screens/DailyChallengeScreen';
import { updatePartySetup, drawPartySetup, drawPartyLeaderboard, initPartySetup } from '@/screens/PartyModeScreen';
import { updateHowTo, drawHowTo, howtoDwell } from '@/screens/HowToScreen';

/* ── mutable per-session state ───────────────────────────── */
let prevScreen: string = '';
let mgInited = false;
let mgTimer = 0;
let mgTimerMax = 0;
let sessionMaxCombo = 0;

function difficultyMult(): number {
  const d = storage.getOrDefault('settings').difficulty;
  return d === 'easy' ? 1.5 : d === 'hard' ? 0.75 : 1.0;
}

function resetMg(): void { mgInited = false; mgTimer = 0; mgTimerMax = 0; }

/* ── session helpers ─────────────────────────────────────── */
function buildSession(state: GameState, finalResult: MinigameResult): GameSession {
  const allResults = [...state.mgResults, finalResult];
  const totalScore = allResults.reduce((s, r) => s + r.score, 0);
  const avgStars = allResults.reduce((s, r) => s + r.stars, 0) / allResults.length;
  return {
    mode: state.mode,
    totalScore,
    stars: Math.round(avgStars) as 0 | 1 | 2 | 3,
    maxCombo: sessionMaxCombo,
    minigameResults: allResults,
    completedAt: new Date().toISOString(),
  };
}

function finishCurrentMinigame(
  mgCtx: MinigameContext,
  state: GameState,
  dispatch: Dispatch<GameAction>,
): void {
  const mgId = state.sequence[state.mgIndex];
  const module = MINIGAME_REGISTRY[mgId];
  const result = module.finish(mgCtx);
  module.dispose?.();

  if (scoreSystem.maxCombo > sessionMaxCombo) sessionMaxCombo = scoreSystem.maxCombo;
  dispatch({ type: 'MINIGAME_COMPLETE', result });

  const isLast = state.mgIndex + 1 >= state.sequence.length;

  if (state.mode === 'party') {
    if (isLast) {
      const session = buildSession(state, result);
      dispatch({ type: 'PARTY_PLAYER_DONE', score: session.totalScore, stars: session.stars });
      sessionMaxCombo = 0;
    } else {
      initTransition();
      dispatch({ type: 'NAVIGATE', screen: 'transition' });
    }
  } else {
    if (isLast) {
      if (state.mode === 'daily') completeDailyChallenge(result.score);
      const session = buildSession(state, result);
      dispatch({ type: 'SESSION_COMPLETE', session });
      window.parent.postMessage({ type: 'GAME_COMPLETE', score: session.totalScore }, '*');
      initResults(session, particleSystem);
    } else {
      initTransition();
      dispatch({ type: 'NAVIGATE', screen: 'transition' });
    }
  }

  resetMg();
}

/* ── loading screen ──────────────────────────────────────── */
function drawLoading(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const u = unit(W, H);
  drawStartBg(ctx, W, H);
  drawTitle(ctx, W, H, H * 0.4);
  ctx.save();
  ctx.font = font(44 * u, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
  ctx.fillText('Warming up the camera…', W / 2, H * 0.56);
  const t = performance.now() / 300;
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.3 + 0.7 * Math.max(0, Math.sin(t - i * 0.7));
    ctx.fillStyle = '#e8462e'; ctx.beginPath(); ctx.arc(W / 2 + (i - 1) * 50 * u, H * 0.65, 14 * u, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* ── main tick ───────────────────────────────────────────── */
export function tick(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  dt: number,
  state: GameState,
  hands: HandData[],
  dispatch: Dispatch<GameAction>,
  dailySeq: MinigameId[],
): void {
  const screen = state.screen;

  if (screen !== prevScreen) {
    switch (screen) {
      case 'calibrate':   initCalibration(); break;
      case 'countdown': { const id = state.sequence[state.mgIndex]; if (id) initCountdown(id); break; }
      case 'settings':    initSettings(); break;
      case 'world-map':   initWorldMap(); break;
      case 'party-setup': initPartySetup(); break;
      case 'menu':        sessionMaxCombo = 0; menuDwell.arm(); break;
      case 'howto':       howtoDwell.arm(); break;
      default:            break;
    }
    prevScreen = screen;
  }

  const mgId = state.sequence[state.mgIndex] as MinigameId | undefined;

  switch (screen) {
    case 'loading':
      drawLoading(ctx, W, H);
      break;

    case 'calibrate':
      updateCalibration(dt, hands, dispatch);
      drawCalibration(ctx, W, H, hands);
      break;

    case 'menu':
      drawMenu(ctx, W, H, hands, dispatch, dailySeq);
      break;

    case 'world-map':
      updateWorldMap(dt, hands, dispatch);
      drawWorldMap(ctx, W, H, hands);
      break;

    case 'daily':
      updateDailyChallenge(dt, hands, dispatch, dailySeq);
      drawDailyChallenge(ctx, W, H, hands, dailySeq);
      break;

    case 'howto':
      updateHowTo(dt, hands, dispatch);
      drawHowTo(ctx, W, H, hands);
      break;

    case 'settings':
      updateSettings(dt, hands, dispatch);
      drawSettings(ctx, W, H, hands);
      break;

    case 'leaderboard':
      if (state.mode === 'party' && state.partyPlayers.length > 0) {
        drawPartyLeaderboard(ctx, W, H, state.partyPlayers, hands, dispatch);
      } else {
        updateLeaderboard(dt, hands, dispatch);
        drawLeaderboard(ctx, W, H, hands);
      }
      break;

    case 'achievements':
      updateAchievements(dt, hands, dispatch);
      drawAchievements(ctx, W, H, hands);
      break;

    case 'party-setup':
      updatePartySetup(dt, hands, dispatch);
      drawPartySetup(ctx, W, H, hands);
      break;

    case 'countdown':
      if (mgId) {
        if (updateCountdown(dt)) dispatch({ type: 'NAVIGATE', screen: 'play' });
        drawCountdown(ctx, W, H, mgId);
      }
      break;

    case 'play': {
      if (!mgId) break;
      const module = MINIGAME_REGISTRY[mgId];
      const mgCtx: MinigameContext = {
        ctx, W, H, dt, hands,
        particles: particleSystem,
        score: scoreSystem,
        audio: audioSynth,
      };

      if (!mgInited) {
        scoreSystem.reset();
        module.init(mgCtx);
        mgTimerMax = module.duration * difficultyMult();
        mgTimer = mgTimerMax;
        mgInited = true;
      }

      mgTimer -= dt;
      const earlyDone = module.update(mgCtx);

      drawTimerBar(ctx, mgTimer, mgTimerMax, 24, H - 28, W - 48);
      scoreSystem.drawHUD(ctx, W, H);
      scoreSystem.draw(ctx);
      scoreSystem.tick();
      particleSystem.tick();
      particleSystem.draw(ctx);
      hands.forEach(h => drawHandCursor(ctx, h));

      if (earlyDone === true || mgTimer <= 0) {
        finishCurrentMinigame(mgCtx, state, dispatch);
      }
      break;
    }

    case 'transition':
      if (updateTransition(dt)) dispatch({ type: 'TRANSITION_DONE' });
      drawTransition(ctx, W, H, state.sequence[state.mgIndex + 1] ?? null);
      break;

    case 'results':
      if (state.session) {
        updateResults(dt, hands, dispatch);
        drawResults(ctx, W, H, state.session, hands, particleSystem);
      }
      break;

    case 'boss-intro':
      if (updateTransition(dt)) dispatch({ type: 'NAVIGATE', screen: 'countdown' });
      drawTransition(ctx, W, H, 'ultimate-showdown');
      break;

    default:
      drawLoading(ctx, W, H);
  }
}
