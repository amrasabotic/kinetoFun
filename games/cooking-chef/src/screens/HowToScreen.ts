import type { HandData, GameAction } from '@/types';
import type { Dispatch } from 'react';
import { drawPointer, leadHand } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { drawStartBg, drawIcon, recipeCard, dwellButton, unit, font, INK, TOMATO, BASIL, type IconName } from './startUi';

export const howtoDwell = new DwellSystem(1100);

const STEPS: { icon: IconName; title: string; lines: string[] }[] = [
  { icon: 'hand',  title: 'Point',  lines: ['Move your hand', 'and the ring follows'] },
  { icon: 'pinch', title: 'Pinch',  lines: ['Touch thumb and finger', 'to grab food'] },
  { icon: 'hold',  title: 'Hold',   lines: ['Rest on a button', 'to press it'] },
];

const MOVES = ['Chop down fast', 'Stir in circles', 'Swipe up to flip', 'Open palm to grill'];

let pinches = 0;
let wasPinching = false;

export function updateHowTo(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  void dt;
  const h = leadHand(hands);
  if (h?.pinch && !wasPinching) { pinches++; audioSynth.catch_(); }
  wasPinching = !!h?.pinch;
  const fired = howtoDwell.tick(h);
  if (fired === 'go') { audioSynth.select(); dispatch({ type: 'NAVIGATE', screen: 'menu' }); }
}

export function drawHowTo(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[]): void {
  const u = unit(W, H);
  drawStartBg(ctx, W, H);
  const h = leadHand(hands);

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = font(84 * u, 900); ctx.lineWidth = 12 * u; ctx.strokeStyle = '#fff6e6'; ctx.lineJoin = 'round';
  ctx.strokeText('How to Cook', W / 2, H * 0.1); ctx.fillStyle = TOMATO; ctx.fillText('How to Cook', W / 2, H * 0.1);
  ctx.restore();

  const gap = 40 * u, cw = Math.min(520 * u, (W - 120 * u - gap * 2) / 3), ch = 440 * u;
  const x0 = W / 2 - (cw * 3 + gap * 2) / 2, y0 = H * 0.19;
  STEPS.forEach((s, i) => {
    const x = x0 + i * (cw + gap);
    const live = s.icon === 'pinch' && !!h?.pinch;
    const col = live ? BASIL : TOMATO;
    ctx.save();
    recipeCard(ctx, x, y0, cw, ch, u, live ? BASIL : undefined, live ? '#eaf7ea' : undefined);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 56 * u, y0 + 56 * u, 32 * u, 0, Math.PI * 2); ctx.fill();
    ctx.font = font(38 * u, 900); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x + 56 * u, y0 + 58 * u);
    drawIcon(ctx, s.icon, x + cw / 2, y0 + 150 * u, 150 * u, col);
    ctx.font = font(56 * u, 900); ctx.fillStyle = INK; ctx.fillText(s.title, x + cw / 2, y0 + 280 * u);
    ctx.font = font(32 * u, 600); ctx.fillStyle = 'rgba(59,35,20,0.85)';
    s.lines.forEach((l, j) => ctx.fillText(l, x + cw / 2, y0 + 336 * u + j * 42 * u));
    if (s.icon === 'pinch') {
      // Live feedback: the card answers the player's own pinch.
      ctx.font = font(30 * u, 900); ctx.fillStyle = live ? BASIL : 'rgba(59,35,20,0.6)';
      ctx.fillText(!h ? 'Show your hand to try' : live ? 'Pinching!' : pinches ? `Nice! ${pinches} pinch${pinches > 1 ? 'es' : ''}` : 'Try it now', x + cw / 2, y0 + 50 * u);
    }
    ctx.restore();
  });

  const my = y0 + ch + 60 * u;
  ctx.save();
  ctx.font = font(34 * u, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
  ctx.fillText('In the kitchen you will also:  ' + MOVES.join('   ·   '), W / 2, my);
  ctx.restore();

  const bw = 520 * u, bh = 120 * u, bx = W / 2 - bw / 2, by = H * 0.8;
  howtoDwell.setRegions([{ id: 'go', x: bx, y: by, w: bw, h: bh }]);
  const { id, p } = howtoDwell.progress();
  dwellButton(ctx, bx, by, bw, bh, u, "Let's cook!", BASIL, id === 'go', p);

  drawPointer(ctx, hands);
}
