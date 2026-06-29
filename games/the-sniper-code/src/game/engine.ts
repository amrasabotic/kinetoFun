import {
  WORLD_W, GROUND_Y, BASE_PPU, ZOOM_LEVELS, PAN_MIN_X, PAN_MAX_X, PAN_MIN_Y, PAN_MAX_Y,
  SWAY_AMP_BASE, SWAY_STEADY_MULT, PINCH_HOLD_MS, FIRE_COOLDOWN_MS, ZOOM_HOLD_MS,
  STEADY_TIME_MS, HEAD_POINTS, BODY_POINTS, MISS_POINTS, CIVILIAN_POINTS, COMBO_MAX,
  TIME_BONUS_PER_SEC, BULLET_BONUS, STEADY_SHOT_BONUS, PERFECT_BONUS, STEADY_SCORE_MULT,
  ACTOR_HEAD_R, ACTOR_BODY_W, ACTOR_BODY_H, AIM_ASSIST_RADIUS, ROLE_COLORS,
  type Role, type Settings,
} from '../utils/constants';
import { ENVIRONMENTS, type MissionDef } from '../data/missions';
import { isPinching, isOpenHand, smooth, clamp, lerp, SteadyTracker, type Landmark } from '../utils/gestures';
import * as snd from '../utils/audio';

const WIND_DRIFT = 95;        // world units of bullet drift at wind = 1
const ESCAPE_DELAY_MS = 3200;

export interface MissionResult {
  win: boolean;
  reason: string;
  score: number;
  baseScore: number;
  bonuses: { time: number; bullets: number; steady: number; perfect: number };
  stars: number;
  accuracy: number;
  headshots: number;
  shots: number;
  hits: number;
  maxCombo: number;
  timeLeftSec: number;
}

export interface HudState {
  objective: string;
  timeLeft: number;
  bullets: number;
  combo: number;
  zoom: number;
  steady: boolean;
  wind: number;
  showWind: boolean;
  targetsLeft: number;
  mode: 'play' | 'paused' | 'won' | 'lost';
  handDetected: boolean;
  banner: string | null;
  leftHanded: boolean;
}

type Behavior = 'idle' | 'walk' | 'run' | 'ride' | 'peek' | 'approach';

interface Actor {
  id: number;
  role: Role;
  x: number; y: number;     // feet (world)
  vx: number;
  depth: number;            // 0 near .. 1 far
  scale: number;
  facing: 1 | -1;
  emoji: string;
  behavior: Behavior;
  phase: number;
  alive: boolean;
  visible: boolean;
  number?: number;          // ordered target (1-based)
  peekTimer?: number;
  walkMin?: number;
  walkMax?: number;
  reached?: boolean;        // attacker/decoy reached VIP
  coverX?: number;          // peek cover prop
}

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; }
interface Float { x: number; y: number; vy: number; life: number; text: string; color: string; }
interface Marker { x: number; y: number; life: number; ok: boolean; }

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const CIVILIAN_EMOJI = ['🧑‍💼', '🧍', '🧒', '👩', '🧑', '👨‍🦱', '🧓', '👮', '📷', '🚶'];

export class GameEngine {
  private m: MissionDef;
  private settings: Settings;
  private rng: () => number;
  private onComplete: (r: MissionResult) => void;

  cw = 960; ch = 600;
  mode: 'play' | 'paused' | 'won' | 'lost' = 'play';

  private timeLeftMs: number;
  private aimX = WORLD_W / 2;
  private aimY = GROUND_Y - 200;
  private zoomIdx: number;
  private bullets: number;

  private combo = 1;
  private maxCombo = 1;
  private shots = 0;
  private hits = 0;
  private headshots = 0;
  private steadyShots = 0;
  private missCount = 0;
  private protectedHit = false;

  private actors: Actor[] = [];
  private nextId = 1;

  // gesture state
  private pinchMs = 0;
  private firedThisPinch = false;
  private fireCd = 0;
  private openMs = 0;
  private zoomConsumed = false;
  private steadyTrk = new SteadyTracker();
  private steadyMs = 0;
  steadyActive = false;
  handDetected = false;

  // view feel
  private scale: number;
  private swayX = 0; private swayY = 0;
  private effX = 0; private effY = 0;
  private recoil = 0;
  private t = 0;

  // effects
  private shakeMs = 0; private shakeMag = 0;
  private muzzleMs = 0;
  private sparks: Spark[] = [];
  private floats: Float[] = [];
  private markers: Marker[] = [];
  private tracer: { x: number; y: number; life: number } | null = null;

  private banner: string | null = null;
  private bannerMs = 0;
  private lastBeepSec = 999;
  private escapeMs = 0;
  private nextOrder = 1;
  private finished = false;

  constructor(m: MissionDef, settings: Settings, onComplete: (r: MissionResult) => void) {
    this.m = m;
    this.settings = settings;
    this.onComplete = onComplete;
    this.rng = mulberry32(hash(m.id));
    this.timeLeftMs = m.timeSec * 1000;
    this.bullets = m.bullets;
    this.zoomIdx = m.zoomStart;
    this.scale = ZOOM_LEVELS[this.zoomIdx] * BASE_PPU;
    this.spawn();
    this.setBanner(m.objective, 2600);
  }

  resize(cw: number, ch: number) { this.cw = cw; this.ch = ch; }
  setSettings(s: Settings) { this.settings = s; }

  pause() { if (this.mode === 'play') this.mode = 'paused'; }
  resume() { if (this.mode === 'paused') this.mode = 'play'; }

  getHud(): HudState {
    return {
      objective: this.m.objective,
      timeLeft: Math.max(0, Math.ceil(this.timeLeftMs / 1000)),
      bullets: this.bullets,
      combo: this.combo,
      zoom: ZOOM_LEVELS[this.zoomIdx],
      steady: this.steadyActive,
      wind: this.m.wind,
      showWind: this.m.wind !== 0,
      targetsLeft: this.actors.filter((a) => a.alive && this.isValid(a.role)).length,
      mode: this.mode,
      handDetected: this.handDetected,
      banner: this.banner,
      leftHanded: this.settings.leftHanded,
    };
  }

  // ── spawning ────────────────────────────────────────────────────────────────
  private rand(a: number, b: number) { return a + (b - a) * this.rng(); }

  private slots(n: number): number[] {
    const lo = PAN_MIN_X + 90, hi = PAN_MAX_X - 90;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const base = lerp(lo, hi, n === 1 ? 0.5 : i / (n - 1));
      out.push(clamp(base + this.rand(-70, 70), lo, hi));
    }
    // shuffle
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  private make(role: Role, x: number, opt: Partial<Actor> = {}): Actor {
    const depth = opt.depth ?? this.rand(0.05, 0.85);
    const baseScale = (1 - depth * 0.34) * (this.isValid(role) || role === 'vip' ? this.m.targetScale : 1);
    return {
      id: this.nextId++, role, x, y: GROUND_Y - depth * 120, vx: 0, depth,
      scale: baseScale, facing: this.rng() > 0.5 ? 1 : -1,
      emoji: role === 'civilian' ? CIVILIAN_EMOJI[Math.floor(this.rng() * CIVILIAN_EMOJI.length)] : '🕴️',
      behavior: 'idle', phase: this.rng() * 10, alive: true, visible: true, ...opt,
    };
  }

  private spawn() {
    const m = this.m;
    if (m.type === 'vip') {
      const vipX = this.rng() > 0.5 ? PAN_MAX_X - 140 : PAN_MIN_X + 140;
      const fromLeft = vipX > WORLD_W / 2;
      const startX = fromLeft ? PAN_MIN_X + 120 : PAN_MAX_X - 120;
      this.actors.push(this.make('vip', vipX, { depth: 0.35, emoji: '🧑‍💼', behavior: 'idle' }));
      this.actors.push(this.make('attacker', startX, {
        depth: 0.35, emoji: '🕵️', behavior: 'approach',
        vx: (fromLeft ? 1 : -1) * m.moveSpeed, facing: fromLeft ? 1 : -1,
      }));
      for (let i = 0; i < m.decoys; i++) {
        const dx = fromLeft ? PAN_MIN_X + 220 : PAN_MAX_X - 220;
        this.actors.push(this.make('decoy', dx + this.rand(-40, 40), {
          depth: 0.45, emoji: '🧑', behavior: 'approach',
          vx: (fromLeft ? 1 : -1) * m.moveSpeed * 0.8, facing: fromLeft ? 1 : -1,
        }));
      }
      for (const sx of this.slots(m.crowd)) this.actors.push(this.make('civilian', sx));
      return;
    }

    const targetSlots = this.slots(m.targets + m.decoys + m.crowd);
    let s = 0;
    for (let i = 0; i < m.targets; i++) {
      const a = this.make('target', targetSlots[s++], { depth: this.rand(0.2, 0.55) });
      if (m.requireOrder) a.number = i + 1;
      if (m.type === 'escape') { a.behavior = 'idle'; }
      if (m.type === 'moving') {
        a.behavior = 'ride'; a.emoji = '🛵';
        a.vx = m.moveSpeed; a.walkMin = PAN_MIN_X + 40; a.walkMax = PAN_MAX_X - 40;
        a.depth = 0.3; a.scale = (1 - a.depth * 0.34) * m.targetScale;
      }
      if (m.env === 'rooftop' && m.type === 'eliminate') {
        a.behavior = 'peek'; a.coverX = a.x; a.peekTimer = this.rand(400, 1400); a.visible = false;
      }
      this.actors.push(a);
    }
    for (let i = 0; i < m.decoys; i++) this.actors.push(this.make('decoy', targetSlots[s++], { emoji: '🧑', number: m.requireOrder ? 0 : undefined }));
    for (let i = 0; i < m.crowd; i++) this.actors.push(this.make('civilian', targetSlots[s++]));
  }

  private isValid(r: Role) { return r === 'target' || r === 'attacker'; }

  // ── update ──────────────────────────────────────────────────────────────────
  update(dt: number, hand: { detected: boolean; cursorX: number; cursorY: number; landmarks: Landmark[] }) {
    this.t += dt;
    this.handDetected = hand.detected;
    if (this.mode !== 'play') { this.decayEffects(dt); return; }
    if (this.finished) return;

    const lm = hand.landmarks;

    // aim
    if (hand.detected) {
      const s = this.settings.sensitivity;
      const hx = clamp(0.5 + (hand.cursorX - 0.5) * s, 0, 1);
      const hy = clamp(0.5 + (hand.cursorY - 0.5) * s, 0, 1);
      const tx = lerp(PAN_MIN_X, PAN_MAX_X, hx);
      const ty = lerp(PAN_MIN_Y, PAN_MAX_Y, hy);
      const a = this.settings.smoothing;
      this.aimX = smooth(this.aimX, tx, a);
      this.aimY = smooth(this.aimY, ty, a);

      // steadiness
      if (this.steadyTrk.push(hand.cursorX, hand.cursorY)) this.steadyMs += dt;
      else this.steadyMs = 0;
      const wasSteady = this.steadyActive;
      this.steadyActive = this.steadyMs >= STEADY_TIME_MS;
      if (this.steadyActive && !wasSteady) snd.playSteady();
    } else {
      this.steadyTrk.reset(); this.steadyMs = 0; this.steadyActive = false;
    }

    // zoom (open palm hold cycles one step)
    if (hand.detected && lm.length >= 21 && isOpenHand(lm)) {
      this.openMs += dt;
      if (this.openMs >= ZOOM_HOLD_MS && !this.zoomConsumed) {
        this.zoomIdx = (this.zoomIdx + 1) % ZOOM_LEVELS.length;
        this.scale = ZOOM_LEVELS[this.zoomIdx] * BASE_PPU;
        this.zoomConsumed = true;
        snd.playZoom();
      }
    } else { this.openMs = 0; this.zoomConsumed = false; }

    // fire (pinch, edge-triggered + cooldown)
    this.fireCd = Math.max(0, this.fireCd - dt);
    if (hand.detected && lm.length >= 9 && isPinching(lm)) {
      this.pinchMs += dt;
      if (this.pinchMs >= PINCH_HOLD_MS && !this.firedThisPinch && this.fireCd <= 0) {
        this.fire();
        this.firedThisPinch = true;
        this.fireCd = FIRE_COOLDOWN_MS;
      }
    } else { this.pinchMs = 0; this.firedThisPinch = false; }

    // sway / recoil → effective aim
    const amp = SWAY_AMP_BASE * (ZOOM_LEVELS[this.zoomIdx] / 2) * (this.steadyActive ? SWAY_STEADY_MULT : 1);
    const ts = this.t / 1000;
    this.swayX = amp * (Math.sin(ts * 1.1) * 0.6 + Math.sin(ts * 0.37 + 2) * 0.4);
    this.swayY = amp * (Math.sin(ts * 0.9 + 1.7) * 0.5 + Math.sin(ts * 0.27) * 0.5);
    this.recoil = Math.max(0, this.recoil - dt * 0.06);
    this.effX = this.aimX + this.swayX / this.scale;
    this.effY = this.aimY + (this.swayY - this.recoil) / this.scale;

    this.updateActors(dt);
    this.decayEffects(dt);

    // banner / timer
    if (this.bannerMs > 0) { this.bannerMs -= dt; if (this.bannerMs <= 0) this.banner = null; }
    this.timeLeftMs -= dt;
    const secs = Math.ceil(this.timeLeftMs / 1000);
    if (secs <= 5 && secs >= 1 && secs !== this.lastBeepSec) { this.lastBeepSec = secs; snd.playBeep(); }
    if (this.timeLeftMs <= 0) this.lose('Time up');
  }

  private updateActors(dt: number) {
    const ds = dt / 1000;
    let vip: Actor | undefined;
    for (const a of this.actors) if (a.role === 'vip') vip = a;

    for (const a of this.actors) {
      if (!a.alive) continue;
      a.phase += ds * 4;
      switch (a.behavior) {
        case 'ride': {
          a.x += a.vx * ds;
          if (a.walkMax !== undefined && a.x >= a.walkMax) { a.x = a.walkMax; a.vx *= -1; a.facing = -1; }
          if (a.walkMin !== undefined && a.x <= a.walkMin) { a.x = a.walkMin; a.vx *= -1; a.facing = 1; }
          a.facing = a.vx >= 0 ? 1 : -1;
          break;
        }
        case 'run': {
          a.x += a.vx * ds;
          a.facing = a.vx >= 0 ? 1 : -1;
          if (a.x < PAN_MIN_X - 30 || a.x > PAN_MAX_X + 30) { this.lose('The target escaped'); return; }
          break;
        }
        case 'approach': {
          if (vip) {
            const dir = Math.sign(vip.x - a.x) || 1;
            a.x += dir * Math.abs(a.vx) * ds;
            a.facing = dir as 1 | -1;
            if (Math.abs(vip.x - a.x) < 110 && !a.reached) {
              a.reached = true;
              if (a.role === 'attacker') { this.lose('The VIP was reached'); return; }
              else { a.behavior = 'idle'; } // harmless decoy just stops
            }
          }
          break;
        }
        case 'peek': {
          a.peekTimer = (a.peekTimer ?? 0) - dt;
          if (a.peekTimer <= 0) {
            a.visible = !a.visible;
            a.peekTimer = a.visible ? this.rand(900, 1700) : this.rand(700, 1500);
          }
          break;
        }
        default: break;
      }
    }

    // escape trigger
    if (this.m.type === 'escape') {
      this.escapeMs += dt;
      if (this.escapeMs >= ESCAPE_DELAY_MS) {
        for (const a of this.actors) {
          if (a.alive && a.role === 'target' && a.behavior !== 'run') {
            const dir = a.x < WORLD_W / 2 ? -1 : 1;
            a.behavior = 'run'; a.vx = dir * this.m.moveSpeed; a.emoji = '🏃';
          }
        }
      }
    }
  }

  // ── firing / hit detection ────────────────────────────────────────────────────
  private fire() {
    if (this.bullets === 0) { snd.playEmpty(); return; }
    this.shots++;
    if (this.bullets > 0) this.bullets--;
    this.recoil = 26;
    this.muzzleMs = 90;
    this.shakeMs = 160; this.shakeMag = 7;
    snd.playShot();

    let sx = this.effX + this.m.wind * WIND_DRIFT;
    let sy = this.effY;

    // aim assist: snap to nearest valid head within radius (screen space)
    if (this.settings.aimAssist) {
      let best: Actor | null = null; let bestD = AIM_ASSIST_RADIUS;
      for (const a of this.actors) {
        if (!a.alive || !a.visible || !this.isValid(a.role)) continue;
        const hp = this.headWorld(a);
        const ds = this.worldToScreen(hp.x, hp.y);
        const cs = this.worldToScreen(sx, sy);
        const d = Math.hypot(ds.x - cs.x, ds.y - cs.y);
        if (d < bestD) { bestD = d; best = a; }
      }
      if (best) { const hp = this.headWorld(best); sx = hp.x; sy = hp.y; }
    }

    const scr = this.worldToScreen(sx, sy);
    this.tracer = { x: scr.x, y: scr.y, life: 120 };

    // find the nearest (lowest depth) actor whose hit zone contains the impact
    let target: Actor | null = null; let zone: 'head' | 'body' = 'body';
    for (const a of this.actors) {
      if (!a.alive || !a.visible) continue;
      const z = this.hitZone(a, sx, sy);
      if (z && (target === null || a.depth < target.depth)) { target = a; zone = z; }
    }

    if (!target) { this.onMiss(scr); return; }
    this.onHit(target, zone, scr);
  }

  private onMiss(scr: { x: number; y: number }) {
    this.missCount++;
    this.combo = 1;
    this.addScore(MISS_POINTS, scr, `${MISS_POINTS}`, '#94a3b8');
    this.spawnSparks(scr.x, scr.y, '#cbd5e1', 6);
    this.markers.push({ x: scr.x, y: scr.y, life: 420, ok: false });
    snd.playMiss();
    if (this.bullets === 0) this.checkOutOfAmmo();
  }

  private onHit(a: Actor, zone: 'head' | 'body', scr: { x: number; y: number }) {
    if (!this.isValid(a.role)) {
      // shot a protected person → fail
      a.alive = false;
      this.protectedHit = true;
      this.spawnSparks(scr.x, scr.y, '#f87171', 10);
      snd.playPenalty();
      this.addScore(CIVILIAN_POINTS, scr, `${CIVILIAN_POINTS}`, '#ef4444');
      const why = a.role === 'vip' ? 'You hit the VIP'
        : a.role === 'decoy' ? 'You hit an innocent'
        : a.role === 'hostage' ? 'You hit the hostage' : 'You hit a civilian';
      this.lose(why);
      return;
    }

    // ordered targets must be taken in sequence
    if (this.m.requireOrder && a.number && a.number !== this.nextOrder) {
      this.combo = 1;
      this.spawnSparks(scr.x, scr.y, '#fbbf24', 8);
      this.addScore(MISS_POINTS, scr, 'WRONG ORDER', '#fbbf24');
      snd.playMiss();
      return;
    }
    if (this.m.requireOrder && a.number) this.nextOrder++;

    a.alive = false;
    this.hits++;
    const head = zone === 'head';
    if (head) this.headshots++;
    const steady = this.steadyActive;
    if (steady) this.steadyShots++;
    let pts = (head ? HEAD_POINTS : BODY_POINTS) * this.combo;
    if (steady) pts = Math.round(pts * STEADY_SCORE_MULT);
    this.addScore(pts, scr, `+${pts}${head ? ' HEADSHOT' : ''}`, head ? '#facc15' : '#34d399');
    this.spawnSparks(scr.x, scr.y, head ? '#facc15' : '#86efac', head ? 14 : 9);
    this.markers.push({ x: scr.x, y: scr.y, life: 500, ok: true });
    if (head) snd.playHeadshot(); else snd.playHitBody();
    if (this.combo < COMBO_MAX) { this.combo++; snd.playCombo(this.combo); }
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    // win check
    const left = this.actors.filter((x) => x.alive && this.isValid(x.role)).length;
    if (left === 0) { this.win(); return; }
    if (this.bullets === 0) this.checkOutOfAmmo();
  }

  private checkOutOfAmmo() {
    const left = this.actors.filter((x) => x.alive && this.isValid(x.role)).length;
    if (left > 0) this.lose('Out of ammo');
  }

  private addScore(pts: number, scr: { x: number; y: number }, text: string, color: string) {
    this.score += pts;
    this.floats.push({ x: scr.x, y: scr.y - 14, vy: -0.04, life: 1100, text, color });
  }
  private score = 0;

  // ── win / lose ────────────────────────────────────────────────────────────────
  private bonusBreakdown() {
    const time = Math.max(0, Math.ceil(this.timeLeftMs / 1000)) * TIME_BONUS_PER_SEC;
    const bullets = Math.max(0, this.bullets) * BULLET_BONUS;
    const steady = this.steadyShots * STEADY_SHOT_BONUS;
    const perfect = this.missCount === 0 && !this.protectedHit ? PERFECT_BONUS : 0;
    return { time, bullets, steady, perfect };
  }

  private win() {
    if (this.finished) return;
    this.finished = true; this.mode = 'won';
    const b = this.bonusBreakdown();
    const base = Math.max(0, this.score);
    const total = base + b.time + b.bullets + b.steady + b.perfect;
    const stars = total >= this.m.star3 ? 3 : total >= this.m.star2 ? 2 : 1;
    snd.playSuccess();
    this.finish({
      win: true, reason: 'Mission complete', score: total, baseScore: base, bonuses: b, stars,
      accuracy: this.shots ? this.hits / this.shots : 0,
      headshots: this.headshots, shots: this.shots, hits: this.hits,
      maxCombo: this.maxCombo, timeLeftSec: Math.max(0, Math.ceil(this.timeLeftMs / 1000)),
    });
  }

  private lose(reason: string) {
    if (this.finished) return;
    this.finished = true; this.mode = 'lost';
    snd.playFail();
    this.finish({
      win: false, reason, score: Math.max(0, this.score), baseScore: Math.max(0, this.score),
      bonuses: { time: 0, bullets: 0, steady: 0, perfect: 0 }, stars: 0,
      accuracy: this.shots ? this.hits / this.shots : 0,
      headshots: this.headshots, shots: this.shots, hits: this.hits,
      maxCombo: this.maxCombo, timeLeftSec: Math.max(0, Math.ceil(this.timeLeftMs / 1000)),
    });
  }

  private finish(r: MissionResult) {
    setTimeout(() => this.onComplete(r), 700);
  }

  private setBanner(text: string, ms: number) { this.banner = text; this.bannerMs = ms; }

  // ── geometry helpers ──────────────────────────────────────────────────────────
  private headWorld(a: Actor) {
    const bodyH = ACTOR_BODY_H * a.scale;
    const headR = ACTOR_HEAD_R * a.scale;
    return { x: a.x, y: a.y - bodyH - headR };
  }
  private hitZone(a: Actor, wx: number, wy: number): 'head' | 'body' | null {
    const bodyH = ACTOR_BODY_H * a.scale;
    const bodyW = ACTOR_BODY_W * a.scale;
    const headR = ACTOR_HEAD_R * a.scale;
    const hc = this.headWorld(a);
    if (Math.hypot(wx - hc.x, wy - hc.y) <= headR * 1.05) return 'head';
    const topY = a.y - bodyH;
    if (wx >= a.x - bodyW / 2 && wx <= a.x + bodyW / 2 && wy >= topY && wy <= a.y) return 'body';
    return null;
  }

  worldToScreen(wx: number, wy: number) {
    return { x: this.cw / 2 + (wx - this.effX) * this.scale, y: this.ch / 2 + (wy - this.effY) * this.scale };
  }

  private decayEffects(dt: number) {
    this.muzzleMs = Math.max(0, this.muzzleMs - dt);
    this.shakeMs = Math.max(0, this.shakeMs - dt);
    if (this.tracer) { this.tracer.life -= dt; if (this.tracer.life <= 0) this.tracer = null; }
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 0.0015 * dt; s.life -= dt; }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    for (const f of this.floats) { f.y += f.vy * dt; f.life -= dt; }
    this.floats = this.floats.filter((f) => f.life > 0);
    for (const mk of this.markers) mk.life -= dt;
    this.markers = this.markers.filter((mk) => mk.life > 0);
  }

  private spawnSparks(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const ang = this.rng() * Math.PI * 2;
      const sp = 0.08 + this.rng() * 0.22;
      this.sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.05, life: 320 + this.rng() * 260, max: 580, color });
    }
  }

  // ── rendering ──────────────────────────────────────────────────────────────────
  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // screen shake
    if (this.shakeMs > 0 && this.mode === 'play') {
      const k = this.shakeMs / 160;
      ctx.translate((this.rng() - 0.5) * this.shakeMag * k * 2, (this.rng() - 0.5) * this.shakeMag * k * 2);
    }

    this.drawWorld(ctx);
    this.drawActors(ctx);
    this.drawTint(ctx);
    this.drawEffects(ctx);
    ctx.restore();

    this.drawScope(ctx);
  }

  private drawWorld(ctx: CanvasRenderingContext2D) {
    const env = ENVIRONMENTS[this.m.env];
    const { cw, ch } = this;
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, env.sky[0]); g.addColorStop(0.55, env.sky[1]); g.addColorStop(1, env.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);

    const horizon = this.worldToScreen(0, GROUND_Y).y;
    // distant haze silhouette
    this.drawSkyline(ctx, env, horizon);
    // ground
    ctx.fillStyle = env.ground;
    ctx.fillRect(0, horizon, cw, ch - horizon);
    // ground perspective stripes
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
    for (let i = 1; i <= 5; i++) {
      const y = horizon + (ch - horizon) * (i / 6);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }
    this.drawProps(ctx, env, horizon);
  }

  private drawSkyline(ctx: CanvasRenderingContext2D, env: { haze: string; accent: string; id: string }, horizon: number) {
    ctx.fillStyle = env.haze;
    const baseY = horizon;
    if (env.id === 'park') {
      for (let wx = 200; wx < WORLD_W; wx += 240) {
        const s = this.worldToScreen(wx, GROUND_Y);
        const r = 70 * this.scale;
        ctx.beginPath(); ctx.arc(s.x, baseY - r * 0.5, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(s.x - 6 * this.scale, baseY - r * 0.5, 12 * this.scale, r * 0.6);
        ctx.fillStyle = env.haze;
      }
    } else if (env.id === 'harbor') {
      for (let wx = 150; wx < WORLD_W; wx += 320) {
        const s = this.worldToScreen(wx, GROUND_Y);
        ctx.fillRect(s.x, baseY - 90 * this.scale, 160 * this.scale, 90 * this.scale);
      }
      ctx.fillStyle = 'rgba(120,170,190,0.25)';
      ctx.fillRect(0, baseY - 6, this.cw, 6);
    } else if (env.id === 'construction') {
      for (let wx = 300; wx < WORLD_W; wx += 520) {
        const s = this.worldToScreen(wx, GROUND_Y);
        ctx.strokeStyle = env.accent; ctx.lineWidth = 5 * this.scale;
        ctx.beginPath();
        ctx.moveTo(s.x, baseY); ctx.lineTo(s.x, baseY - 220 * this.scale);
        ctx.lineTo(s.x + 150 * this.scale, baseY - 200 * this.scale); ctx.stroke();
        ctx.fillStyle = env.haze;
      }
    } else {
      // city / station / rooftop — building blocks
      let seed = 7;
      for (let wx = 80; wx < WORLD_W; wx += 150) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const h = 110 + (seed % 160);
        const s = this.worldToScreen(wx, GROUND_Y);
        ctx.fillRect(s.x, baseY - h * this.scale, 130 * this.scale, h * this.scale);
        // windows
        ctx.fillStyle = this.m.night ? 'rgba(255,221,120,0.5)' : 'rgba(255,255,255,0.06)';
        for (let yy = 14; yy < h - 10; yy += 28) {
          for (let xx = 16; xx < 120; xx += 30) {
            if (((seed >> (xx % 7)) & 1) === 1)
              ctx.fillRect(s.x + xx * this.scale, baseY - (h - yy) * this.scale, 12 * this.scale, 14 * this.scale);
          }
        }
        ctx.fillStyle = env.haze;
      }
    }
  }

  private drawProps(ctx: CanvasRenderingContext2D, env: { accent: string; id: string }, horizon: number) {
    // a few foreground cover blocks / crates
    ctx.fillStyle = env.accent;
    // peek cover for rooftop eliminate
    for (const a of this.actors) {
      if (a.behavior === 'peek' && a.coverX !== undefined) {
        const s = this.worldToScreen(a.coverX, GROUND_Y);
        const w = ACTOR_BODY_W * a.scale * 1.6, h = ACTOR_BODY_H * a.scale * 0.9;
        ctx.fillStyle = '#2b3550';
        ctx.fillRect(s.x - w / 2, s.y - h, w, h);
        ctx.fillStyle = '#1f2740';
        ctx.fillRect(s.x - w / 2, s.y - h, w, 8 * this.scale);
      }
    }
    void env; void horizon;
  }

  private drawActors(ctx: CanvasRenderingContext2D) {
    const sorted = [...this.actors].sort((a, b) => b.depth - a.depth);
    for (const a of sorted) {
      if (!a.alive) continue;
      if (a.behavior === 'peek' && !a.visible) continue;
      this.drawActor(ctx, a);
    }
    // draw peeking covers AGAIN in front so hidden bodies are masked
    for (const a of sorted) {
      if (a.behavior === 'peek' && a.coverX !== undefined) {
        const s = this.worldToScreen(a.coverX, GROUND_Y);
        const w = ACTOR_BODY_W * a.scale * 1.6, h = ACTOR_BODY_H * a.scale * 0.55;
        ctx.fillStyle = '#2b3550';
        ctx.fillRect(s.x - w / 2, s.y - h, w, h);
      }
    }
  }

  private drawActor(ctx: CanvasRenderingContext2D, a: Actor) {
    const feet = this.worldToScreen(a.x, a.y);
    const sc = a.scale * this.scale;
    const bodyH = ACTOR_BODY_H * sc, bodyW = ACTOR_BODY_W * sc, headR = ACTOR_HEAD_R * sc;
    if (feet.x < -120 || feet.x > this.cw + 120) return;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(feet.x, feet.y, bodyW * 0.7, bodyW * 0.22, 0, 0, Math.PI * 2); ctx.fill();

    const topY = feet.y - bodyH;
    const sway = Math.sin(a.phase) * (a.behavior === 'run' || a.behavior === 'ride' ? 6 : 2) * sc * 0.1;
    const col = ROLE_COLORS[a.role];

    // legs
    ctx.strokeStyle = '#1f2533'; ctx.lineWidth = Math.max(2, bodyW * 0.22); ctx.lineCap = 'round';
    const stride = (a.behavior === 'run' ? Math.sin(a.phase) : 0) * bodyW * 0.4;
    ctx.beginPath(); ctx.moveTo(feet.x - bodyW * 0.18, feet.y - bodyH * 0.45);
    ctx.lineTo(feet.x - bodyW * 0.18 + stride, feet.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(feet.x + bodyW * 0.18, feet.y - bodyH * 0.45);
    ctx.lineTo(feet.x + bodyW * 0.18 - stride, feet.y); ctx.stroke();

    // body
    ctx.fillStyle = col;
    this.roundRect(ctx, feet.x - bodyW / 2 + sway, topY, bodyW, bodyH * 0.62, bodyW * 0.28);
    ctx.fill();

    // arms
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, bodyW * 0.2);
    ctx.beginPath(); ctx.moveTo(feet.x - bodyW * 0.4 + sway, topY + bodyH * 0.12);
    ctx.lineTo(feet.x - bodyW * 0.5 + sway, topY + bodyH * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(feet.x + bodyW * 0.4 + sway, topY + bodyH * 0.12);
    ctx.lineTo(feet.x + bodyW * 0.5 + sway, topY + bodyH * 0.4); ctx.stroke();

    // head
    const hc = { x: feet.x + sway, y: topY - headR };
    ctx.fillStyle = '#f1c9a5';
    ctx.beginPath(); ctx.arc(hc.x, hc.y, headR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1f2533';
    ctx.beginPath(); ctx.arc(hc.x + a.facing * headR * 0.3, hc.y - headR * 0.1, Math.max(1, headR * 0.12), 0, Math.PI * 2); ctx.fill();

    // emoji accent (vehicle / item)
    if (sc > 0.5 && a.emoji && (a.behavior === 'ride' || a.behavior === 'run' || a.role === 'civilian')) {
      ctx.font = `${Math.max(12, headR * 1.4)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (a.behavior === 'ride') ctx.fillText(a.emoji, feet.x, feet.y - bodyH * 0.2);
      else if (a.role === 'civilian') ctx.fillText('•', feet.x, hc.y);
    }

    this.drawMarker(ctx, a, hc, headR);
  }

  private drawMarker(ctx: CanvasRenderingContext2D, a: Actor, hc: { x: number; y: number }, headR: number) {
    const hi = this.settings.highContrast;
    const my = hc.y - headR - 22;
    const pulse = 0.6 + 0.4 * Math.sin(this.t / 200);
    if (this.isValid(a.role)) {
      // red diamond "shoot" marker
      ctx.save();
      ctx.translate(hc.x, my); ctx.rotate(Math.PI / 4);
      const r = 9 + pulse * 3;
      ctx.fillStyle = '#dc2626'; ctx.globalAlpha = 0.55 + pulse * 0.45;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      if (hi) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-r, -r, r * 2, r * 2); }
      ctx.restore();
      ctx.globalAlpha = 1;
      if (a.number) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(a.number), hc.x, my);
      }
    } else if (a.role === 'vip') {
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = hi ? 4 : 3;
      ctx.beginPath(); ctx.arc(hc.x, hc.y, headR + 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#22d3ee'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('VIP', hc.x, my);
    } else if (a.role === 'decoy') {
      ctx.save();
      ctx.translate(hc.x, my); ctx.rotate(Math.PI / 4);
      const r = 9;
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = hi ? 4 : 2.5;
      ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.restore();
      ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', hc.x, my);
    }
  }

  private drawTint(ctx: CanvasRenderingContext2D) {
    if (this.m.night) { ctx.fillStyle = 'rgba(6,10,30,0.5)'; ctx.fillRect(0, 0, this.cw, this.ch); }
    const fog = this.m.fog * (this.steadyActive ? 0.4 : 1);
    if (fog > 0) { ctx.fillStyle = `rgba(205,214,224,${fog * 0.6})`; ctx.fillRect(0, 0, this.cw, this.ch); }
  }

  private drawEffects(ctx: CanvasRenderingContext2D) {
    // bullet tracer
    if (this.tracer) {
      ctx.strokeStyle = `rgba(255,238,170,${this.tracer.life / 120 * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.cw / 2, this.ch); ctx.lineTo(this.tracer.x, this.tracer.y); ctx.stroke();
    }
    for (const s of this.sparks) {
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const mk of this.markers) {
      ctx.globalAlpha = Math.max(0, mk.life / 500);
      ctx.strokeStyle = mk.ok ? '#34d399' : '#cbd5e1'; ctx.lineWidth = 3;
      const r = 9;
      ctx.beginPath();
      ctx.moveTo(mk.x - r, mk.y - r); ctx.lineTo(mk.x + r, mk.y + r);
      ctx.moveTo(mk.x + r, mk.y - r); ctx.lineTo(mk.x - r, mk.y + r); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const f of this.floats) {
      ctx.globalAlpha = Math.min(1, f.life / 600);
      ctx.fillStyle = f.color; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    // muzzle flash
    if (this.muzzleMs > 0) {
      const a = this.muzzleMs / 90;
      const g = ctx.createRadialGradient(this.cw / 2, this.ch / 2, 0, this.cw / 2, this.ch / 2, 160);
      g.addColorStop(0, `rgba(255,245,200,${a * 0.5})`); g.addColorStop(1, 'rgba(255,245,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.cw, this.ch);
    }
  }

  private drawScope(ctx: CanvasRenderingContext2D) {
    const { cw, ch } = this;
    const cx = cw / 2, cy = ch / 2;
    const R = Math.min(cw, ch) * 0.46;

    // darken outside the scope circle
    ctx.save();
    ctx.fillStyle = `rgba(2,4,10,${this.settings.scopeOpacity})`;
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.arc(cx, cy, R, 0, Math.PI * 2, true); // counter-clockwise hole
    ctx.fill('evenodd');
    ctx.restore();

    // lens vignette inside
    const lg = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
    lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // scope ring
    ctx.strokeStyle = 'rgba(10,12,18,0.95)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,140,160,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    // reticle
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    const steady = this.steadyActive;
    ctx.strokeStyle = steady ? 'rgba(52,211,153,0.85)' : 'rgba(225,232,240,0.7)';
    ctx.lineWidth = 1.4;
    const gap = 14;
    // crosshair
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + R);
    ctx.stroke();
    // mil dots / ranging marks
    ctx.fillStyle = steady ? 'rgba(52,211,153,0.8)' : 'rgba(225,232,240,0.6)';
    for (let i = 1; i <= 5; i++) {
      const d = gap + i * (R - gap) / 6;
      for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
        ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    // centre dot
    ctx.fillStyle = steady ? '#34d399' : '#ef4444';
    ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    this.drawOffscreenArrow(ctx, cx, cy, R);
  }

  private drawOffscreenArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
    // point toward the nearest valid, visible target if it's outside the scope
    let best: Actor | null = null; let bestD = Infinity;
    for (const a of this.actors) {
      if (!a.alive || !a.visible || !this.isValid(a.role)) continue;
      const hp = this.headWorld(a); const s = this.worldToScreen(hp.x, hp.y);
      const d = Math.hypot(s.x - cx, s.y - cy);
      if (d > R - 20 && d < bestD) { bestD = d; best = a; }
    }
    if (!best) return;
    const hp = this.headWorld(best); const s = this.worldToScreen(hp.x, hp.y);
    const ang = Math.atan2(s.y - cy, s.x - cx);
    const ax = cx + Math.cos(ang) * (R - 26), ay = cy + Math.sin(ang) * (R - 26);
    ctx.save();
    ctx.translate(ax, ay); ctx.rotate(ang);
    ctx.fillStyle = `rgba(220,38,38,${0.6 + 0.4 * Math.sin(this.t / 180)})`;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
