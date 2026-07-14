import { COLORS, LM, GAME_CONFIG, STATES } from '../game/constants.js';
import { SKELETON_CONNECTIONS } from '../game/PoseLibrary.js';
import { clamp } from '../utils/MathUtils.js';

export class Renderer {
  constructor(overlayCanvas, uiCanvas) {
    this.overlay = overlayCanvas;
    this.ui      = uiCanvas;
    this.octx    = overlayCanvas.getContext('2d');
    this.uctx    = uiCanvas.getContext('2d');
  }

  resize(w, h) {
    this.overlay.width  = w;
    this.overlay.height = h;
    this.ui.width       = w;
    this.ui.height      = h;
  }

  // ── Skeleton overlay ────────────────────────────────────────────────────

  drawPlayerSkeleton(landmarks) {
    if (!landmarks || landmarks.length < 33) return;
    const ctx = this.octx;
    const W = this.overlay.width;
    const H = this.overlay.height;

    const pt = (i) => {
      const lm = landmarks[i];
      if (!lm) return null;
      // Mirror x for selfie view
      return { x: (1 - lm.x) * W, y: lm.y * H, v: lm.visibility ?? 0 };
    };

    // Connections
    ctx.lineWidth   = 3;
    ctx.strokeStyle = COLORS.SKELETON_PLAYER;
    ctx.shadowColor = COLORS.SKELETON_PLAYER;
    ctx.shadowBlur  = 8;

    for (const [a, b] of SKELETON_CONNECTIONS) {
      const pa = pt(a), pb = pt(b);
      if (!pa || !pb || pa.v < 0.4 || pb.v < 0.4) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    // Joints
    for (const idx of Object.values(LM)) {
      if (idx < 11) continue; // skip face landmarks
      const p = pt(idx);
      if (!p || p.v < 0.4) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.SKELETON_PLAYER;
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }

  clearOverlay() {
    this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
  }

  // ── Reference pose avatar ────────────────────────────────────────────────

  drawRefPose(pose) {
    if (!pose) return;
    const ctx = this.uctx;
    const W   = this.ui.width;
    const H   = this.ui.height;

    // Draw in top-right corner box
    const boxW = Math.min(W * 0.22, 220);
    const boxH = Math.min(H * 0.38, 320);
    const bx   = W - boxW - 20;
    const by   = 20;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeStyle = COLORS.SECONDARY;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = COLORS.SECONDARY;
    ctx.font       = `bold ${Math.round(boxW * 0.09)}px "Inter", sans-serif`;
    ctx.textAlign  = 'center';
    ctx.fillText('TARGET', bx + boxW / 2, by + boxW * 0.09 + 6);

    // Stick figure
    const figH   = boxH * 0.72;
    const figOffX = bx + boxW / 2;
    const figOffY = by + boxH * 0.18;

    const toScreen = (kp) => ({
      x: figOffX + (kp.x - 0.5) * boxW * 0.90,
      y: figOffY + kp.y * figH,
    });

    const kps = pose.keypoints;

    // Connections
    ctx.strokeStyle = COLORS.SECONDARY;
    ctx.lineWidth   = Math.max(2, boxW * 0.022);
    ctx.shadowColor = COLORS.SECONDARY;
    ctx.shadowBlur  = 6;

    for (const [a, b] of SKELETON_CONNECTIONS) {
      const pa = kps[a], pb = kps[b];
      if (!pa || !pb) continue;
      const sa = toScreen(pa), sb = toScreen(pb);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
    }

    // Head
    const nose = toScreen(kps[0] ?? { x: 0.5, y: 0.08 });
    ctx.beginPath();
    ctx.arc(nose.x, nose.y, boxW * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.SECONDARY;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pose name below box
    ctx.fillStyle = COLORS.SECONDARY;
    ctx.font      = `bold ${Math.round(boxW * 0.095)}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(pose.name, bx + boxW / 2, by + boxH + 22);
  }

  // ── UI layer ─────────────────────────────────────────────────────────────

  clearUI() {
    this.uctx.clearRect(0, 0, this.ui.width, this.ui.height);
  }

  drawLoadingScreen(progress) {
    const ctx = this.uctx;
    const W = this.ui.width, H = this.ui.height;
    this._drawBg();
    this._drawTitle();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.font = `bold ${clamp(W * 0.045, 28, 60)}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Loading MediaPipe...', W / 2, H / 2);
    // Progress bar
    const bw = W * 0.4, bh = 12, bx = W * 0.3, by = H / 2 + 30;
    ctx.strokeStyle = COLORS.PRIMARY;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.stroke();
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.beginPath(); ctx.roundRect(bx, by, bw * progress, bh, 6); ctx.fill();
  }

  drawIdleScreen(personProgress, handsUpProgress) {
    const ctx = this.uctx;
    const W = this.ui.width, H = this.ui.height;
    this._drawTitle();

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0,0,0,0.40)';
    ctx.fillRect(0, 0, W, H);

    const fs = clamp(W * 0.038, 22, 50);
    ctx.textAlign  = 'center';

    if (personProgress > 0 || handsUpProgress > 0) {
      const prog = Math.max(personProgress, handsUpProgress);
      ctx.fillStyle = COLORS.ACCENT;
      ctx.font = `bold ${clamp(W * 0.06, 30, 72)}px "Inter", sans-serif`;
      ctx.fillText('HOLD STILL...', W / 2, H / 2 - 30);
      this._drawProgressRing(W / 2, H / 2 + 60, 50, prog, COLORS.ACCENT);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fs}px "Inter", sans-serif`;
      ctx.fillText('Step into the camera', W / 2, H * 0.46);
      ctx.fillStyle = COLORS.PRIMARY;
      ctx.font = `${clamp(W * 0.028, 16, 36)}px "Inter", sans-serif`;
      ctx.fillText('Raise both hands above your head to START', W / 2, H * 0.54);
      ctx.fillStyle = '#888';
      ctx.font = `${clamp(W * 0.02, 14, 26)}px "Inter", sans-serif`;
      ctx.fillText('— or stand still for 3 seconds —', W / 2, H * 0.60);
    }

    this._drawRecords();
  }

  drawCountdown(number, subText = '') {
    const ctx = this.uctx;
    const W = this.ui.width, H = this.ui.height;
    ctx.fillStyle = 'rgba(0,0,0,0.50)';
    ctx.fillRect(0, 0, W, H);

    if (subText) {
      ctx.fillStyle = COLORS.ACCENT;
      ctx.font       = `bold ${clamp(W * 0.07, 36, 90)}px "Inter", sans-serif`;
      ctx.textAlign  = 'center';
      ctx.fillText(subText, W / 2, H * 0.38);
    }

    if (number > 0) {
      ctx.fillStyle   = COLORS.PRIMARY;
      ctx.font        = `900 ${clamp(W * 0.22, 80, 260)}px "Inter", sans-serif`;
      ctx.textAlign   = 'center';
      ctx.shadowColor = COLORS.PRIMARY;
      ctx.shadowBlur  = 40;
      ctx.fillText(String(number), W / 2, H * 0.72);
      ctx.shadowBlur  = 0;
    }
  }

  drawChallengeHUD(pose, timeLeft, totalTime, score, combo, accuracy) {
    const ctx = this.uctx;
    const W = this.ui.width, H = this.ui.height;

    // Timer bar at top
    const progress = timeLeft / totalTime;
    const barColor = progress > 0.5 ? COLORS.SUCCESS : progress > 0.25 ? COLORS.WARNING : COLORS.ERROR;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 10);
    ctx.fillStyle = barColor;
    ctx.fillRect(0, 0, W * progress, 10);

    // Score top-left
    const sf = clamp(W * 0.025, 14, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(16, 16, 180, 82);
    ctx.fillStyle = COLORS.PRIMARY;
    ctx.font = `bold ${sf}px "Inter", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE`, 24, 38);
    ctx.font = `bold ${sf * 1.7}px "Inter", sans-serif`;
    ctx.fillText(String(score), 24, 68);

    // Combo
    if (combo > 0) {
      const comboColors = ['', COLORS.SUCCESS, COLORS.ACCENT, COLORS.WARNING, COLORS.SECONDARY, COLORS.ERROR];
      const cidx = Math.min(combo, comboColors.length - 1);
      ctx.fillStyle = comboColors[cidx] || COLORS.SECONDARY;
      ctx.font = `bold ${sf * 1.1}px "Inter", sans-serif`;
      ctx.fillText(`x${combo} COMBO`, 24, 92);
    }

    // Accuracy bar — bottom center
    const barW = Math.min(W * 0.5, 400);
    const barH = 18;
    const barX = W / 2 - barW / 2;
    const barY = H - 50;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    const accColor = accuracy >= 88 ? COLORS.SUCCESS : accuracy >= 68 ? COLORS.WARNING : COLORS.ERROR;
    ctx.fillStyle = accColor;
    ctx.fillRect(barX, barY, barW * (accuracy / 100), barH);
    ctx.strokeStyle = '#ffffff33';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${sf}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${accuracy}% MATCH`, W / 2, barY - 8);

    // Time remaining — large display when < 2s
    if (timeLeft <= 2) {
      ctx.fillStyle = COLORS.ERROR;
      ctx.shadowColor = COLORS.ERROR;
      ctx.shadowBlur = 20;
      ctx.font = `bold ${clamp(W * 0.10, 40, 120)}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(timeLeft).toString(), W / 2, H / 2 - 20);
      ctx.shadowBlur = 0;
    }
  }

  drawFeedback(label, accuracy, poseScore, speedBonus, comboMult) {
    const ctx = this.uctx;
    const W = this.ui.width, H = this.ui.height;

    const labelColors = {
      'PERFECT!': COLORS.SUCCESS,
      'GOOD!': COLORS.ACCENT,
      'TRY AGAIN!': COLORS.ERROR,
    };
    const col = labelColors[label] ?? COLORS.PRIMARY;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    // Big feedback label
    ctx.fillStyle   = col;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 50;
    ctx.font        = `900 ${clamp(W * 0.12, 50, 150)}px "Inter", sans-serif`;
    ctx.textAlign   = 'center';
    ctx.fillText(label, W / 2, H * 0.42);
    ctx.shadowBlur  = 0;

    // Stats
    const sf = clamp(W * 0.03, 16, 38);
    ctx.font = `bold ${sf}px "Inter", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${accuracy}% accuracy  ·  +${poseScore} pts`, W / 2, H * 0.57);
    if (speedBonus > 1.05) {
      ctx.fillStyle = COLORS.ACCENT;
      ctx.fillText(`Speed Bonus x${speedBonus.toFixed(1)}`, W / 2, H * 0.64);
    }
    if (comboMult > 1.05) {
      ctx.fillStyle = COLORS.SECONDARY;
      ctx.fillText(`Combo x${comboMult.toFixed(2)}`, W / 2, H * 0.71);
    }
  }

  drawGameOver(score, bestStreak, avgAccuracy, records) {
    const ctx = this.uctx;
    const W = this.ui.width, H = this.ui.height;

    // BG overlay
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle   = COLORS.PRIMARY;
    ctx.shadowColor = COLORS.PRIMARY;
    ctx.shadowBlur  = 30;
    ctx.font        = `900 ${clamp(W * 0.09, 40, 110)}px "Inter", sans-serif`;
    ctx.fillText('GAME OVER', W / 2, H * 0.15);
    ctx.shadowBlur  = 0;

    // Score panel
    const panelW = Math.min(W * 0.7, 580);
    const panelH = 220;
    const px = W / 2 - panelW / 2;
    const py = H * 0.22;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = COLORS.PRIMARY;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 16); ctx.fill(); ctx.stroke();

    const col1 = px + panelW * 0.25;
    const col2 = px + panelW * 0.75;
    const row1 = py + 60;
    const row2 = py + 140;
    const sf = clamp(W * 0.028, 14, 34);

    this._statCell(ctx, col1, row1, 'FINAL SCORE', String(score), COLORS.PRIMARY, sf);
    this._statCell(ctx, col2, row1, 'BEST STREAK', `x${bestStreak}`, COLORS.SECONDARY, sf);
    this._statCell(ctx, col1, row2, 'AVG ACCURACY', `${avgAccuracy}%`, COLORS.ACCENT, sf);
    this._statCell(ctx, col2, row2, 'HIGH SCORE', String(records.highScore), COLORS.SUCCESS, sf);

    // Restart instructions
    const ry = H * 0.70;
    ctx.fillStyle = COLORS.ACCENT;
    ctx.font = `bold ${clamp(W * 0.04, 22, 50)}px "Inter", sans-serif`;
    ctx.fillText('To play again:', W / 2, ry);
    ctx.fillStyle = '#cccccc';
    ctx.font = `${clamp(W * 0.028, 16, 36)}px "Inter", sans-serif`;
    ctx.fillText('Raise both hands above head  — or —  Clap!', W / 2, ry + 46);

    // All-time records
    ctx.fillStyle = '#666';
    ctx.font = `${clamp(W * 0.02, 12, 24)}px "Inter", sans-serif`;
    ctx.fillText(`All-time: ${records.gamesPlayed} games played  ·  avg accuracy ${records.avgAccuracy}%  ·  best streak ${records.bestStreak}`, W / 2, H - 30);
  }

  drawPausedOverlay(freezeProgress) {
    const ctx = this.uctx;
    const W = this.ui.width, H = this.ui.height;
    ctx.fillStyle = 'rgba(0,0,0,0.70)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COLORS.ACCENT;
    ctx.font = `900 ${clamp(W * 0.10, 50, 130)}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = COLORS.ACCENT;
    ctx.shadowBlur = 40;
    ctx.fillText('PAUSED', W / 2, H * 0.42);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ccc';
    ctx.font = `${clamp(W * 0.03, 16, 38)}px "Inter", sans-serif`;
    ctx.fillText('Move to resume', W / 2, H * 0.56);
    if (freezeProgress > 0) {
      this._drawProgressRing(W / 2, H * 0.70, 40, freezeProgress, COLORS.ACCENT);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _drawBg() {
    const ctx = this.uctx;
    const W = this.ui.width, H = this.ui.height;
    const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
    grad.addColorStop(0, '#0d0d2b');
    grad.addColorStop(1, '#04040e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  _drawTitle() {
    const ctx = this.uctx;
    const W = this.ui.width, H = this.ui.height;
    ctx.textAlign  = 'center';
    ctx.font       = `900 ${clamp(W * 0.10, 40, 120)}px "Inter", sans-serif`;
    ctx.fillStyle  = COLORS.PRIMARY;
    ctx.shadowColor = COLORS.PRIMARY;
    ctx.shadowBlur = 20;
    ctx.fillText('MIRROR ME', W / 2, H * 0.18);
    ctx.shadowBlur = 0;
    ctx.fillStyle  = COLORS.SECONDARY;
    ctx.font       = `bold ${clamp(W * 0.03, 14, 36)}px "Inter", sans-serif`;
    ctx.fillText('Copy the pose. Beat the clock.', W / 2, H * 0.26);
  }

  _drawRecords() {
    const ctx = this.uctx;
    const W = this.ui.width, H = this.ui.height;
    try {
      const hs = localStorage.getItem('mirrorMe_highScore') ?? '0';
      const bs = localStorage.getItem('mirrorMe_bestStreak') ?? '0';
      ctx.fillStyle = '#555';
      ctx.font = `${clamp(W * 0.018, 11, 20)}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`High Score: ${hs}  ·  Best Streak: ${bs}`, W / 2, H * 0.90);
    } catch (_) {}
  }

  _drawProgressRing(cx, cy, r, progress, color) {
    const ctx = this.uctx;
    ctx.strokeStyle = color + '44';
    ctx.lineWidth   = 8;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _statCell(ctx, x, y, label, value, color, sf) {
    ctx.fillStyle = '#888';
    ctx.font = `${sf * 0.75}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.font = `bold ${sf * 1.5}px "Inter", sans-serif`;
    ctx.fillText(value, x, y + sf * 1.6);
    ctx.shadowBlur = 0;
  }
}
