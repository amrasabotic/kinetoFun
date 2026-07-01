import type { Collectible, Direction, Enemy, HudSnapshot, Maze, Player } from '../types/GameTypes';
import { generateMaze } from './MazeGenerator';
import { getLevelConfig } from './LevelManager';
import { createEnemy, updateEnemy, setFrightened, clearFrightened } from './EnemyAI';
import * as CS from './CollisionSystem';
import { ScoreSystem } from './ScoreSystem';
import { ParticleSystem } from './ParticleSystem';
import * as audio from './audio';
import { isAtCellCenter, isOpen, manhattan } from '../utils/grid';

export type EnginePhase = 'running' | 'levelComplete' | 'gameOver';

interface Layout {
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

export class GameEngine {
  maze!: Maze;
  player!: Player;
  enemies: Enemy[] = [];
  bonusItems: Collectible[] = [];
  score = new ScoreSystem();
  particles = new ParticleSystem();

  phase: EnginePhase = 'running';
  powerActive = false;
  powerEndsAt = 0;
  powerDuration = 0;
  private frightenedDurationMs = 8000;
  private enemySpeed = 2;

  private layout: Layout = { cellSize: 32, offsetX: 0, offsetY: 0 };
  private wallPath: Path2D | null = null;
  private viewportW = 800;
  private viewportH = 600;

  private nextGemAt = 0;
  private nextTreasureAt = 0;
  private treasureSpawned = false;

  private fpsAccum = 0;
  private fpsFrames = 0;
  private fps = 60;
  private fpsWindowStart = 0;

  loadLevel(level: number, now: number, keepScore: boolean): void {
    const cfg = getLevelConfig(level);
    this.maze = generateMaze(cfg.mazeConfig);
    this.enemySpeed = cfg.enemySpeed;
    this.frightenedDurationMs = cfg.frightenedDurationMs;

    this.player = {
      col: this.maze.playerSpawn.col,
      row: this.maze.playerSpawn.row,
      dir: 'up',
      desiredDir: null,
      speed: cfg.playerSpeed,
      lives: keepScore ? this.player?.lives ?? 3 : 3,
      invulnerableUntil: 0,
      mouthPhase: 0,
    };

    this.enemies = cfg.enemyKinds.map((kind) => createEnemy(kind, this.maze.enemyHome, this.enemySpeed));
    this.bonusItems = [];
    this.nextGemAt = now + 8000 + Math.random() * 6000;
    this.nextTreasureAt = now + 40000 + Math.random() * 20000;
    this.treasureSpawned = false;

    this.phase = 'running';
    this.powerActive = false;
    this.powerEndsAt = 0;
    this.particles.clear();

    if (!keepScore) this.score.reset(level);
    else this.score.level = level;

    this.computeLayout();
  }

  setHighScore(v: number): void {
    this.score.highScore = v;
  }

  setViewport(w: number, h: number): void {
    this.viewportW = w;
    this.viewportH = h;
    if (this.maze) this.computeLayout();
  }

  private computeLayout(): void {
    const marginFrac = 0.94;
    const cs = Math.min((this.viewportW * marginFrac) / this.maze.cols, (this.viewportH * marginFrac) / this.maze.rows);
    const cellSize = Math.max(10, cs);
    const offsetX = (this.viewportW - cellSize * this.maze.cols) / 2;
    const offsetY = (this.viewportH - cellSize * this.maze.rows) / 2;
    this.layout = { cellSize, offsetX, offsetY };
    this.wallPath = this.buildWallPath();
  }

  private toScreen(col: number, row: number): { x: number; y: number } {
    const { cellSize, offsetX, offsetY } = this.layout;
    return { x: offsetX + (col + 0.5) * cellSize, y: offsetY + (row + 0.5) * cellSize };
  }

  setDesiredDirection(dir: Direction | null): void {
    if (dir) this.player.desiredDir = dir;
  }

  update(dt: number, now: number): void {
    this.trackFps(dt, now);
    if (this.phase !== 'running') return;

    this.updatePlayer(dt);
    for (const e of this.enemies) {
      updateEnemy(e, {
        maze: this.maze,
        player: this.player,
        dt,
        frightenedSpeedMult: CS.FRIGHTENED_SPEED_MULT,
        eatenSpeedMult: CS.EATEN_SPEED_MULT,
      });
    }

    if (this.powerActive && now >= this.powerEndsAt) {
      this.powerActive = false;
      clearFrightened(this.enemies);
      this.score.chainKillCount = 0;
      audio.playPowerModeEnd();
    }

    this.spawnBonusItems(now);
    this.updateBonusPickups();

    const events: CS.CollisionEvents = {
      onPowerModeStart: () => {
        this.powerActive = true;
        this.powerDuration = this.frightenedDurationMs;
        this.powerEndsAt = now + this.frightenedDurationMs;
        setFrightened(this.enemies);
      },
      onPlayerHit: () => {
        /* SFX/particles already triggered inside CollisionSystem */
      },
      onLifeLost: (livesRemaining) => {
        if (livesRemaining <= 0) {
          this.phase = 'gameOver';
          audio.playGameOver();
          if (this.score.score > this.score.highScore) this.score.highScore = this.score.score;
        }
      },
      onOrbsDepleted: () => {
        this.phase = 'levelComplete';
        audio.playLevelComplete();
        const center = this.toScreen(this.maze.cols / 2, this.maze.rows / 2);
        this.particles.confetti(center.x, center.y);
      },
    };

    CS.checkCollectibles(this.player, this.maze, this.score, this.particles, (c, r) => this.toScreen(c, r), events);
    CS.checkEnemyCollisions(this.player, this.enemies, this.score, this.particles, now, (c, r) => this.toScreen(c, r), events);

    this.particles.update(dt);
  }

  private trackFps(dt: number, now: number): void {
    this.fpsAccum += dt;
    this.fpsFrames++;
    if (now - this.fpsWindowStart > 500) {
      this.fps = this.fpsFrames / Math.max(this.fpsAccum, 0.0001);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
      this.fpsWindowStart = now;
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    const maze = this.maze;

    if (isAtCellCenter(p.col) && isAtCellCenter(p.row)) {
      const col = Math.round(p.col);
      const row = Math.round(p.row);
      p.col = col;
      p.row = row;

      if (p.desiredDir && isOpen(maze, col, row, p.desiredDir)) {
        p.dir = p.desiredDir;
      } else if (!isOpen(maze, col, row, p.dir)) {
        // Wall ahead and no valid buffered turn — hold position at the intersection.
        return;
      }
    }

    const moving = isOpen(maze, Math.round(p.col), Math.round(p.row), p.dir) || !isAtCellCenter(p.col) || !isAtCellCenter(p.row);
    if (!moving) return;

    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir];
    p.col += v[0] * p.speed * dt;
    p.row += v[1] * p.speed * dt;
    p.mouthPhase += dt * 9;

    if (Math.round(p.row) === maze.warpRow) {
      if (p.col < -0.5) p.col = maze.cols - 0.5;
      if (p.col > maze.cols - 0.5) p.col = -0.5;
    }
  }

  private spawnBonusItems(now: number): void {
    if (now >= this.nextGemAt && this.bonusItems.filter((b) => b.kind === 'gem').length === 0) {
      const cell = this.randomOpenCell();
      if (cell) {
        this.bonusItems.push({ id: -Date.now(), kind: 'gem', col: cell.col, row: cell.row, collected: false, expiresAt: now + 6000 });
      }
      this.nextGemAt = now + 14000 + Math.random() * 10000;
    }
    if (!this.treasureSpawned && now >= this.nextTreasureAt) {
      const cell = this.randomOpenCell();
      if (cell) {
        this.bonusItems.push({ id: -Date.now() - 1, kind: 'treasure', col: cell.col, row: cell.row, collected: false, expiresAt: now + 5000 });
        this.treasureSpawned = true;
      }
    }
    this.bonusItems = this.bonusItems.filter((b) => !b.collected && (b.expiresAt ?? Infinity) > now);
  }

  private randomOpenCell(): { col: number; row: number } | null {
    const maze = this.maze;
    for (let attempt = 0; attempt < 40; attempt++) {
      const col = Math.floor(Math.random() * maze.cols);
      const row = Math.floor(Math.random() * maze.rows);
      if (manhattan({ col, row }, maze.enemyHome) < 2) continue;
      if (manhattan({ col, row }, maze.playerSpawn) < 1) continue;
      return { col, row };
    }
    return null;
  }

  private updateBonusPickups(): void {
    for (const b of this.bonusItems) {
      if (b.collected) continue;
      const d = Math.hypot(this.player.col - b.col, this.player.row - b.row);
      if (d > CS.COLLECT_RADIUS) continue;
      b.collected = true;
      const pos = this.toScreen(b.col, b.row);
      if (b.kind === 'gem') {
        this.score.addPoints(100);
        audio.playGem();
        this.particles.burstPower(pos.x, pos.y, '#ffd23f');
      } else {
        this.score.addPoints(500);
        audio.playTreasure();
        this.particles.burstPower(pos.x, pos.y, '#ff2ecb');
      }
    }
  }

  getHud(now: number, handDetected: boolean, paused: boolean): HudSnapshot {
    const total = this.maze.collectibles.length;
    const remaining = this.maze.collectibles.filter((c) => !c.collected).length;
    return {
      score: this.score.score,
      lives: this.player.lives,
      level: this.score.level,
      comboMultiplier: this.score.comboMultiplier,
      powerActive: this.powerActive,
      powerRemainingMs: Math.max(0, this.powerEndsAt - now),
      powerDuration: this.powerDuration,
      orbsRemaining: remaining,
      orbsTotal: total,
      fps: Math.round(this.fps),
      handDetected,
      highScore: Math.max(this.score.highScore, this.score.score),
      paused,
    };
  }

  private buildWallPath(): Path2D {
    const path = new Path2D();
    const { cellSize } = this.layout;
    const maze = this.maze;
    for (let row = 0; row < maze.rows; row++) {
      for (let col = 0; col < maze.cols; col++) {
        const cell = maze.cells[row][col];
        const x0 = this.layout.offsetX + col * cellSize;
        const y0 = this.layout.offsetY + row * cellSize;
        const x1 = x0 + cellSize;
        const y1 = y0 + cellSize;
        if (cell.up) {
          path.moveTo(x0, y0);
          path.lineTo(x1, y0);
        }
        if (cell.left) {
          path.moveTo(x0, y0);
          path.lineTo(x0, y1);
        }
        if (row === maze.rows - 1 && cell.down) {
          path.moveTo(x0, y1);
          path.lineTo(x1, y1);
        }
        if (col === maze.cols - 1 && cell.right) {
          path.moveTo(x1, y0);
          path.lineTo(x1, y1);
        }
      }
    }
    return path;
  }

  render(ctx: CanvasRenderingContext2D, now: number): void {
    const { cellSize } = this.layout;
    const maze = this.maze;
    const w = this.viewportW;
    const h = this.viewportH;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, maze.theme.bgTop);
    grad.addColorStop(1, maze.theme.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Risk zone — subtle warning tint around the enemy base.
    const home = this.toScreen(maze.enemyHome.col, maze.enemyHome.row);
    const riskR = cellSize * 2.6;
    const riskGrad = ctx.createRadialGradient(home.x, home.y, 0, home.x, home.y, riskR);
    riskGrad.addColorStop(0, 'rgba(255,40,60,0.16)');
    riskGrad.addColorStop(1, 'rgba(255,40,60,0)');
    ctx.fillStyle = riskGrad;
    ctx.beginPath();
    ctx.arc(home.x, home.y, riskR, 0, Math.PI * 2);
    ctx.fill();

    if (this.wallPath) {
      ctx.save();
      ctx.strokeStyle = maze.theme.pathColor;
      ctx.lineWidth = Math.max(2, cellSize * 0.09);
      ctx.lineCap = 'round';
      ctx.shadowColor = maze.theme.glowColor;
      ctx.shadowBlur = cellSize * 0.5;
      ctx.stroke(this.wallPath);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    this.renderCollectibles(ctx, maze.collectibles, now);
    this.renderCollectibles(ctx, this.bonusItems, now);
    this.renderEnemies(ctx, now);
    this.renderPlayer(ctx, now);
    this.particles.render(ctx);
  }

  private renderCollectibles(ctx: CanvasRenderingContext2D, list: Collectible[], now: number): void {
    const { cellSize } = this.layout;
    for (const c of list) {
      if (c.collected) continue;
      const { x, y } = this.toScreen(c.col, c.row);
      ctx.save();
      if (c.kind === 'orb') {
        ctx.fillStyle = this.maze.theme.pathColor;
        ctx.shadowColor = this.maze.theme.glowColor;
        ctx.shadowBlur = cellSize * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.09, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.kind === 'power') {
        const pulse = 0.75 + Math.sin(now / 140) * 0.25;
        ctx.fillStyle = this.maze.theme.accent;
        ctx.shadowColor = this.maze.theme.accent;
        ctx.shadowBlur = cellSize * 0.6;
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.22 * pulse, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.kind === 'gem') {
        const flicker = (c.expiresAt ?? 0) - now < 1500 ? (Math.floor(now / 150) % 2 === 0 ? 1 : 0.3) : 1;
        ctx.globalAlpha = flicker;
        ctx.fillStyle = '#ffd23f';
        ctx.shadowColor = '#ffd23f';
        ctx.shadowBlur = cellSize * 0.4;
        drawDiamond(ctx, x, y, cellSize * 0.22);
      } else {
        ctx.fillStyle = '#ff2ecb';
        ctx.shadowColor = '#ff2ecb';
        ctx.shadowBlur = cellSize * 0.55;
        drawStar(ctx, x, y, cellSize * 0.26);
      }
      ctx.restore();
    }
  }

  private renderEnemies(ctx: CanvasRenderingContext2D, now: number): void {
    const { cellSize } = this.layout;
    for (const e of this.enemies) {
      const { x, y } = this.toScreen(e.col, e.row);
      const r = cellSize * 0.36;
      ctx.save();
      if (e.mode === 'eaten') {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y, r * 0.16, 0, Math.PI * 2);
        ctx.arc(x + r * 0.3, y, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }
      const frightenedEnding = this.powerActive && this.powerEndsAt - now < 2000;
      const color = e.mode === 'frightened' ? (frightenedEnding && Math.floor(now / 160) % 2 === 0 ? '#ffffff' : '#3a5cff') : e.color;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = cellSize * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI, 0);
      ctx.lineTo(x + r, y + r * 0.7);
      for (let i = 0; i < 4; i++) {
        const wobX = x + r - (i * (2 * r)) / 4;
        ctx.quadraticCurveTo(wobX - r / 4, y + (i % 2 === 0 ? r : r * 0.4), wobX - r / 2, y + r * 0.7);
      }
      ctx.lineTo(x - r, y);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = e.mode === 'frightened' ? '#ffffff' : '#0a0f1a';
      ctx.beginPath();
      ctx.arc(x - r * 0.32, y - r * 0.15, r * 0.18, 0, Math.PI * 2);
      ctx.arc(x + r * 0.32, y - r * 0.15, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, now: number): void {
    const p = this.player;
    const invuln = now < p.invulnerableUntil;
    if (invuln && Math.floor(now / 100) % 2 === 0) return;

    const { x, y } = this.toScreen(p.col, p.row);
    const { cellSize } = this.layout;
    const r = cellSize * 0.4;
    const mouthOpen = Math.abs(Math.sin(p.mouthPhase)) * 0.5 + 0.05;
    const rot = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[p.dir];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#39ff88';
    ctx.shadowColor = '#39ff88';
    ctx.shadowBlur = cellSize * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, mouthOpen, Math.PI * 2 - mouthOpen);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? size : size * 0.45;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
