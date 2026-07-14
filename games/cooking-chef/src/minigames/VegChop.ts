import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { detectChopDown } from '@/mediapipe/GestureDetector';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, card, shd, nshd, rnd } from '@/game/drawHelpers';

interface Veg {
  x: number; y: number; r: number; hp: number; maxHp: number;
  emoji: string; col: string;
  sliced: boolean; flash: number; shake: number; dy: number;
}

const VEG_TYPES = [
  { emoji: '🥕', col: '#ff8822' }, { emoji: '🍅', col: '#ff2222' },
  { emoji: '🥒', col: '#44cc44' }, { emoji: '🧅', col: '#ffcc88' }, { emoji: '🍄', col: '#997755' },
];

let vegs: Veg[] = [];
let chopCooldown = 0;
let mgTime = 0;
let totalPts = 0;
let perfects = 0;
let instructTimer = 0;

export const VegChopModule: MinigameModule = {
  id: 'veg-chop', name: 'Vegetable Chop!', icon: '🥕',
  hint: 'Chop DOWN fast with your hand!', duration: 12, maxScore: 500,

  init({ W, H }) {
    vegs = VEG_TYPES.map((vt, i) => ({
      x: W * 0.15 + i * (W * 0.7 / 4), y: H * 0.55, r: 50,
      hp: 2, maxHp: 2, ...vt, sliced: false,
      flash: 0, shake: 0, dy: 0,
    }));
    chopCooldown = 0; mgTime = this.duration; totalPts = 0; perfects = 0;
    instructTimer = 3.0;
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    if (instructTimer > 0) instructTimer -= dt;
    chopCooldown = Math.max(0, chopCooldown - dt);

    hands.forEach(h => {
      if (!h.visible || chopCooldown > 0) return;
      // Lowered threshold from 9 → 5 for easier detection
      if (detectChopDown(h)) {
        vegs.forEach(v => {
          if (v.sliced) return;
          // Increased hit radius from r+30 to r+60 for more forgiving detection
          if (Math.hypot(h.x - v.x, h.y - v.y) < v.r + 60) {
            v.hp--; v.flash = 0.3; v.shake = 10;
            audio.chop(); particles.slice(v.x, v.y);
            if (v.hp <= 0) {
              v.sliced = true; v.dy = -8;
              const pts = score.add(80, v.x, v.y, 'CHOP!'); totalPts += pts;
              score.addCombo(audio); audio.sizzle(); particles.burst(v.x, v.y, '#ff7c2e', 20);
              perfects++;
            } else {
              score.add(20, v.x, v.y, 'SLICE!');
            }
            chopCooldown = 0.18;
          }
        });
      }
    });

    vegs.forEach(v => {
      v.flash = Math.max(0, v.flash - dt); v.shake = Math.max(0, v.shake - dt * 30);
      if (v.sliced) { v.y += v.dy; v.dy += 0.5; }
    });

    // Draw
    drawKitchenBg(ctx, W, H);

    // Cutting board
    card(ctx, W / 2 - 380, H * 0.48, 760, H * 0.18, 16, '#8B5E3C', '#6B4020', 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(W / 2 - 370, H * 0.48 + i * 14 + 10); ctx.lineTo(W / 2 + 370, H * 0.48 + i * 14 + 10); ctx.stroke(); }

    // Target zones — show where to chop
    vegs.forEach(v => {
      if (v.sliced) return;
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(performance.now() * 0.005);
      ctx.strokeStyle = '#ff7c2e'; ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r + 60, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();
    });

    vegs.forEach(v => {
      if (v.sliced && v.y > H + 100) return;
      const sx = v.shake * Math.sin(performance.now() * 0.08);
      ctx.save(); ctx.translate(v.x + sx, v.y);
      if (v.flash > 0) shd(ctx, v.col, 25);
      ctx.font = (v.r * 1.8) + 'px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(v.emoji, 0, v.r * 0.6);
      if (!v.sliced && v.hp < v.maxHp) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -v.r * 0.5); ctx.lineTo(10, v.r * 0.5); ctx.stroke(); }
      if (v.sliced) { ctx.globalAlpha = 0.5; ctx.font = '18px system-ui'; ctx.fillStyle = '#44ff88'; ctx.fillText('✓', 0, -v.r); ctx.globalAlpha = 1; }
      nshd(ctx); ctx.restore();
    });

    // Downward arrow animation above each uncut veg
    const arrowBob = Math.sin(performance.now() * 0.006) * 8;
    vegs.forEach(v => {
      if (v.sliced) return;
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(performance.now() * 0.006);
      ctx.fillStyle = '#ff7c2e';
      ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('⬇', v.x, v.y - v.r - 30 + arrowBob);
      ctx.globalAlpha = 1;
      ctx.restore();
    });

    // Chop trail
    hands.forEach(h => {
      if (!h.visible || h.vy < 3) return;
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ff7c2e'; ctx.lineWidth = 5;
      ctx.beginPath(); h.hist.slice(-6).forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }); ctx.stroke(); ctx.restore();
    });

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, this.hint, '🥕');
    score.drawHUD(ctx, W, H);
    hands.forEach(h => drawHandCursor(ctx, h, '#ff7c2e'));
    particles.draw(ctx); score.draw(ctx);

    // Instruction overlay for first 3 seconds
    if (instructTimer > 0) {
      const alpha = Math.min(1, instructTimer * 0.7);
      ctx.save();
      ctx.globalAlpha = alpha * 0.88;
      card(ctx, W / 2 - 320, H * 0.28, 640, 130, 18, '#1a0800', '#ff7c2e', 2);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff7c2e';
      ctx.fillText('🥕 VEGETABLE CHOP', W / 2, H * 0.28 + 38);
      ctx.font = '17px system-ui'; ctx.fillStyle = '#fff';
      ctx.fillText('Move your hand DOWN quickly over each vegetable', W / 2, H * 0.28 + 70);
      ctx.fillText('Chop each one twice to slice it! Hit both hands for speed!', W / 2, H * 0.28 + 96);
      ctx.restore();
    }

    if (vegs.every(v => v.sliced)) { score.add(100, W / 2, H * 0.3, 'PERFECT! 🔥'); return true; }
  },

  finish({ score }): MinigameResult {
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
