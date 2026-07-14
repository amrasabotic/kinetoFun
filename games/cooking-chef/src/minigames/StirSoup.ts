import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { stirValue } from '@/mediapipe/GestureDetector';
import { drawKitchenBg, drawTimerBar, drawGestureHint, card, shd, nshd, rnd } from '@/game/drawHelpers';

interface SwirlPart { a: number; r: number; col: string; }
const COLS = ['#ff8822', '#cc4400', '#884400', '#ffcc44', '#cc8844'];

let swirls: SwirlPart[] = [];
let swirlDir = 0;
let flavorMeter = 0;
let lastStirT = 0;
let mgTime = 0;
let perfects = 0;
let instructTimer = 0;
// Tracks guide circle angle for the animated stir prompt
let guideAngle = 0;

export const StirSoupModule: MinigameModule = {
  id: 'stir-soup', name: 'Stir the Soup!', icon: '🍲',
  hint: 'Move your hand in CIRCLES over the pot!', duration: 13, maxScore: 400,

  init({ H }) {
    swirls = Array.from({ length: 12 }, () => ({ a: Math.random() * Math.PI * 2, r: rnd(20, 70), col: COLS[Math.floor(Math.random() * COLS.length)] }));
    swirlDir = 0; flavorMeter = 0; lastStirT = 0; mgTime = this.duration; perfects = 0;
    instructTimer = 3.5; guideAngle = 0;
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    if (instructTimer > 0) instructTimer -= dt;
    guideAngle += dt * 2.0;

    const potX = W / 2, potY = H * 0.52, potR = 140;
    let anyStir = false;

    hands.forEach(h => {
      if (!h.visible) return;
      if (Math.hypot(h.x - potX, h.y - potY) < potR + 80) {
        const sv = stirValue(h);
        // Lowered threshold from 6 → 2 for easier circular detection
        if (Math.abs(sv) > 2) {
          anyStir = true; swirlDir = sv > 0 ? 1 : -1;
          const delta = Math.abs(sv) * 0.4;
          flavorMeter = Math.min(1, flavorMeter + dt * 0.15);
          lastStirT = performance.now();
          if (Math.random() < 0.3) audio.stir();
          score.add(Math.round(delta * 0.5), h.x, h.y - 30);
          score.addCombo(audio); perfects++;
          swirls.forEach(p => { p.a += swirlDir * 0.12 + Math.random() * 0.04; p.r = Math.max(15, Math.min(90, p.r + rnd(-3, 3))); });
        }
      }
    });

    if (!anyStir) { flavorMeter = Math.max(0, flavorMeter - dt * 0.04); }
    if (performance.now() - lastStirT < 500 || flavorMeter > 0.3) { if (Math.random() < 0.15) particles.steam(potX + rnd(-40, 40), potY - 50); }

    // Draw
    drawKitchenBg(ctx, W, H);
    ctx.save();

    // Pot shadow
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(potX, potY + 20, potR + 20, 60, 0, 0, Math.PI * 2); ctx.fill();
    // Pot body
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(potX, potY, potR, 50, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#888'; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(potX, potY, potR + 10, 54, 0, 0, Math.PI * 2); ctx.stroke();
    // Handles
    ctx.strokeStyle = '#777'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(potX - potR - 10, potY); ctx.lineTo(potX - potR - 40, potY - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(potX + potR + 10, potY); ctx.lineTo(potX + potR + 40, potY - 10); ctx.stroke();

    // Soup surface
    const soupGrd = ctx.createRadialGradient(potX, potY, 10, potX, potY, potR - 10);
    soupGrd.addColorStop(0, '#cc6600'); soupGrd.addColorStop(0.6, '#993300'); soupGrd.addColorStop(1, '#661100');
    ctx.fillStyle = soupGrd; ctx.beginPath(); ctx.ellipse(potX, potY, potR - 4, 46, 0, 0, Math.PI * 2); ctx.fill();

    swirls.forEach(p => {
      p.a += swirlDir * 0.015;
      const px = potX + Math.cos(p.a) * p.r, py = potY + Math.sin(p.a) * p.r * 0.35;
      ctx.globalAlpha = 0.8; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(px, py, 5 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
    }); ctx.globalAlpha = 1;

    // Animated circular guide ring — shows the user the stir zone
    const stirring = anyStir || (performance.now() - lastStirT < 800);
    ctx.globalAlpha = stirring ? 0.0 : (0.5 + 0.2 * Math.sin(performance.now() * 0.004));
    ctx.strokeStyle = '#ff7c2e'; ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.beginPath(); ctx.ellipse(potX, potY, potR + 30, (potR + 30) * 0.37, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Moving dot on guide ring
    if (!stirring) {
      const gx = potX + Math.cos(guideAngle) * (potR + 30);
      const gy = potY + Math.sin(guideAngle) * (potR + 30) * 0.37;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ff7c2e'; ctx.beginPath(); ctx.arc(gx, gy, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ladle cursor
    hands.forEach(h => {
      if (!h.visible) return;
      const inPot = Math.hypot(h.x - potX, h.y - potY) < potR + 80;
      ctx.font = '32px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🥄', h.x, h.y + 12);
      if (inPot) { shd(ctx, '#ff7c2e', 15); ctx.strokeStyle = 'rgba(255,124,46,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, 30, 0, Math.PI * 2); ctx.stroke(); nshd(ctx); }
    });
    ctx.restore();

    // Flavor meter
    const mX = W / 2 - 180, mY = H * 0.18;
    card(ctx, mX, mY, 360, 24, 12, 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.2)', 2);
    const col = flavorMeter > 0.8 ? '#44ff88' : flavorMeter > 0.4 ? '#ff7c2e' : '#ff3333';
    card(ctx, mX, mY, 360 * flavorMeter, 24, 12, col);
    ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🌡 FLAVOR METER', W / 2, mY - 8);
    // Flavor level label
    const flavorLabel = flavorMeter > 0.8 ? 'DELICIOUS! 🔥' : flavorMeter > 0.4 ? 'Getting there...' : 'Keep stirring!';
    ctx.font = '13px system-ui'; ctx.fillStyle = col; ctx.fillText(flavorLabel, W / 2, mY + 38);

    // Stirring feedback
    if (anyStir) {
      ctx.save(); shd(ctx, '#ff7c2e', 20);
      ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff7c2e';
      ctx.fillText('🔄 STIRRING!', potX, potY - 80);
      nshd(ctx); ctx.restore();
    }

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, this.hint, '🍲');
    score.drawHUD(ctx, W, H);
    particles.draw(ctx); score.draw(ctx);

    // Instruction overlay for first 3.5 seconds
    if (instructTimer > 0) {
      const alpha = Math.min(1, instructTimer * 0.5);
      ctx.save();
      ctx.globalAlpha = alpha * 0.88;
      card(ctx, W / 2 - 340, H * 0.28, 680, 140, 18, '#1a0800', '#ff7c2e', 2);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff7c2e';
      ctx.fillText('🍲 STIR THE SOUP', W / 2, H * 0.28 + 38);
      ctx.font = '17px system-ui'; ctx.fillStyle = '#fff';
      ctx.fillText('Move your hand in big CIRCLES over the pot', W / 2, H * 0.28 + 72);
      ctx.fillText('Keep stirring to fill the Flavor Meter! 🔄', W / 2, H * 0.28 + 100);
      ctx.restore();
    }
  },

  finish({ score }): MinigameResult {
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
