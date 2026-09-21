import { Projectile, Shield, Player, GameStats, HandPosition, Level } from '../types/game';
import { GAME_CONFIG, COLORS } from '../constants/game';

export class GameEngine {
  private projectiles: Projectile[] = [];
  private player: Player;
  private shield: Shield;
  private width: number;
  private height: number;
  private projectileId = 0;
  private lastSpawn = 0;
  private currentLevel: Level | null = null;
  private gameTime = 0;
  private levelStartTime = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.player = {
      x: width / 2,
      y: height / 2,
      radius: GAME_CONFIG.PLAYER_RADIUS,
      health: GAME_CONFIG.MAX_HEALTH,
      maxHealth: GAME_CONFIG.MAX_HEALTH
    };
    this.shield = {
      angle: 0,
      arcLength: GAME_CONFIG.SHIELD_ARC_LENGTH,
      radius: GAME_CONFIG.SHIELD_RADIUS
    };
  }

  setLevel(level: Level): void {
    this.currentLevel = level;
    this.levelStartTime = Date.now();
    this.player.health = this.player.maxHealth;
    this.projectiles = [];
    this.gameTime = 0;
  }

  reset(): void {
    this.projectiles = [];
    this.player.health = this.player.maxHealth;
    this.gameTime = 0;
    this.lastSpawn = 0;
    this.projectileId = 0;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.player.x = width / 2;
    this.player.y = height / 2;
  }

  update(handPosition: HandPosition, deltaTime: number, stats: GameStats): { hits: number; starHits: number; starBlocked: number } {
    this.gameTime += deltaTime;

    if (handPosition.detected) {
      this.shield.angle = handPosition.angle;
    }

    const spawnRate = this.currentLevel
      ? this.currentLevel.spawnRate
      : Math.max(500, GAME_CONFIG.BASE_SPAWN_RATE - stats.level * 100);

    if (Date.now() - this.lastSpawn > spawnRate) {
      this.spawnProjectile();
      this.lastSpawn = Date.now();
    }

    this.updateProjectiles();

    return this.checkCollisions(stats);
  }

  private spawnProjectile(): void {
    const angle = Math.random() * Math.PI * 2;

    const speedMultiplier = this.currentLevel
      ? this.currentLevel.speedMultiplier
      : 1 + this.gameTime / 60000;

    const starChance = this.currentLevel
      ? this.currentLevel.starChance
      : 0.18;

    const isStar = Math.random() < starChance;

    const projectile: Projectile = {
      id: this.projectileId++,
      x: this.player.x + Math.cos(angle) * GAME_CONFIG.SPAWN_DISTANCE,
      y: this.player.y + Math.sin(angle) * GAME_CONFIG.SPAWN_DISTANCE,
      angle: Math.atan2(
        this.player.y - (this.player.y + Math.sin(angle) * GAME_CONFIG.SPAWN_DISTANCE),
        this.player.x - (this.player.x + Math.cos(angle) * GAME_CONFIG.SPAWN_DISTANCE)
      ),
      speed: (GAME_CONFIG.PROJECTILE_BASE_SPEED + Math.random() * 1.5) * speedMultiplier,
      type: isStar ? 'star' : 'apple',
      radius: isStar ? GAME_CONFIG.STAR_RADIUS : GAME_CONFIG.APPLE_RADIUS,
      active: true,
      bounced: false
    };

    this.projectiles.push(projectile);
  }

  private updateProjectiles(): void {
    this.projectiles.forEach(p => {
      if (p.active) {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
      }
    });

    this.projectiles = this.projectiles.filter(p =>
      p.active && this.isInBounds(p)
    );
  }

  private isInBounds(p: Projectile): boolean {
    const margin = 100;
    return p.x > -margin && p.x < this.width + margin &&
           p.y > -margin && p.y < this.height + margin;
  }

  private checkCollisions(stats: GameStats): { hits: number; starHits: number; starBlocked: number } {
    let hits = 0;
    let starHits = 0;
    let starBlocked = 0;

    this.projectiles.forEach(p => {
      if (!p.active) return;

      const dx = p.x - this.player.x;
      const dy = p.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const projectileAngle = Math.atan2(dy, dx);
      const normalizedProjectile = projectileAngle < 0 ? projectileAngle + Math.PI * 2 : projectileAngle;

      let shieldStart = this.shield.angle - this.shield.arcLength / 2;
      let shieldEnd = this.shield.angle + this.shield.arcLength / 2;
      while (shieldStart < 0) shieldStart += Math.PI * 2;
      while (shieldEnd < 0) shieldEnd += Math.PI * 2;

      let inShieldArc = false;
      if (shieldStart < shieldEnd) {
        inShieldArc = normalizedProjectile >= shieldStart && normalizedProjectile <= shieldEnd;
      } else {
        inShieldArc = normalizedProjectile >= shieldStart || normalizedProjectile <= shieldEnd;
      }

      const shieldInnerRadius = this.shield.radius - 15;
      const shieldOuterRadius = this.shield.radius + 15;

      const isAtShieldRadius = dist >= shieldInnerRadius - p.radius && dist <= shieldOuterRadius + p.radius;

      if (isAtShieldRadius && inShieldArc && !p.bounced) {
        if (p.type === 'star') {
          starBlocked++;
          stats.score += GAME_CONFIG.BLOCK_POINTS;
        } else {
          stats.applesBlocked++;
          stats.score += GAME_CONFIG.BLOCK_POINTS;
        }

        const normalX = Math.cos(projectileAngle);
        const normalY = Math.sin(projectileAngle);
        const incomingDirX = Math.cos(p.angle);
        const incomingDirY = Math.sin(p.angle);
        const dotProduct = incomingDirX * normalX + incomingDirY * normalY;
        const reflectedX = incomingDirX - 2 * dotProduct * normalX;
        const reflectedY = incomingDirY - 2 * dotProduct * normalY;

        p.angle = Math.atan2(reflectedY, reflectedX);

        const targetDist = shieldOuterRadius + p.radius + 5;
        p.x = this.player.x + Math.cos(projectileAngle) * targetDist;
        p.y = this.player.y + Math.sin(projectileAngle) * targetDist;

        p.bounced = true;
        return;
      }

      if (dist <= this.player.radius + p.radius) {
        if (p.type === 'star') {
          starHits++;
          stats.starsCollected++;
          stats.score += GAME_CONFIG.STAR_POINTS;
          p.active = false;
        } else {
          hits++;
          this.player.health--;
          p.active = false;
        }
      }
    });

    return { hits, starHits, starBlocked };
  }

  isGameOver(): boolean {
    return this.player.health <= 0;
  }

  isLevelComplete(): boolean {
    if (!this.currentLevel) return false;
    return Date.now() - this.levelStartTime >= this.currentLevel.duration;
  }

  getProgress(): number {
    if (!this.currentLevel) return 0;
    const elapsed = Date.now() - this.levelStartTime;
    return Math.min(1, elapsed / this.currentLevel.duration);
  }

  render(ctx: CanvasRenderingContext2D, damageActive = false): void {
    ctx.fillStyle = COLORS.ARENA;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawArena(ctx);
    this.drawGuideCircle(ctx);
    this.drawProjectiles(ctx);
    this.drawPlayer(ctx, damageActive);
    this.drawShield(ctx);
  }

  private drawArena(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.player.x, this.player.y, 0,
      this.player.x, this.player.y, 300
    );
    gradient.addColorStop(0, 'rgba(78, 204, 167, 0.15)');
    gradient.addColorStop(0.5, 'rgba(78, 204, 167, 0.05)');
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, 300, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(78, 204, 167, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, i * 75, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawGuideCircle(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = COLORS.GUIDE_CIRCLE;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, GAME_CONFIG.GUIDE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = this.player.x + Math.cos(angle) * GAME_CONFIG.GUIDE_RADIUS;
      const y = this.player.y + Math.sin(angle) * GAME_CONFIG.GUIDE_RADIUS;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.fill();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, damageActive = false): void {
    const shake = damageActive ? (Math.random() - 0.5) * 10 : 0;
    const px = this.player.x + shake;
    const py = this.player.y;

    // Red glow ring on damage
    if (damageActive) {
      const pulseSize = this.player.radius * 3.5;
      const redGlow = ctx.createRadialGradient(px, py, this.player.radius, px, py, pulseSize);
      redGlow.addColorStop(0, 'rgba(255, 50, 50, 0.55)');
      redGlow.addColorStop(0.5, 'rgba(255, 50, 50, 0.2)');
      redGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = redGlow;
      ctx.beginPath();
      ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
      ctx.fill();
    }

    const glowGradient = ctx.createRadialGradient(px, py, 0, px, py, this.player.radius * 1.5);
    glowGradient.addColorStop(0, damageActive ? '#ff4444' : COLORS.PLAYER_GLOW);
    glowGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(px, py, this.player.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = damageActive ? '#cc2020' : COLORS.PLAYER;
    ctx.beginPath();
    ctx.arc(px, py, this.player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = damageActive ? '#ff6666' : COLORS.PLAYER_GLOW;
    ctx.beginPath();
    ctx.arc(px, py, this.player.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.PLAYER;
    ctx.beginPath();
    ctx.arc(px - 6, py - 6, 4, 0, Math.PI * 2);
    ctx.arc(px + 6, py - 6, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLORS.PLAYER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py + 8, 8, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  private drawShield(ctx: CanvasRenderingContext2D): void {
    const startAngle = this.shield.angle - this.shield.arcLength / 2;
    const endAngle = this.shield.angle + this.shield.arcLength / 2;

    ctx.strokeStyle = COLORS.SHIELD_GLOW;
    ctx.lineWidth = 25;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.shield.radius, startAngle, endAngle);
    ctx.stroke();

    ctx.strokeStyle = COLORS.SHIELD;
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.shield.radius, startAngle, endAngle);
    ctx.stroke();

    ctx.strokeStyle = '#7df9ff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.shield.radius, startAngle, endAngle);
    ctx.stroke();

    const midAngle = this.shield.angle;
    const tipX = this.player.x + Math.cos(midAngle) * this.shield.radius;
    const tipY = this.player.y + Math.sin(midAngle) * this.shield.radius;

    ctx.beginPath();
    ctx.arc(tipX, tipY, 8, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.GUIDE_DOT;
    ctx.fill();

    ctx.lineCap = 'butt';
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D): void {
    this.projectiles.forEach(p => {
      if (!p.active) return;

      if (p.type === 'apple') {
        this.drawApple(ctx, p);
      } else {
        this.drawStar(ctx, p);
      }
    });
  }

  private drawApple(ctx: CanvasRenderingContext2D, p: Projectile): void {
    const gradient = ctx.createRadialGradient(
      p.x - 5, p.y - 5, 0,
      p.x, p.y, p.radius
    );
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.7, COLORS.APPLE);
    gradient.addColorStop(1, '#cc2936');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.APPLE_STEM;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.radius);
    ctx.quadraticCurveTo(p.x + 3, p.y - p.radius - 8, p.x + 6, p.y - p.radius - 5);
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLORS.APPLE_STEM;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(p.x - 5, p.y - 5, 4, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D, p: Projectile): void {
    const glowGradient = ctx.createRadialGradient(
      p.x, p.y, 0,
      p.x, p.y, p.radius * 2
    );
    glowGradient.addColorStop(0, COLORS.STAR_GLOW);
    glowGradient.addColorStop(0.5, 'rgba(255, 234, 0, 0.3)');
    glowGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.STAR;
    ctx.beginPath();

    const spikes = 5;
    const outerRadius = p.radius;
    const innerRadius = p.radius * 0.5;
    const rotation = Date.now() * 0.002;

    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI / spikes) - Math.PI / 2 + rotation;
      const x = p.x + Math.cos(angle) * radius;
      const y = p.y + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(p.x, p.y - p.radius * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  getHealth(): number {
    return this.player.health;
  }

  getMaxHealth(): number {
    return this.player.maxHealth;
  }
}
