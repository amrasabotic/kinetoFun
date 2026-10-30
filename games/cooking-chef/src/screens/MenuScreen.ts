import type { HandData, GameAction } from '@/types';
import type { Dispatch } from 'react';
import { drawPointer, leadHand } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { storage } from '@/storage/localStorage';
import { STORY_SEQUENCE, buildEndlessSequence } from '@/hooks/useGameState';
import type { MinigameId } from '@/types';
import { drawStartBg, drawTitle, drawIcon, recipeCard, unit, font, INK, TOMATO, BASIL, BUTTER, type IconName } from './startUi';

interface Item { id: string; label: string; sub: string; col: string; icon: IconName }

const ITEMS: Item[] = [
  { id: 'play',        label: 'Story',       sub: '12 kitchen stages',  col: TOMATO,    icon: 'play' },
  { id: 'endless',     label: 'Endless',     sub: 'How long can you go?', col: '#c77d0a', icon: 'endless' },
  { id: 'daily',       label: 'Daily',       sub: "Today's menu",        col: BASIL,     icon: 'daily' },
  { id: 'party',       label: 'Party',       sub: '2 to 4 players',      col: '#2f7fc4', icon: 'party' },
  { id: 'howto',       label: 'How to Play', sub: 'Moves and tips',      col: '#8a4fbf', icon: 'howto' },
  { id: 'settings',    label: 'Settings',    sub: 'Sound and speed',     col: '#5d6b78', icon: 'settings' },
  { id: 'leaderboard', label: 'Top Chefs',   sub: 'Best scores',         col: '#b8860b', icon: 'trophy' },
];

// Only inside the KinetoFun platform is there somewhere to go back to.
const EXIT_ITEM: Item = { id: 'exit', label: 'Back to Games', sub: 'Leave the kitchen', col: '#a33', icon: 'exit' };
const menuItems = () => (typeof window !== 'undefined' && window.parent !== window ? [...ITEMS, EXIT_ITEM] : ITEMS);

export const menuDwell = new DwellSystem(1100);

export function drawMenu(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[], dispatch: Dispatch<GameAction>, dailySequence: MinigameId[]): void {
  const u = unit(W, H);
  drawStartBg(ctx, W, H);
  drawTitle(ctx, W, H, H * 0.12);

  const fired = menuDwell.tick(leadHand(hands));
  if (fired) handleMenuActivate(fired, dispatch, dailySequence);

  const prog = storage.getOrDefault('progress');
  if (prog.bestScore > 0) {
    ctx.save();
    recipeCard(ctx, W - 380 * u, 30 * u, 340 * u, 84 * u, u, BUTTER);
    drawIcon(ctx, 'trophy', W - 330 * u, 72 * u, 46 * u, '#b8860b');
    ctx.font = font(36 * u, 900); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
    ctx.fillText('Best ' + prog.bestScore, W - 290 * u, 74 * u);
    ctx.restore();
  }

  const items = menuItems();
  const cols = 4, rows = Math.ceil(items.length / cols);
  const gap = 34 * u;
  const tileW = Math.min(400 * u, (W - 160 * u - gap * (cols - 1)) / cols);
  const tileH = 290 * u;
  const gridW = cols * tileW + (cols - 1) * gap;
  const x0 = W / 2 - gridW / 2, y0 = H * 0.25;
  const regions = items.map((item, i) => ({
    id: item.id,
    x: x0 + (i % cols) * (tileW + gap),
    y: y0 + Math.floor(i / cols) * (tileH + gap),
    w: tileW, h: tileH,
  }));
  menuDwell.setRegions(regions);

  const { id: hovId, p } = menuDwell.progress();
  items.forEach((item, i) => {
    const r = regions[i];
    const hov = hovId === item.id;
    const lift = hov ? -10 * u : 0;
    ctx.save();
    recipeCard(ctx, r.x, r.y + lift, r.w, r.h, u, hov ? item.col : 'rgba(59,35,20,0.25)', hov ? '#fff' : undefined);
    // Coloured band like a recipe-card header.
    ctx.save();
    ctx.beginPath(); (ctx as unknown as { roundRect(x: number, y: number, w: number, h: number, r: number): void }).roundRect(r.x, r.y + lift, r.w, r.h, 26 * u); ctx.clip();
    ctx.fillStyle = item.col; ctx.fillRect(r.x, r.y + lift, r.w, 132 * u);
    if (hov && p > 0) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(r.x, r.y + lift, r.w * p, r.h); }
    ctx.restore();
    drawIcon(ctx, item.icon, r.x + r.w / 2, r.y + lift + 66 * u, 78 * u, '#fff');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = font(44 * u, 900); ctx.fillStyle = hov ? item.col : INK;
    ctx.fillText(item.label, r.x + r.w / 2, r.y + lift + 186 * u);
    ctx.font = font(28 * u, 600); ctx.fillStyle = 'rgba(59,35,20,0.75)';
    ctx.fillText(item.sub, r.x + r.w / 2, r.y + lift + 238 * u);
    ctx.restore();
  });

  const hintY = y0 + rows * (tileH + gap) + 30 * u;
  ctx.save();
  ctx.font = font(34 * u, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
  ctx.fillText(leadHand(hands) ? 'Hold your hand on a card to choose it' : 'Raise your hand to the camera', W / 2, Math.min(hintY, H * 0.9));
  ctx.restore();

  drawPointer(ctx, hands);
}

function handleMenuActivate(id: string, dispatch: Dispatch<GameAction>, dailySequence: MinigameId[]): void {
  audioSynth.resume(); audioSynth.select();
  switch (id) {
    case 'play':    dispatch({ type: 'START_GAME', mode: 'story',   sequence: STORY_SEQUENCE }); break;
    case 'endless': dispatch({ type: 'START_GAME', mode: 'endless', sequence: buildEndlessSequence(1) }); break;
    case 'daily':   dispatch({ type: 'START_GAME', mode: 'daily',   sequence: dailySequence }); break;
    case 'party':   dispatch({ type: 'NAVIGATE', screen: 'party-setup' }); break;
    case 'howto':   dispatch({ type: 'NAVIGATE', screen: 'howto' }); break;
    case 'settings':dispatch({ type: 'NAVIGATE', screen: 'settings' }); break;
    case 'leaderboard': dispatch({ type: 'NAVIGATE', screen: 'leaderboard' }); break;
    case 'exit':    window.parent.postMessage({ type: 'GAME_EXIT' }, '*'); break;
    default: break;
  }
}
