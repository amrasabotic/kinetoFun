import type { HandData, GameAction } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';

const howtoDwell = new DwellSystem(1100);

const GESTURES = [
  { icon: '✌', name: 'Pinch',          desc: 'Thumb + index close together' },
  { icon: '🖐', name: 'Open Palm',      desc: 'All fingers spread wide open' },
  { icon: '✊', name: 'Fist',           desc: 'All fingers curled in' },
  { icon: '👍', name: 'Thumbs Up',      desc: 'Thumb up, fingers closed' },
  { icon: '⬆', name: 'Swipe Up',       desc: 'Fast upward flick of wrist' },
  { icon: '⬇', name: 'Chop Down',      desc: 'Fast downward karate chop' },
  { icon: '⬅', name: 'Swipe Left',     desc: 'Fast leftward flick' },
  { icon: '➡', name: 'Swipe Right',    desc: 'Fast rightward flick' },
  { icon: '🔄', name: 'Circular Stir', desc: 'Move wrist in large circles' },
  { icon: '🤝', name: 'Two-Hand Fold', desc: 'Both hands pinch toward center' },
];

const MINIGAME_TIPS = [
  { icon: '🥕', name: 'Vegetable Chop', tip: 'Move hand DOWN quickly over each vegetable — chop it twice to slice!' },
  { icon: '🍲', name: 'Stir the Soup',  tip: 'Draw big CIRCLES with your hand over the pot to fill the Flavor Meter!' },
  { icon: '🥞', name: 'Flip Pancake',   tip: 'Wait for the ring to glow GREEN, then SWIPE UP fast to flip!' },
];

export function updateHowTo(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  void dt;
  const bh = hands.find(h => h.visible) ?? null;
  const fired = howtoDwell.tick(bh);
  if (fired === 'back') { audioSynth.select(); dispatch({ type: 'NAVIGATE', screen: 'menu' }); }
}

export function drawHowTo(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[]): void {
  drawKitchenBg(ctx, W, H);
  ctx.save(); shd(ctx, '#cc88ff', 28);
  ctx.font = `bold ${Math.round(H * 0.065)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#cc88ff';
  ctx.fillText('📖 HOW TO PLAY', W / 2, H * 0.1); nshd(ctx); ctx.restore();

  ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('All navigation uses hand gestures — no mouse or keyboard needed!', W / 2, H * 0.17);

  // Gesture reference grid
  const cols = 2, bw = Math.min(300, W * 0.35), bh = 54, gap = 8;
  const totalW = cols * bw + (cols - 1) * gap;
  const sx = W / 2 - totalW / 2, sy = H * 0.21;
  GESTURES.forEach((g, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = sx + col * (bw + gap), y = sy + row * (bh + gap);
    card(ctx, x, y, bw, bh, 12, 'rgba(0,0,0,0.5)', 'rgba(204,136,255,0.3)', 1.5);
    ctx.font = '24px system-ui'; ctx.textAlign = 'left'; ctx.fillText(g.icon, x + 12, y + 36);
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#cc88ff'; ctx.fillText(g.name, x + 46, y + 24);
    ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(g.desc, x + 46, y + 43);
  });

  // Minigame-specific tips section
  const tipY = sy + Math.ceil(GESTURES.length / cols) * (bh + gap) + 14;
  ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff7c2e';
  ctx.fillText('🍳 MINIGAME TIPS', W / 2, tipY);

  const tipW = Math.min(W * 0.8, 820), tipH = 50, tipX = W / 2 - tipW / 2;
  MINIGAME_TIPS.forEach((t, i) => {
    const ty = tipY + 10 + i * (tipH + 6);
    card(ctx, tipX, ty, tipW, tipH, 10, 'rgba(0,0,0,0.45)', 'rgba(255,124,46,0.3)', 1.5);
    ctx.font = '22px system-ui'; ctx.textAlign = 'left'; ctx.fillText(t.icon, tipX + 10, ty + 34);
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#ff7c2e'; ctx.fillText(t.name, tipX + 42, ty + 22);
    ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillText(t.tip, tipX + 42, ty + 40);
  });

  ctx.font = '13px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,200,100,0.75)';
  ctx.fillText('💡 Dwell (hover) over any button for 1 second to activate it', W / 2, H * 0.9);

  const backR = [{ id: 'back', x: W / 2 - 110, y: H * 0.93, w: 220, h: 50 }];
  howtoDwell.setRegions(backR);
  const { id: hovId, p } = howtoDwell.progress();
  const hov = hovId === 'back';
  ctx.save(); if (hov) shd(ctx, '#ff7c2e', 18);
  card(ctx, backR[0].x, backR[0].y, 220, 50, 14, hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)', hov ? '#ff7c2e' : 'rgba(255,255,255,0.2)', hov ? 3 : 2);
  if (hov && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(backR[0].x, backR[0].y + 44, 220 * p, 6, 3); ctx.fillStyle = '#ff7c2e'; ctx.fill(); }
  ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hov ? '#ff7c2e' : '#fff';
  ctx.fillText('← MAIN MENU', W / 2, backR[0].y + 31);
  nshd(ctx); ctx.restore();

  hands.forEach(h => drawHandCursor(ctx, h));
}
