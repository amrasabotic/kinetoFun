import {
  REF_H, GROUND_FRAC, PLAYER_X_FRAC, GRAVITY, SPEAR_V_MIN, SPEAR_V_MAX, QUICK_POWER,
  MIN_THROW_POWER, CHARGE_MS, THROW_COOLDOWN_MS, AIM_MIN_DEG, AIM_MAX_DEG,
  ENEMY_SPEAR_V, ENEMY_WINDUP_MS, SWIPE_VX, DODGE_MS, DODGE_COOLDOWN_MS, HIT_IFRAME_MS,
  BODY_POINTS, HEAD_POINTS, AIRBORNE_BONUS, LONG_BONUS, COMBO_MAX, WAVE_CLEAR_BONUS,
  PERFECT_WAVE_BONUS, COIN_PER_KILL, COIN_PER_HEAD, BOSS_COINS, POWERUP_DROP_CHANCE,
  type Settings,
} from '../utils/constants';
import { isFist, isPinching, clamp, smooth, DEG, type Landmark } from '../utils/gestures';
import { STATS, buildWave, isBossWave, type EnemyKind, type EnemyStat, type WavePlan } from '../data/enemies';
import { ARENAS, arenaForWave, type ArenaDef } from '../data/arenas';
import type { ModeDef } from '../data/modes';
import type { SkinDef } from '../data/skins';
import * as snd from '../utils/audio';

export type PowerType = 'triple' | 'pierce' | 'explosive' | 'slowmo' | 'shield' | 'rapid';

export const POWERUPS: Record<PowerType, { emoji: string; color: string; name: string; ms: number }> = {
  triple:    { emoji: '🔱', color: '#f59e0b', name: 'Triple Spear', ms: 12000 },
  pierce:    { emoji: '🏹', color: '#60a5fa', name: 'Piercing',     ms: 12000 },
  explosive: { emoji: '💥', color: '#ef4444', name: 'Explosive',    ms: 11000 },
  slowmo:    { emoji: '🐌', color: '#a78bfa', name: 'Slow-Mo',      ms: 8000 },
  shield:    { emoji: '🛡️', color: '#34d399', name: 'Shield',       ms: 10000 },
  rapid:     { emoji: '⚡', color: '#fbbf24', name: 'Rapid Throw',  ms: 10000 },
};
const POWER_KEYS: PowerType[] = ['triple', 'pierce', 'explosive', 'slowmo', 'shield', 'rapid'];

export interface RunResult {
  modeId: string;
  reason: string;
  score: number;
  wave: number;
  kills: number;
  headshots: number;
  bossKills: number;
  maxCombo: number;
  perfectWaves: number;
  coinsEarned: number;
  accuracy: number;
  shots: number;
}

export interface PowerHud { type: PowerType; frac: number; }

export interface HudState {
  hearts: number;
  maxHearts: number;
  wave: number;
  score: number;
  combo: number;
  coins: number;
  timeLeft: number;          // seconds, -1 if no limit
  handDetected: boolean;
  chargeP: number;           // 0..1 while charging, -1 otherwise
  throwReady: boolean;
  dodgeReady: boolean;
  powerups: PowerHud[];
  bossHp: number;            // 0..1, -1 if no boss
  bossName: string;
  banner: string | null;
  bannerKind: 'wave' | 'good' | 'bad';
  mode: 'play' | 'paused' | 'over';
  modeName: string;
  leftHanded: boolean;
  hint: string;
}

interface Enemy {
  id: number;
  kind: EnemyKind;
  stat: EnemyStat;
  x: number; y: number;        // feet (screen px)
  baseY: number;               // ground/platform surface
  vx: number; vy: number;
  hp: number; maxHp: number;
  facing: -1 | 1;
  phase: number;
  platformIdx: number;
  airborne: boolean;
  jumpCd: number;
  teleportCd: number;
  standoff: number;            // x to stop at (ranged), -1 = march to player
  windup: number;              // ms remaining in throw wind-up, -1 = none
  throwTimer: number;
  hitFlash: number;
  alive: boolean;
}

interface PSpear {
  x: number; y: number; vx: number; vy: number;
  pierce: number; explosive: boolean;
  stuck: boolean; stuckMs: number;
  trail: { x: number; y: number }[];
  hits: Set<number>;
}
interface ESpear { x: number; y: number; vx: number; vy: number; boss: boolean; }
interface Pickup { x: number; y: number; vy: number; type: PowerType | 'heart'; phase: number; collected: boolean; }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; }
interface Float { x: number; y: number; vy: number; life: number; text: string; color: string; size: number; }
interface Boom { x: number; y: number; r: number; maxR: number; life: number; }

export class GameEngine {
  private mode: ModeDef;
  private skin: SkinDef;
  private settings: Settings;
  private onComplete: (r: RunResult) => void;

  cw = 960; ch = 600; U = 1;
  state: 'play' | 'paused' | 'over' = 'play';

  // layout
  private groundY = 500;
  private mx = 110; private my = 440;   // player muzzle
  private platforms: { fx: number; fy: number; fw: number }[] = [];

  // run stats
  private hearts: number;
  private score = 0;
  private coins = 0;
  private combo = 1;
  private maxCombo = 1;
  private kills = 0;
  private headshots = 0;
  private bossKills = 0;
  private perfectWaves = 0;
  private shots = 0;
  private hitsLanded = 0;
  private iframe = 0;

  // wave
  private wave = 0;
  private plan: WavePlan | null = null;
  private spawnIdx = 0;
  private waveTimer = 0;
  private waveCleared = false;
  private intermission = 0;
  private tookDamage = false;
  private arena: ArenaDef = ARENAS[0];

  // time
  private timeLeftMs: number;
  private t = 0;

  // entities
  private enemies: Enemy[] = [];
  private pspears: PSpear[] = [];
  private espears: ESpear[] = [];
  private pickups: Pickup[] = [];
  private booms: Boom[] = [];
  private sparks: Spark[] = [];
  private floats: Float[] = [];
  private nextId = 1;

  // aim / charge
  private hx = 0.5; private hy = 0.4;
  private aimAngle = -45 * DEG;
  private charging = false;
  private chargeP = 0;
  private throwCd = 0;
  private prevPinch = false;
  handDetected = false;

  // dodge
  private prevCursorX = 0.5;
  private dodgeMs = 0;
  private dodgeCd = 0;

  // powerups
  private power: Record<PowerType, number> = { triple: 0, pierce: 0, explosive: 0, slowmo: 0, shield: 0, rapid: 0 };

  // boss
  private boss: Enemy | null = null;
  private bossSpecialCd = 0;

  // effects / fx state
  private shakeMs = 0; private shakeMag = 0;
  private hurtFlash = 0;
  private slowFinish = 0;
  private banner: string | null = null;
  private bannerMs = 0;
  private bannerKind: 'wave' | 'good' | 'bad' = 'wave';
  private hint = '';
  private finished = false;

  constructor(mode: ModeDef, skin: SkinDef, settings: Settings, onComplete: (r: RunResult) => void) {
    this.mode = mode;
    this.skin = skin;
    this.settings = settings;
    this.onComplete = onComplete;
    this.hearts = mode.hearts;
    this.timeLeftMs = mode.timeLimitSec > 0 ? mode.timeLimitSec * 1000 : -1;
    this.startWave(1);
  }

  resize(cw: number, ch: number) {
    this.cw = cw; this.ch = ch; this.U = ch / REF_H;
    this.groundY = ch * GROUND_FRAC;
    this.mx = cw * PLAYER_X_FRAC;
    this.my = this.groundY - 64 * this.U;
  }
  setSettings(s: Settings) { this.settings = s; }
  pause() { if (this.state === 'play') this.state = 'paused'; }
  resume() { if (this.state === 'paused') this.state = 'play'; }

  // ── wave control ──────────────────────────────────────────────────────────────
  private startWave(wave: number) {
    this.wave = wave;
    this.arena = arenaForWave(wave);
    this.plan = buildWave(wave, Math.random);
    this.spawnIdx = 0;
    this.waveTimer = 0;
    this.waveCleared = false;
    this.tookDamage = false;
    this.boss = null;
    this.genPlatforms();
    if (isBossWave(wave)) { this.setBanner(`BOSS — Wave ${wave}`, 2400, 'bad'); snd.playBossRoar(); }
    else this.setBanner(`Wave ${wave}`, 1700, 'wave');
  }

  private genPlatforms() {
    const r = () => Math.random();
    this.platforms = [
      { fx: 0.42 + r() * 0.06, fy: 0.40 + r() * 0.06, fw: 0.13 },
      { fx: 0.66 + r() * 0.06, fy: 0.52 + r() * 0.05, fw: 0.12 },
      { fx: 0.78 + r() * 0.05, fy: 0.32 + r() * 0.05, fw: 0.10 },
    ];
  }

  private platformY(idx: number) { return this.platforms[idx].fy * this.ch; }

  // ── update ──────────────────────────────────────────────────────────────────
  update(dt: number, hand: { detected: boolean; cursorX: number; cursorY: number; landmarks: Landmark[] }) {
    this.t += dt;
    this.handDetected = hand.detected;
    if (this.state !== 'play' || this.finished) { this.decayEffects(dt); return; }

    this.updateAimAndInput(dt, hand);

    // world time scale (slow-mo powerup or boss-defeat finish)
    let ts = 1;
    if (this.power.slowmo > 0) ts *= 0.5;
    if (this.slowFinish > 0) { ts *= 0.32; this.slowFinish = Math.max(0, this.slowFinish - dt); }
    const wdt = dt * ts;

    this.updateSpawns(dt);
    this.updateEnemies(wdt);
    this.updatePlayerSpears(wdt);
    this.updateEnemySpears(wdt);
    this.updatePickups(wdt);
    this.updateBooms(wdt);
    this.decayEffects(dt);

    // timers
    for (const k of POWER_KEYS) this.power[k] = Math.max(0, this.power[k] - dt);
    this.iframe = Math.max(0, this.iframe - dt);
    this.dodgeMs = Math.max(0, this.dodgeMs - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    if (this.bannerMs > 0) { this.bannerMs -= dt; if (this.bannerMs <= 0) this.banner = null; }

    this.checkWaveProgress(dt);

    // time-attack clock
    if (this.timeLeftMs >= 0) {
      this.timeLeftMs -= dt;
      if (this.timeLeftMs <= 0) { this.timeLeftMs = 0; this.over("Time's up"); }
    }
  }

  private updateAimAndInput(dt: number, hand: { detected: boolean; cursorX: number; cursorY: number; landmarks: Landmark[] }) {
    if (hand.detected) {
      const s = this.settings.sensitivity;
      const tx = clamp(0.5 + (hand.cursorX - 0.5) * s, 0, 1);
      const ty = clamp(0.5 + (hand.cursorY - 0.5) * s, 0, 1);
      const a = this.settings.smoothing;
      this.hx = smooth(this.hx, tx, a);
      this.hy = smooth(this.hy, ty, a);

      // aim angle from muzzle to reticle, forced rightward + clamped elevation
      const rx = this.hx * this.cw, ry = this.hy * this.ch;
      const dx = Math.max(18 * this.U, rx - this.mx);
      const dy = ry - this.my;
      this.aimAngle = clamp(Math.atan2(dy, dx), AIM_MIN_DEG * DEG, AIM_MAX_DEG * DEG);

      // dodge swipe
      const vx = hand.cursorX - this.prevCursorX;
      if (Math.abs(vx) > SWIPE_VX && this.dodgeCd <= 0) {
        this.dodgeMs = DODGE_MS; this.dodgeCd = DODGE_COOLDOWN_MS; snd.playDodge();
      }
      this.prevCursorX = hand.cursorX;
    }

    // throw input
    this.throwCd = Math.max(0, this.throwCd - dt);
    const lm = hand.landmarks;
    const fist = hand.detected && this.settings.throwMode !== 'quick' && lm.length >= 21 && isFist(lm);
    const pinch = hand.detected && this.settings.throwMode !== 'charge' && lm.length >= 9 && !isFist(lm) && isPinching(lm);
    const cd = this.power.rapid > 0 ? THROW_COOLDOWN_MS * 0.4 : THROW_COOLDOWN_MS;

    // charge (fist hold → release)
    if (fist) {
      if (!this.charging) { this.charging = true; this.chargeP = 0; snd.playCharge(); }
      const rate = this.power.rapid > 0 ? 1.8 : 1;
      this.chargeP = Math.min(1, this.chargeP + (dt / CHARGE_MS) * rate);
    } else if (this.charging) {
      this.charging = false;
      if (this.throwCd <= 0) { this.throw(Math.max(MIN_THROW_POWER, this.chargeP)); this.throwCd = cd; }
      this.chargeP = 0;
    }

    // quick pinch throw
    if (pinch && !this.prevPinch && !this.charging && this.throwCd <= 0) {
      this.throw(QUICK_POWER); this.throwCd = cd;
    }
    this.prevPinch = pinch;

    // hint text
    if (!hand.detected) this.hint = 'Show your hand to the camera';
    else if (this.charging) this.hint = 'Release to throw';
    else if (this.settings.throwMode === 'quick') this.hint = 'Pinch to throw';
    else this.hint = 'Make a fist to charge · release to throw';
  }

  private throw(power: number) {
    this.shots++;
    const v = (SPEAR_V_MIN + power * (SPEAR_V_MAX - SPEAR_V_MIN)) * this.U;
    let ang = this.aimAngle;
    if (this.settings.aimAssist) ang = this.assistAngle(ang, v);
    const make = (a: number) => {
      const sp: PSpear = {
        x: this.mx + Math.cos(a) * 30 * this.U,
        y: this.my + Math.sin(a) * 30 * this.U,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        pierce: this.power.pierce > 0 ? 4 : 0,
        explosive: this.power.explosive > 0,
        stuck: false, stuckMs: 0, trail: [], hits: new Set(),
      };
      this.pspears.push(sp);
    };
    make(ang);
    if (this.power.triple > 0) { make(ang - 9 * DEG); make(ang + 9 * DEG); }
    this.shakeMs = 90; this.shakeMag = 3 * this.U;
    snd.playThrow(power);
  }

  /** Pick the nearest enemy within a cone of the aim, then solve the launch
   *  angle that actually lands on its head for the current throw speed `v`
   *  (a straight-line snap would fall short because spears arc under gravity). */
  private assistAngle(ang: number, v: number): number {
    const g = GRAVITY * this.U;
    let target: Enemy | null = null; let tErr = 42 * DEG;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const h = this.headPos(e);
      const x = h.x - this.mx;
      if (x <= 12 * this.U) continue;
      const err = Math.abs(Math.atan2(h.y - this.my, x) - ang);
      if (err < tErr) { tErr = err; target = e; }
    }
    if (!target) return ang;
    const h = this.headPos(target);
    const sol = this.ballisticAngle(h.x - this.mx, h.y - this.my, v, g);
    return sol === null ? ang : clamp(sol, AIM_MIN_DEG * DEG, AIM_MAX_DEG * DEG);
  }

  /** Launch angle (flatter of the two arcs) to hit (x,y) — screen coords, y down —
   *  at speed v under gravity g. Returns null if the target is out of range. */
  private ballisticAngle(x: number, y: number, v: number, g: number): number | null {
    if (x <= 0) return null;
    // y = x·tanθ + k(1 + tan²θ),  k = g·x²/2v²  →  k·T² + x·T + (k − y) = 0
    const k = (g * x * x) / (2 * v * v);
    const disc = x * x - 4 * k * (k - y);
    if (disc < 0) return null;          // out of range for this throw speed
    const t = (-x + Math.sqrt(disc)) / (2 * k);   // flatter of the two arcs
    return Math.atan(t);
  }

  // ── spawning ────────────────────────────────────────────────────────────────
  private updateSpawns(dt: number) {
    if (!this.plan) return;
    this.waveTimer += dt;
    while (this.spawnIdx < this.plan.entries.length && this.plan.entries[this.spawnIdx].atMs <= this.waveTimer) {
      this.spawnEnemy(this.plan.entries[this.spawnIdx].kind);
      this.spawnIdx++;
    }
  }

  private spawnEnemy(kind: EnemyKind) {
    const stat = STATS[kind];
    const onPlatform = stat.prefersPlatform && this.platforms.length > 0 && Math.random() < 0.7 && kind !== 'boss';
    let x = this.cw * (1.0 + Math.random() * 0.06);
    let baseY = this.groundY;
    let platformIdx = -1;
    if (onPlatform) {
      platformIdx = Math.floor(Math.random() * this.platforms.length);
      const p = this.platforms[platformIdx];
      x = (p.fx + Math.random() * p.fw) * this.cw;
      baseY = this.platformY(platformIdx);
    }
    // ranged ground enemies hold at a standoff distance
    let standoff = -1;
    if (stat.ranged && platformIdx < 0) standoff = this.cw * (0.55 + Math.random() * 0.12);

    const e: Enemy = {
      id: this.nextId++, kind, stat,
      x, y: baseY, baseY, vx: platformIdx >= 0 ? 0 : -stat.speed * this.U, vy: 0,
      hp: stat.hp, maxHp: stat.hp, facing: -1, phase: Math.random() * 10,
      platformIdx, airborne: false, jumpCd: 800 + Math.random() * 1200,
      teleportCd: 2200 + Math.random() * 1800, standoff,
      windup: -1, throwTimer: stat.throwEveryMs * (0.5 + Math.random()) * this.throwFactor(), hitFlash: 0, alive: true,
    };
    if (kind === 'boss') {
      e.x = this.cw * 0.82; e.y = this.groundY; e.baseY = this.groundY; e.vx = 0;
      this.boss = e; this.bossSpecialCd = 4000;
    }
    this.enemies.push(e);
  }

  // ── enemies ─────────────────────────────────────────────────────────────────
  private updateEnemies(dt: number) {
    const ds = dt / 16.67;
    const g = GRAVITY * this.U;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.phase += ds * 0.18;
      e.hitFlash = Math.max(0, e.hitFlash - dt);

      // horizontal movement
      if (e.platformIdx < 0 && e.kind !== 'boss') {
        if (e.standoff > 0 && e.x <= e.standoff) e.vx = 0;
        e.x += e.vx * ds;
      } else if (e.kind === 'boss') {
        // boss drifts slowly to keep menace, clamps on the right third
        e.x += Math.sin(this.t / 1400) * 0.4 * this.U * ds;
        e.x = clamp(e.x, this.cw * 0.7, this.cw * 0.9);
      }

      // jumper hops
      if (e.kind === 'jumper') {
        if (!e.airborne) {
          e.jumpCd -= dt;
          if (e.jumpCd <= 0) { e.vy = -9 * this.U; e.airborne = true; e.jumpCd = 1200 + Math.random() * 1400; }
        } else {
          e.vy += g * ds; e.y += e.vy * ds;
          if (e.y >= e.baseY) { e.y = e.baseY; e.airborne = false; e.vy = 0; }
        }
      }

      // ninja teleport
      if (e.kind === 'ninja') {
        e.teleportCd -= dt;
        if (e.teleportCd <= 0) {
          this.puff(e.x, e.y - 30 * this.U);
          const useP = this.platforms.length > 0 && Math.random() < 0.6;
          if (useP) { const pi = Math.floor(Math.random() * this.platforms.length); const p = this.platforms[pi]; e.platformIdx = pi; e.x = (p.fx + Math.random() * p.fw) * this.cw; e.baseY = this.platformY(pi); e.y = e.baseY; }
          else { e.platformIdx = -1; e.x = this.cw * (0.45 + Math.random() * 0.4); e.baseY = this.groundY; e.y = e.baseY; }
          this.puff(e.x, e.y - 30 * this.U);
          e.teleportCd = 2600 + Math.random() * 2200;
        }
      }

      // reached the player → contact hit
      if (e.kind !== 'boss' && e.x <= this.mx + 14 * this.U) {
        this.enemyReachedPlayer(e);
        continue;
      }

      // throwing
      this.updateEnemyThrow(e, dt);
    }
    // boss special barrage
    if (this.boss && this.boss.alive) {
      this.bossSpecialCd -= dt;
      if (this.bossSpecialCd <= 0) { this.bossBarrage(); this.bossSpecialCd = 3800 + Math.random() * 1600; }
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  private updateEnemyThrow(e: Enemy, dt: number) {
    if (e.windup >= 0) {
      e.windup -= dt;
      if (e.windup < 0) this.enemyShoot(e, false);
      return;
    }
    // only throw when on-screen
    if (e.x > this.cw + 20) return;
    e.throwTimer -= dt;
    if (e.throwTimer <= 0) {
      e.windup = ENEMY_WINDUP_MS;
      e.throwTimer = e.stat.throwEveryMs * (0.7 + Math.random() * 0.7) * this.throwFactor();
    }
  }

  /** Enemies throw less often in the opening waves, ramping to full rate by ~wave 7. */
  private throwFactor(): number {
    return Math.max(1, 2.0 - this.wave * 0.14);
  }

  private enemyShoot(e: Enemy, boss: boolean) {
    const sx = e.x, sy = e.y - 46 * this.U * e.stat.scale;
    const tx = this.mx, ty = this.my - 6 * this.U;
    const dist = Math.hypot(tx - sx, ty - sy);
    const speed = ENEMY_SPEAR_V * this.U;
    const time = dist / speed;
    const g = GRAVITY * this.U;
    const vx = (tx - sx) / time;
    const vy = (ty - sy) / time - 0.5 * g * time;   // lob to land on the player
    this.espears.push({ x: sx, y: sy, vx, vy, boss });
    snd.playEnemyThrow();
  }

  private bossBarrage() {
    if (!this.boss) return;
    for (let i = -1; i <= 1; i++) {
      const e = this.boss;
      const sx = e.x, sy = e.y - 120 * this.U;
      const speed = ENEMY_SPEAR_V * this.U * 1.1;
      const ang = Math.atan2(this.my - sy, this.mx - sx) + i * 12 * DEG;
      this.espears.push({ x: sx, y: sy, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, boss: true });
    }
    snd.playEnemyThrow();
  }

  private enemyReachedPlayer(e: Enemy) {
    e.alive = false;
    this.combo = 1;
    this.damagePlayer('overrun');
  }

  // ── player spears ─────────────────────────────────────────────────────────────
  private updatePlayerSpears(dt: number) {
    const ds = dt / 16.67;
    const g = GRAVITY * this.U;
    const SUB = 3;
    for (const sp of this.pspears) {
      if (sp.stuck) { sp.stuckMs -= dt; continue; }
      sp.trail.push({ x: sp.x, y: sp.y });
      if (sp.trail.length > 8) sp.trail.shift();
      // sub-step so fast spears can't tunnel through thin enemies
      for (let s = 0; s < SUB && !sp.stuck; s++) {
        sp.x += (sp.vx * ds) / SUB;
        sp.y += (sp.vy * ds) / SUB;
        sp.vy += (g * ds) / SUB;
        if (sp.y >= this.groundY) {
          sp.y = this.groundY; sp.stuck = true; sp.stuckMs = 900;
          if (sp.explosive) this.explode(sp.x, sp.y);
          this.spawnSparks(sp.x, sp.y, '#cbb68a', 5); snd.playStick();
          break;
        }
        if (sp.x > this.cw + 60) { sp.stuck = true; sp.stuckMs = 0; break; }
        const hit = this.spearHitEnemy(sp);
        if (hit) {
          const { enemy, zone } = hit;
          sp.hits.add(enemy.id);
          if (sp.explosive) this.explode(sp.x, sp.y);
          const consumed = this.resolveHit(enemy, zone, sp);
          if (consumed && sp.pierce <= 0) { sp.stuck = true; sp.stuckMs = 600; }
          else if (consumed) sp.pierce--;
        }
      }
    }
    this.pspears = this.pspears.filter((s) => !(s.stuck && s.stuckMs <= 0) && s.x < this.cw + 80);
  }

  private spearHitEnemy(sp: PSpear): { enemy: Enemy; zone: 'head' | 'body' } | null {
    let best: { enemy: Enemy; zone: 'head' | 'body'; d: number } | null = null;
    for (const e of this.enemies) {
      if (!e.alive || sp.hits.has(e.id)) continue;
      const z = this.hitZone(e, sp.x, sp.y);
      if (!z) continue;
      const d = Math.abs(e.x - sp.x);
      if (!best || d < best.d) best = { enemy: e, zone: z, d };
    }
    return best ? { enemy: best.enemy, zone: best.zone } : null;
  }

  private resolveHit(e: Enemy, zone: 'head' | 'body', sp: PSpear): boolean {
    this.hitsLanded++;
    // shield bearer blocks frontal body hits
    if (e.kind === 'shield' && zone === 'body') {
      e.hitFlash = 120; this.spawnSparks(sp.x, sp.y, '#cbd5e1', 7); snd.playStick();
      return true;
    }
    // headshots-only mode: body hits just stagger
    if (this.mode.headshotsOnly && zone === 'body' && e.kind !== 'boss') {
      e.hitFlash = 140; this.spawnSparks(sp.x, sp.y, '#fca5a5', 6); snd.playHitBody();
      return true;
    }
    if (e.kind === 'boss') {
      const dmg = zone === 'head' ? 3 : 1;
      e.hp -= dmg; e.hitFlash = 120;
      this.spawnSparks(sp.x, sp.y, zone === 'head' ? '#facc15' : '#fca5a5', zone === 'head' ? 12 : 7);
      this.addScore(zone === 'head' ? 120 : 40, sp.x, sp.y, zone === 'head' ? '+120' : '+40', '#facc15', 16);
      snd.playBossHit();
      if (e.hp <= 0) this.killBoss(e);
      return true;
    }
    if (zone === 'head') { this.killEnemy(e, true, sp.x, sp.y); return true; }
    // body
    e.hp -= 1;
    if (e.hp <= 0) { this.killEnemy(e, false, sp.x, sp.y); return true; }
    e.hitFlash = 140; this.spawnSparks(sp.x, sp.y, '#fca5a5', 6); snd.playHitBody();
    return true;
  }

  private killEnemy(e: Enemy, head: boolean, x: number, y: number) {
    e.alive = false;
    this.kills++;
    if (head) this.headshots++;
    let pts = (head ? HEAD_POINTS : BODY_POINTS) * e.stat.scoreMult;
    if (e.airborne) pts += AIRBORNE_BONUS;
    if (e.x - this.mx > this.cw * 0.55) pts += LONG_BONUS;
    pts = Math.round(pts * this.combo);
    this.addScore(pts, x, y - 16 * this.U, `+${pts}${head ? '  HEADSHOT' : ''}`, head ? '#facc15' : '#fde68a', head ? 20 : 16);
    const coin = (head ? COIN_PER_HEAD : COIN_PER_KILL) + (e.stat.scoreMult > 1.5 ? 1 : 0);
    this.coins += coin;
    this.coinBurst(x, y - 20 * this.U, coin);
    this.spawnSparks(x, y - 20 * this.U, head ? '#facc15' : '#fda4af', head ? 16 : 10);
    if (head) snd.playHeadshot(); else snd.playHitBody();
    if (this.combo < COMBO_MAX) { this.combo++; if (this.combo >= 3) snd.playCombo(this.combo); }
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    // power-up drop
    if (Math.random() < POWERUP_DROP_CHANCE) this.dropPickup(e.x, e.y - 40 * this.U);
  }

  private killBoss(e: Enemy) {
    e.alive = false;
    this.boss = null;
    this.bossKills++;
    this.kills++;
    const pts = Math.round(2000 * this.combo);
    this.coins += BOSS_COINS;
    this.addScore(pts, e.x, e.y - 120 * this.U, `BOSS DOWN +${pts}`, '#facc15', 26);
    this.slowFinish = 1200;
    this.shakeMs = 600; this.shakeMag = 9 * this.U;
    for (let i = 0; i < 5; i++) this.coinBurst(e.x + (Math.random() - 0.5) * 120 * this.U, e.y - 80 * this.U, 5);
    this.spawnSparks(e.x, e.y - 100 * this.U, '#facc15', 40);
    this.dropPickup(e.x - 40 * this.U, e.y - 60 * this.U);
    this.dropPickup(e.x + 40 * this.U, e.y - 60 * this.U);
    snd.playSuccess();
    this.setBanner('BOSS DEFEATED!', 2200, 'good');
  }

  // ── enemy spears ──────────────────────────────────────────────────────────────
  private updateEnemySpears(dt: number) {
    const ds = dt / 16.67;
    const g = GRAVITY * this.U;
    for (const s of this.espears) {
      s.x += s.vx * ds; s.y += s.vy * ds; s.vy += g * ds;
      // hit player
      if (s.x <= this.mx + 16 * this.U && s.x >= this.mx - 30 * this.U) {
        if (Math.abs(s.y - (this.my + 6 * this.U)) < 50 * this.U) {
          (s as ESpear & { dead?: boolean }).dead = true;
          this.damagePlayer('spear');
          this.spawnSparks(s.x, s.y, '#fca5a5', 8);
        }
      }
    }
    this.espears = this.espears.filter((s) => !(s as ESpear & { dead?: boolean }).dead && s.y < this.groundY + 10 && s.x > -40);
  }

  private damagePlayer(_why: string) {
    if (this.iframe > 0 || this.dodgeMs > 0 || this.power.shield > 0) return;
    this.hearts -= 1;
    this.iframe = HIT_IFRAME_MS;
    this.combo = 1;
    this.tookDamage = true;
    this.hurtFlash = 360;
    this.shakeMs = 260; this.shakeMag = 6 * this.U;
    snd.playHurt();
    if (this.hearts <= 0) this.over('You were defeated');
  }

  // ── pickups ─────────────────────────────────────────────────────────────────
  private dropPickup(x: number, y: number) {
    const type: PowerType | 'heart' = Math.random() < 0.14
      ? 'heart'
      : POWER_KEYS[Math.floor(Math.random() * POWER_KEYS.length)];
    this.pickups.push({ x, y, vy: -2 * this.U, type, phase: 0, collected: false });
  }

  private updatePickups(dt: number) {
    const ds = dt / 16.67;
    for (const p of this.pickups) {
      p.phase += ds * 0.12;
      // home toward the player
      const dx = this.mx - p.x, dy = (this.my - 10 * this.U) - p.y;
      p.x += dx * 0.035 * ds;
      p.y += dy * 0.035 * ds + Math.sin(p.phase) * 0.3 * this.U;
      if (Math.hypot(dx, dy) < 26 * this.U) { this.collect(p); p.collected = true; }
    }
    this.pickups = this.pickups.filter((p) => !p.collected);
  }

  private collect(p: Pickup) {
    if (p.type === 'heart') {
      this.hearts = Math.min(this.mode.hearts, this.hearts + 1);
      this.addScore(0, this.mx, this.my - 40 * this.U, '+1 ❤', '#fb7185', 18);
    } else {
      this.power[p.type] = POWERUPS[p.type].ms;
      this.addScore(0, this.mx, this.my - 40 * this.U, POWERUPS[p.type].name, POWERUPS[p.type].color, 16);
    }
    snd.playPowerup();
    this.spawnSparks(this.mx, this.my - 30 * this.U, '#fef08a', 12);
  }

  // ── explosions ──────────────────────────────────────────────────────────────
  private explode(x: number, y: number) {
    this.booms.push({ x, y, r: 0, maxR: 90 * this.U, life: 360 });
    this.shakeMs = 180; this.shakeMag = 5 * this.U;
    for (const e of this.enemies) {
      if (!e.alive || e.kind === 'boss') continue;
      if (Math.hypot(e.x - x, (e.y - 40 * this.U) - y) < 90 * this.U) this.killEnemy(e, false, e.x, e.y - 30 * this.U);
    }
    if (this.boss && this.boss.alive && Math.hypot(this.boss.x - x, (this.boss.y - 100 * this.U) - y) < 110 * this.U) {
      this.boss.hp -= 2; this.boss.hitFlash = 120; if (this.boss.hp <= 0) this.killBoss(this.boss);
    }
    this.spawnSparks(x, y, '#fb923c', 22);
  }

  private updateBooms(dt: number) {
    for (const b of this.booms) { b.life -= dt; b.r = b.maxR * (1 - b.life / 360); }
    this.booms = this.booms.filter((b) => b.life > 0);
  }

  // ── wave progress ─────────────────────────────────────────────────────────────
  private checkWaveProgress(dt: number) {
    if (this.waveCleared) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.startWave(this.wave + 1);
      return;
    }
    const allSpawned = this.plan ? this.spawnIdx >= this.plan.entries.length : false;
    if (allSpawned && this.enemies.length === 0) {
      this.waveCleared = true;
      this.intermission = 1900;
      let bonus = WAVE_CLEAR_BONUS;
      let perfect = false;
      if (!this.tookDamage) { bonus += PERFECT_WAVE_BONUS; perfect = true; this.perfectWaves++; }
      this.score += bonus;
      this.setBanner(perfect ? `Wave Clear!  PERFECT +${bonus}` : `Wave Clear!  +${bonus}`, 1800, 'good');
      snd.playWaveClear();
    }
  }

  // ── scoring / fx helpers ──────────────────────────────────────────────────────
  private addScore(pts: number, x: number, y: number, text: string, color: string, size: number) {
    this.score += pts;
    this.floats.push({ x, y, vy: -0.03 * this.U, life: 1100, text, color, size });
  }
  private coinBurst(x: number, y: number, n: number) {
    for (let i = 0; i < Math.min(8, n); i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const sp = (0.12 + Math.random() * 0.18) * this.U;
      this.sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 500, max: 500, color: '#fbbf24' });
    }
  }
  private spawnSparks(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = (0.06 + Math.random() * 0.2) * this.U;
      this.sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.04 * this.U, life: 300 + Math.random() * 260, max: 560, color });
    }
  }
  private puff(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = (0.05 + Math.random() * 0.12) * this.U;
      this.sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 260, max: 260, color: 'rgba(120,120,140,0.8)' });
    }
  }
  private setBanner(text: string, ms: number, kind: 'wave' | 'good' | 'bad') {
    this.banner = text; this.bannerMs = ms; this.bannerKind = kind;
  }

  private decayEffects(dt: number) {
    this.shakeMs = Math.max(0, this.shakeMs - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 0.0006 * this.U * dt; s.life -= dt; }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    for (const f of this.floats) { f.y += f.vy * dt; f.life -= dt; }
    this.floats = this.floats.filter((f) => f.life > 0);
  }

  // ── geometry ────────────────────────────────────────────────────────────────
  private dims(e: Enemy) {
    const s = this.U * e.stat.scale;
    return { bodyH: 70 * s, bodyW: 24 * s, headR: 15 * s };
  }
  private headPos(e: Enemy) {
    const { bodyH, headR } = this.dims(e);
    return { x: e.x, y: e.y - bodyH - headR };
  }
  private hitZone(e: Enemy, x: number, y: number): 'head' | 'body' | null {
    const { bodyH, bodyW, headR } = this.dims(e);
    const h = this.headPos(e);
    if (Math.hypot(x - h.x, y - h.y) <= headR * 1.2) return 'head';
    const top = e.y - bodyH;
    if (x >= e.x - bodyW / 2 - 3 && x <= e.x + bodyW / 2 + 3 && y >= top && y <= e.y) return 'body';
    return null;
  }

  // ── win / lose ────────────────────────────────────────────────────────────────
  private over(reason: string) {
    if (this.finished) return;
    this.finished = true; this.state = 'over';
    snd.playGameOver();
    const r: RunResult = {
      modeId: this.mode.id, reason, score: Math.max(0, Math.round(this.score)),
      wave: this.wave, kills: this.kills, headshots: this.headshots, bossKills: this.bossKills,
      maxCombo: this.maxCombo, perfectWaves: this.perfectWaves, coinsEarned: this.coins,
      accuracy: this.shots ? this.hitsLanded / this.shots : 0, shots: this.shots,
    };
    setTimeout(() => this.onComplete(r), 700);
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────
  getHud(): HudState {
    const powerups: PowerHud[] = POWER_KEYS
      .filter((k) => this.power[k] > 0)
      .map((k) => ({ type: k, frac: this.power[k] / POWERUPS[k].ms }));
    return {
      hearts: this.hearts, maxHearts: this.mode.hearts, wave: this.wave,
      score: Math.round(this.score), combo: this.combo, coins: this.coins,
      timeLeft: this.timeLeftMs >= 0 ? Math.ceil(this.timeLeftMs / 1000) : -1,
      handDetected: this.handDetected,
      chargeP: this.charging ? this.chargeP : -1,
      throwReady: this.throwCd <= 0,
      dodgeReady: this.dodgeCd <= 0,
      powerups,
      bossHp: this.boss && this.boss.alive ? this.boss.hp / this.boss.maxHp : -1,
      bossName: this.boss ? this.boss.stat.name : '',
      banner: this.banner, bannerKind: this.bannerKind,
      mode: this.state, modeName: this.mode.name,
      leftHanded: this.settings.leftHanded, hint: this.hint,
    };
  }

  // ── render ──────────────────────────────────────────────────────────────────
  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.shakeMs > 0 && this.state === 'play') {
      const k = this.shakeMs / 260;
      ctx.translate((Math.random() - 0.5) * this.shakeMag * k * 2, (Math.random() - 0.5) * this.shakeMag * k * 2);
    }
    this.drawArena(ctx);
    this.drawPlatforms(ctx);
    this.drawPickups(ctx);
    for (const e of [...this.enemies].sort((a, b) => a.x - b.x)) this.drawEnemy(ctx, e);
    this.drawEnemySpears(ctx);
    this.drawPlayerSpears(ctx);
    this.drawPlayer(ctx);
    this.drawBooms(ctx);
    this.drawSparks(ctx);
    this.drawFloats(ctx);
    this.drawTrajectory(ctx);
    ctx.restore();

    this.drawReticle(ctx);
    this.drawVignettes(ctx);
  }

  private drawArena(ctx: CanvasRenderingContext2D) {
    const a = this.arena, { cw, ch } = this;
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, a.sky[0]); g.addColorStop(0.55, a.sky[1]); g.addColorStop(1, a.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);

    // sun / moon
    ctx.fillStyle = a.night ? 'rgba(240,240,210,0.8)' : 'rgba(255,245,210,0.85)';
    ctx.beginPath(); ctx.arc(cw * 0.8, ch * 0.22, 26 * this.U, 0, Math.PI * 2); ctx.fill();

    this.drawSilhouette(ctx);

    // ground
    ctx.fillStyle = a.ground; ctx.fillRect(0, this.groundY, cw, ch - this.groundY);
    ctx.fillStyle = a.groundDark; ctx.fillRect(0, this.groundY, cw, 6 * this.U);
    if (a.style === 'lava') {
      ctx.fillStyle = 'rgba(255,120,40,0.25)';
      for (let x = 0; x < cw; x += 60 * this.U) ctx.fillRect(x + (this.t / 30) % (60 * this.U), this.groundY + 14 * this.U, 28 * this.U, 4 * this.U);
    }
  }

  private drawSilhouette(ctx: CanvasRenderingContext2D) {
    const a = this.arena, { cw } = this, base = this.groundY;
    ctx.fillStyle = a.silhouette;
    if (a.style === 'trees') {
      for (let x = 30; x < cw; x += 120 * this.U) {
        const h = (70 + (x % 50)) * this.U;
        ctx.beginPath(); ctx.arc(x, base - h, 34 * this.U, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - 6 * this.U, base - h, 12 * this.U, h);
      }
    } else if (a.style === 'castle' || a.style === 'huts') {
      let seed = 5;
      for (let x = 20; x < cw; x += 110 * this.U) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const h = (90 + (seed % 130)) * this.U;
        ctx.fillRect(x, base - h, 90 * this.U, h);
        if (a.style === 'castle') { ctx.fillRect(x, base - h - 12 * this.U, 16 * this.U, 12 * this.U); ctx.fillRect(x + 74 * this.U, base - h - 12 * this.U, 16 * this.U, 12 * this.U); }
        if (a.night) { ctx.fillStyle = 'rgba(255,210,120,0.5)'; for (let yy = 20; yy < h - 16; yy += 34 * this.U) if ((seed >> 3 & 1)) ctx.fillRect(x + 16 * this.U, base - h + yy, 12 * this.U, 14 * this.U); ctx.fillStyle = a.silhouette; }
      }
    } else if (a.style === 'dunes' || a.style === 'peaks') {
      ctx.beginPath(); ctx.moveTo(0, base);
      for (let x = 0; x <= cw; x += 40 * this.U) {
        const amp = a.style === 'peaks' ? 160 : 60;
        const y = base - (amp * this.U) * (0.5 + 0.5 * Math.sin(x / (a.style === 'peaks' ? 90 : 160)));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(cw, base); ctx.closePath(); ctx.fill();
    } else {
      for (let x = 40; x < cw; x += 100 * this.U) ctx.fillRect(x, base - 80 * this.U, 50 * this.U, 80 * this.U);
    }
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.arena.accent;
    for (const p of this.platforms) {
      const x = p.fx * this.cw, y = p.fy * this.ch, w = p.fw * this.cw;
      ctx.fillRect(x, y, w, 12 * this.U);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + 12 * this.U, w, 5 * this.U);
      ctx.fillStyle = this.arena.accent;
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
    if (e.kind === 'boss') { this.drawBoss(ctx, e); return; }
    const { bodyH, bodyW, headR } = this.dims(e);
    const feetX = e.x, feetY = e.y;
    if (feetX < -80 || feetX > this.cw + 120) return;
    const top = feetY - bodyH;
    const col = e.hitFlash > 0 ? '#ffffff' : e.stat.color;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(feetX, e.baseY, bodyW * 0.8, bodyW * 0.22, 0, 0, Math.PI * 2); ctx.fill();

    const windup = e.windup >= 0 ? 1 - e.windup / ENEMY_WINDUP_MS : 0;
    const lean = (e.kind === 'runner' ? 0.16 : 0) + windup * 0.12;

    // legs
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, bodyW * 0.26); ctx.lineCap = 'round';
    const stride = Math.sin(e.phase * 6) * bodyW * 0.35 * (e.platformIdx >= 0 ? 0.3 : 1);
    ctx.beginPath(); ctx.moveTo(feetX, top + bodyH * 0.55); ctx.lineTo(feetX - bodyW * 0.3 + stride, feetY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(feetX, top + bodyH * 0.55); ctx.lineTo(feetX + bodyW * 0.3 - stride, feetY); ctx.stroke();

    // torso
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, bodyW * 0.5);
    ctx.beginPath(); ctx.moveTo(feetX, feetY - bodyH * 0.45 + 0); ctx.lineTo(feetX + lean * bodyW, top + headR * 0.4); ctx.stroke();

    // throwing arm (rears back during wind-up)
    ctx.lineWidth = Math.max(2, bodyW * 0.24);
    const armBackX = feetX + (e.facing) * bodyW * (0.5 + windup * 0.7);
    const armY = top + bodyH * 0.18;
    ctx.beginPath(); ctx.moveTo(feetX + lean * bodyW, top + bodyH * 0.12); ctx.lineTo(armBackX, armY - windup * bodyH * 0.2); ctx.stroke();

    // head
    const hx = feetX + lean * bodyW, hy = top - headR + headR * 0.4;
    ctx.fillStyle = e.hitFlash > 0 ? '#fff' : e.stat.head;
    ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2); ctx.fill();

    // shield bearer's shield on the front (player side = left)
    if (e.kind === 'shield') {
      ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#9fb0e8';
      ctx.fillRect(feetX - bodyW * 0.95, top + bodyH * 0.05, bodyW * 0.4, bodyH * 0.7);
      ctx.strokeStyle = '#cfd9ff'; ctx.lineWidth = 2; ctx.strokeRect(feetX - bodyW * 0.95, top + bodyH * 0.05, bodyW * 0.4, bodyH * 0.7);
    }
    // wind-up warning
    if (e.windup >= 0) {
      ctx.fillStyle = `rgba(255,90,90,${0.4 + 0.4 * Math.sin(this.t / 70)})`;
      ctx.font = `${Math.round(16 * this.U)}px system-ui`; ctx.textAlign = 'center';
      ctx.fillText('❗', hx, hy - headR - 8 * this.U);
    }
  }

  private drawBoss(ctx: CanvasRenderingContext2D, e: Enemy) {
    const { bodyH, bodyW, headR } = this.dims(e);
    const feetX = e.x, feetY = e.y, top = feetY - bodyH;
    const col = e.hitFlash > 0 ? '#ffffff' : e.stat.color;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(feetX, feetY, bodyW * 1.1, bodyW * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    // legs
    ctx.strokeStyle = col; ctx.lineWidth = bodyW * 0.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(feetX, top + bodyH * 0.55); ctx.lineTo(feetX - bodyW * 0.4, feetY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(feetX, top + bodyH * 0.55); ctx.lineTo(feetX + bodyW * 0.4, feetY); ctx.stroke();
    // torso
    ctx.lineWidth = bodyW * 0.8; ctx.beginPath(); ctx.moveTo(feetX, feetY - bodyH * 0.45); ctx.lineTo(feetX, top + headR); ctx.stroke();
    // arms
    ctx.lineWidth = bodyW * 0.36;
    ctx.beginPath(); ctx.moveTo(feetX, top + bodyH * 0.2); ctx.lineTo(feetX - bodyW * 0.9, top + bodyH * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(feetX, top + bodyH * 0.2); ctx.lineTo(feetX + bodyW * 0.9, top + bodyH * 0.05); ctx.stroke();
    // head
    ctx.fillStyle = e.hitFlash > 0 ? '#fff' : e.stat.head;
    ctx.beginPath(); ctx.arc(feetX, top - headR + headR * 0.4, headR, 0, Math.PI * 2); ctx.fill();
    // angry eyes
    ctx.fillStyle = '#7a1010';
    ctx.fillRect(feetX - headR * 0.5, top - headR * 0.9, headR * 0.35, headR * 0.2);
    ctx.fillRect(feetX + headR * 0.15, top - headR * 0.9, headR * 0.35, headR * 0.2);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const x = this.mx, gY = this.groundY, U = this.U;
    const blink = this.iframe > 0 && Math.floor(this.t / 90) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.4;
    const dodgeShift = this.dodgeMs > 0 ? Math.sin(this.t / 40) * 6 * U : 0;
    ctx.save(); ctx.translate(dodgeShift, 0);

    const col = '#2f6fb0';
    const headR = 13 * U, bodyTop = gY - 58 * U;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(x, gY, 22 * U, 6 * U, 0, 0, Math.PI * 2); ctx.fill();
    // legs
    ctx.strokeStyle = col; ctx.lineWidth = 6 * U; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, gY - 26 * U); ctx.lineTo(x - 9 * U, gY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, gY - 26 * U); ctx.lineTo(x + 9 * U, gY); ctx.stroke();
    // torso
    ctx.lineWidth = 9 * U; ctx.beginPath(); ctx.moveTo(x, gY - 26 * U); ctx.lineTo(x, bodyTop + headR); ctx.stroke();
    // head
    ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.arc(x, bodyTop, headR, 0, Math.PI * 2); ctx.fill();
    // aiming arm + spear pointing along aimAngle
    const ang = this.aimAngle;
    const shoulderY = bodyTop + headR + 4 * U;
    const armLen = 26 * U + this.chargeP * 8 * U;
    const hxp = x + Math.cos(ang) * armLen, hyp = shoulderY + Math.sin(ang) * armLen;
    ctx.strokeStyle = col; ctx.lineWidth = 6 * U;
    ctx.beginPath(); ctx.moveTo(x, shoulderY); ctx.lineTo(hxp, hyp); ctx.stroke();
    // held spear
    this.drawSpearShape(ctx, hxp, hyp, ang, 54 * U, this.charging);
    ctx.restore();
    ctx.globalAlpha = 1;

    // shield bubble when shield power-up active
    if (this.power.shield > 0) {
      ctx.strokeStyle = `rgba(52,211,153,${0.5 + 0.3 * Math.sin(this.t / 120)})`;
      ctx.lineWidth = 3 * U;
      ctx.beginPath(); ctx.arc(x, gY - 30 * U, 42 * U, 0, Math.PI * 2); ctx.stroke();
    }
  }

  private drawSpearShape(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, glow: boolean) {
    const U = this.U;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (glow && this.skin.glow) { ctx.shadowColor = this.skin.tip; ctx.shadowBlur = 10; }
    // shaft
    ctx.strokeStyle = this.skin.shaft; ctx.lineWidth = 3.4 * U; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-len * 0.5, 0); ctx.lineTo(len * 0.42, 0); ctx.stroke();
    // head (triangle)
    ctx.fillStyle = this.skin.tip;
    ctx.beginPath(); ctx.moveTo(len * 0.5, 0); ctx.lineTo(len * 0.32, -4.6 * U); ctx.lineTo(len * 0.32, 4.6 * U); ctx.closePath(); ctx.fill();
    // tail fletch
    ctx.fillStyle = this.skin.tip;
    ctx.beginPath(); ctx.moveTo(-len * 0.5, 0); ctx.lineTo(-len * 0.42, -4 * U); ctx.lineTo(-len * 0.36, 0); ctx.lineTo(-len * 0.42, 4 * U); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  private drawPlayerSpears(ctx: CanvasRenderingContext2D) {
    for (const sp of this.pspears) {
      // trail
      if (sp.trail.length > 1 && !sp.stuck) {
        ctx.strokeStyle = this.skin.trail; ctx.lineWidth = 3 * this.U; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sp.trail[0].x, sp.trail[0].y);
        for (const t of sp.trail) ctx.lineTo(t.x, t.y); ctx.stroke();
      }
      const ang = sp.stuck ? this.aimAngle : Math.atan2(sp.vy, sp.vx);
      this.drawSpearShape(ctx, sp.x, sp.y, ang, 46 * this.U, sp.explosive || sp.pierce > 0);
    }
  }

  private drawEnemySpears(ctx: CanvasRenderingContext2D) {
    for (const s of this.espears) {
      const ang = Math.atan2(s.vy, s.vx);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang);
      ctx.strokeStyle = s.boss ? '#ff8c42' : '#caa15a'; ctx.lineWidth = 3 * this.U; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-18 * this.U, 0); ctx.lineTo(14 * this.U, 0); ctx.stroke();
      ctx.fillStyle = s.boss ? '#ffd34d' : '#e7e0cf';
      ctx.beginPath(); ctx.moveTo(20 * this.U, 0); ctx.lineTo(13 * this.U, -4 * this.U); ctx.lineTo(13 * this.U, 4 * this.U); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  private drawPickups(ctx: CanvasRenderingContext2D) {
    for (const p of this.pickups) {
      const r = 15 * this.U + Math.sin(p.phase) * 1.5 * this.U;
      const meta = p.type === 'heart' ? { emoji: '❤️', color: '#fb7185' } : POWERUPS[p.type];
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = meta.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = `${Math.round(18 * this.U)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(meta.emoji, p.x, p.y + 1);
    }
    ctx.textBaseline = 'alphabetic';
  }

  private drawBooms(ctx: CanvasRenderingContext2D) {
    for (const b of this.booms) {
      const a = b.life / 360;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, `rgba(255,220,120,${a * 0.9})`);
      g.addColorStop(0.5, `rgba(255,140,50,${a * 0.6})`);
      g.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawSparks(ctx: CanvasRenderingContext2D) {
    for (const s of this.sparks) {
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.4 * this.U, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFloats(ctx: CanvasRenderingContext2D) {
    for (const f of this.floats) {
      ctx.globalAlpha = Math.min(1, f.life / 600);
      ctx.fillStyle = f.color; ctx.font = `bold ${Math.round(f.size * this.U)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }

  private drawTrajectory(ctx: CanvasRenderingContext2D) {
    if (!this.handDetected) return;
    const power = this.charging ? this.chargeP : QUICK_POWER;
    const v = (SPEAR_V_MIN + power * (SPEAR_V_MAX - SPEAR_V_MIN)) * this.U;
    let ang = this.aimAngle;
    if (this.settings.aimAssist) ang = this.assistAngle(ang, v);
    let px = this.mx + Math.cos(ang) * 30 * this.U;
    let py = this.my + Math.sin(ang) * 30 * this.U;
    let vx = Math.cos(ang) * v, vy = Math.sin(ang) * v;
    const g = GRAVITY * this.U;
    ctx.fillStyle = this.charging ? `rgba(255,210,90,${0.4 + this.chargeP * 0.5})` : 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 48; i++) {
      px += vx * 1.4; py += vy * 1.4; vy += g * 1.4;
      if (py >= this.groundY || px > this.cw + 20) break;
      if (i % 2 === 0) { ctx.beginPath(); ctx.arc(px, py, 2.4 * this.U, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  private drawReticle(ctx: CanvasRenderingContext2D) {
    if (!this.handDetected) return;
    const x = this.hx * this.cw, y = this.hy * this.ch;
    const r = 16 * this.U;
    const charging = this.charging;
    ctx.strokeStyle = charging ? `rgba(255,200,70,0.95)` : 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2.4 * this.U;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r - 5 * this.U, y); ctx.lineTo(x - r + 4 * this.U, y);
    ctx.moveTo(x + r - 4 * this.U, y); ctx.lineTo(x + r + 5 * this.U, y);
    ctx.moveTo(x, y - r - 5 * this.U); ctx.lineTo(x, y - r + 4 * this.U);
    ctx.moveTo(x, y + r - 4 * this.U); ctx.lineTo(x, y + r + 5 * this.U); ctx.stroke();
    if (charging) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3 * this.U;
      ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + this.chargeP * Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = charging ? '#fbbf24' : '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, 2 * this.U, 0, Math.PI * 2); ctx.fill();
  }

  private drawVignettes(ctx: CanvasRenderingContext2D) {
    if (this.power.slowmo > 0 || this.slowFinish > 0) {
      ctx.fillStyle = 'rgba(120,90,200,0.10)'; ctx.fillRect(0, 0, this.cw, this.ch);
    }
    if (this.hurtFlash > 0) {
      const a = this.hurtFlash / 360;
      const g = ctx.createRadialGradient(this.cw / 2, this.ch / 2, this.ch * 0.3, this.cw / 2, this.ch / 2, this.ch * 0.75);
      g.addColorStop(0, 'rgba(220,30,30,0)'); g.addColorStop(1, `rgba(220,30,30,${a * 0.55})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.cw, this.ch);
    }
  }
}
