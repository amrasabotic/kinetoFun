import type { HandData } from '../gestures/useMediaPipe';
import type {
  GameState, Ball, Paddle, Particle, Target, ScoreEvent, ReplayFrame,
  GameMode, AIDifficulty, ArenaId, StageMod, MatchPhase, Vec3,
} from '../types';
import {
  TABLE_HALF_W, TABLE_HALF_L, NET_HEIGHT, NET_Y, NET_THICKNESS,
  BALL_RADIUS, GRAVITY, BOUNCE_RESTITUTION, AIR_DRAG,
  PADDLE_W, PADDLE_H, PADDLE_THICKNESS,
  PLAYER_PADDLE_Y_BASE, AI_PADDLE_Y_BASE, PLAYER_PADDLE_Z,
  SWING_POWER_FACTOR, SPIN_FACTOR, SPIN_FLIGHT_EFFECT, SPIN_BOUNCE_EFFECT,
  MIN_BALL_SPEED, MAX_BALL_SPEED, RALLY_SPEED_INCREMENT,
  POWER_SHOT_MULTIPLIER, POWER_SHOT_CHARGE_TIME, POWER_SHOT_COOLDOWN,
  HAND_X_SCALE, HAND_Z_MIN, HAND_Z_MAX,
  SWING_SPEED_SMASH, SWING_SPEED_POWER,
  POINTS_TO_WIN, WIN_BY, COMBO_MULTIPLIERS,
  AI_PROFILES, DIFFICULTY_AI_MAP, ARCADE_STAGES,
} from '../constants/gameConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo: number, hi: number) { return lo + Math.random() * (hi - lo); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function len3(v: Vec3) { return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); }
function add3(a: Vec3, b: Vec3): Vec3 { return { x: a.x+b.x, y: a.y+b.y, z: a.z+b.z }; }

function mkBall(): Ball {
  return {
    pos: { x: 0, y: PLAYER_PADDLE_Y_BASE + 0.1, z: PLAYER_PADDLE_Z + 0.05 },
    vel: { x: 0, y: 0, z: 0 },
    spin: { x: 0, y: 0, z: 0 },
    radius: BALL_RADIUS,
    bounceCount: 0,
    lastHitBy: null,
    isActive: false,
  };
}

function mkPaddle(yPos: number): Paddle {
  return {
    pos: { x: 0, y: yPos, z: PLAYER_PADDLE_Z },
    angle: 0,
    vel: { x: 0, y: 0, z: 0 },
    width: PADDLE_W, height: PADDLE_H, thickness: PADDLE_THICKNESS,
  };
}

function mkParticle(
  x: number, y: number, vx: number, vy: number,
  color: string, size: number, life: number,
  type: Particle['type'] = 'spark',
  gravity = false,
): Particle {
  return { x, y, vx, vy, color, size, life, maxLife: life, alpha: 1, type, gravity };
}

// ── GameEngine ────────────────────────────────────────────────────────────────
export class GameEngine {
  state: GameState;
  private aiProfile = AI_PROFILES['balanced'];
  private prevHandX = 0.5;
  private prevHandY = 0.5;
  private handLostTimer = 0;
  private serveLaunchTimer = 0;
  private fistHeldTime = 0;
  private rallyStartTime = 0;
  private gestureSensitivity = 1.0;

  constructor(mode: GameMode, difficulty: AIDifficulty, arenaId: ArenaId, gestureSensitivity = 1.0) {
    const personality = DIFFICULTY_AI_MAP[difficulty];
    this.aiProfile = AI_PROFILES[personality];
    this.gestureSensitivity = gestureSensitivity;

    const paddleW = mode === 'smash' ? PADDLE_W * 1.3 : PADDLE_W;

    this.state = {
      mode, arenaId, difficulty,
      phase: 'countdown',
      ball: mkBall(),
      playerPaddle: { ...mkPaddle(PLAYER_PADDLE_Y_BASE), width: paddleW, height: PADDLE_H },
      aiPaddle: mkPaddle(AI_PADDLE_Y_BASE),
      score: { player: 0, ai: 0, serves: 0, isPlayerServing: true, sets: [] },
      combo: 0, maxCombo: 0, rallyCount: 0, longestRally: 0,
      powerShotCharge: 0, powerShotCooldown: 0, isPowerShot: false, isChargingPower: false,
      scoreEvents: [], particles: [], targets: [],
      countdown: 3, countdownTimer: 1.0,
      handDetected: false,
      swingSpeed: 0, currentSpin: 0,
      stageNumber: mode === 'arcade' ? 1 : 0,
      stageMods: [],
      survivalScore: 0, survivalTime: 0,
      smashScore: 0, smashCount: 0,
      precisionScore: 0, precisionCombo: 0,
      timeLeft: mode === 'smash' ? 60 : mode === 'precision' ? 90 : 999,
      matchWon: false, matchLost: false,
      pointWonTimer: 0, lastPointWinner: null,
      replayBuffer: [],
      isReplaying: false,
      cameraShake: 0,
      slowMotion: 1,
      tableMoveOffset: 0, windForce: 0,
      perfectHitFlash: 0,
      coins: 0,
      tournamentRound: 0, tournamentWins: 0,
    };

    if (mode === 'arcade') {
      this.applyStage(1);
    }
    if (mode === 'precision') {
      this.spawnTargets();
    }
  }

  // ── Main update ─────────────────────────────────────────────────────────────
  update(dt: number, hand: HandData): void {
    const gs = this.state;
    if (gs.phase === 'matchOver') return;
    if (gs.isReplaying) { this.updateReplay(dt); return; }

    // Hand-lost tracking
    if (!hand.detected) {
      this.handLostTimer += dt;
      if (this.handLostTimer > 2 && gs.phase === 'rally') gs.phase = 'paused';
    } else {
      this.handLostTimer = 0;
      if (gs.phase === 'paused') gs.phase = 'rally';
    }
    gs.handDetected = hand.detected;

    // Slow motion decay
    if (gs.slowMotion < 1) gs.slowMotion = Math.min(1, gs.slowMotion + dt * 2);
    const eff = dt * gs.slowMotion;

    // Camera shake decay
    gs.cameraShake = Math.max(0, gs.cameraShake - dt * 5);

    // Perfect hit flash
    gs.perfectHitFlash = Math.max(0, gs.perfectHitFlash - dt * 3);

    switch (gs.phase) {
      case 'countdown':   this.updateCountdown(eff); break;
      case 'serving':     this.updateServing(eff, hand); break;
      case 'rally':       this.updateRally(eff, hand); break;
      case 'pointWon':    this.updatePointWon(eff); break;
      default: break;
    }

    this.updateParticles(eff);
    this.updateScoreEvents(eff);

    // Mode-specific timers
    if ((gs.mode === 'smash' || gs.mode === 'precision' || gs.mode === 'survival') && gs.phase === 'rally') {
      if (gs.mode !== 'survival') {
        gs.timeLeft = Math.max(0, gs.timeLeft - eff);
        if (gs.timeLeft <= 0) this.endTimedMode();
      } else {
        gs.survivalTime += eff;
      }
    }
  }

  // ── Countdown ───────────────────────────────────────────────────────────────
  private updateCountdown(dt: number) {
    const gs = this.state;
    gs.countdownTimer -= dt;
    if (gs.countdownTimer <= 0) {
      gs.countdown--;
      gs.countdownTimer = 1.0;
      if (gs.countdown <= 0) {
        gs.phase = 'serving';
        this.serveLaunchTimer = 0.8;
        this.resetBallToServer();
      }
    }
  }

  // ── Serving ─────────────────────────────────────────────────────────────────
  private updateServing(dt: number, hand: HandData) {
    const gs = this.state;
    // Position ball near server
    const serving = gs.score.isPlayerServing;
    const b = gs.ball;

    if (serving) {
      // Ball floats in front of player
      const targetX = (0.5 - hand.palmX) * HAND_X_SCALE * this.gestureSensitivity;
      b.pos.x = lerp(b.pos.x, clamp(targetX, -TABLE_HALF_W + 0.1, TABLE_HALF_W - 0.1), 0.15);
      b.pos.y = PLAYER_PADDLE_Y_BASE + 0.3;
      b.pos.z = 0.35 + Math.sin(this.serveLaunchTimer * 3) * 0.03;
    }

    this.serveLaunchTimer -= dt;
    if (this.serveLaunchTimer <= 0) {
      this.launchBall(serving);
      gs.phase = 'rally';
      gs.ball.isActive = true;
      this.rallyStartTime = performance.now();
    }
  }

  private resetBallToServer() {
    const gs = this.state;
    const b = gs.ball;
    b.pos = { x: 0, y: gs.score.isPlayerServing ? PLAYER_PADDLE_Y_BASE + 0.1 : AI_PADDLE_Y_BASE - 0.1, z: 0.25 };
    b.vel = { x: 0, y: 0, z: 0 };
    b.spin = { x: 0, y: 0, z: 0 };
    b.bounceCount = 0;
    b.lastHitBy = null;
    b.isActive = false;
  }

  private launchBall(fromPlayer: boolean) {
    const gs = this.state;
    const b = gs.ball;

    // Determine speed based on rally length / mode
    let baseSpeed = 5.0 + gs.rallyCount * RALLY_SPEED_INCREMENT;
    if (gs.mode === 'arcade') baseSpeed *= this.getModMultiplier();
    baseSpeed = clamp(baseSpeed, MIN_BALL_SPEED, MAX_BALL_SPEED);

    const dirY = fromPlayer ? 1 : -1;
    const offX = rand(-0.15, 0.15);
    const landY = dirY * (TABLE_HALF_L * rand(0.3, 0.8));

    // Compute trajectory to land in opponent's half
    const dist = Math.abs(landY - b.pos.y);
    const vy = dirY * baseSpeed;
    const t = dist / Math.abs(vy);
    const vz = -GRAVITY * t / 2 - (b.pos.z / t); // parabolic arc

    b.vel = { x: offX, y: vy, z: Math.max(0.5, vz) };
    b.spin = { x: rand(-0.5, 0.5), y: 0, z: rand(-0.3, 0.3) };
  }

  // ── Rally ───────────────────────────────────────────────────────────────────

  private updateRally(dt: number, hand: HandData) {
    const gs = this.state;

    // Update player paddle from hand
    this.updatePlayerPaddleFromHand(dt, hand);

    // Update power shot
    this.updatePowerShot(dt, hand);

    // Update AI paddle
    this.updateAIPaddle(dt);

    // Update ball physics
    this.updateBallPhysics(dt);

    // Replay buffer
    if (gs.ball.isActive) {
      gs.replayBuffer.push({
        ball: { pos: { ...gs.ball.pos }, vel: { ...gs.ball.vel }, spin: { ...gs.ball.spin } },
        playerPaddle: { pos: { ...gs.playerPaddle.pos }, angle: gs.playerPaddle.angle },
        aiPaddle: { pos: { ...gs.aiPaddle.pos }, angle: gs.aiPaddle.angle },
        timestamp: performance.now(),
      });
      if (gs.replayBuffer.length > 180) gs.replayBuffer.shift();
    }

    // Arcade table movement
    if (gs.stageMods.includes('movingTable')) {
      gs.tableMoveOffset = Math.sin(performance.now() * 0.001) * 0.3;
    }
    if (gs.stageMods.includes('wind')) {
      gs.windForce = Math.sin(performance.now() * 0.0005) * 1.5;
    }
  }

  private updatePlayerPaddleFromHand(dt: number, hand: HandData) {
    const gs = this.state;
    const p = gs.playerPaddle;
    const sens = this.gestureSensitivity;

    if (!hand.detected) return;

    // Map hand position to world coordinates
    // palmX: 0=right side of image (player's left), 1=left side of image (player's right)
    // We mirror so moving hand right in real world → moves paddle right on table
    const targetX = (0.5 - hand.palmX) * HAND_X_SCALE * sens;
    // palmY: 0=top (raised), 1=bottom (lowered) → z (height)
    const targetZ = lerp(HAND_Z_MIN, HAND_Z_MAX, clamp(1 - hand.palmY, 0, 1)) * sens;

    // Smooth paddle movement
    const prevX = p.pos.x;
    const prevZ = p.pos.z;
    p.pos.x = lerp(p.pos.x, clamp(targetX, -TABLE_HALF_W + PADDLE_W/2, TABLE_HALF_W - PADDLE_W/2), 0.4);
    p.pos.z = lerp(p.pos.z, clamp(targetZ, HAND_Z_MIN, HAND_Z_MAX), 0.4);
    p.pos.y = PLAYER_PADDLE_Y_BASE;

    // Paddle velocity
    p.vel.x = (p.pos.x - prevX) / Math.max(dt, 0.001);
    p.vel.z = (p.pos.z - prevZ) / Math.max(dt, 0.001);

    // Wrist angle → paddle tilt
    p.angle = lerp(p.angle, hand.wristAngle, 0.3);

    // Swing speed from hand velocity
    const hv = Math.sqrt(hand.velocityX ** 2 + hand.velocityY ** 2);
    gs.swingSpeed = lerp(gs.swingSpeed, hv, 0.3);
    gs.currentSpin = clamp(hand.wristAngle / (Math.PI / 3), -1, 1);

    this.prevHandX = hand.palmX;
    this.prevHandY = hand.palmY;
  }

  private updatePowerShot(dt: number, hand: HandData) {
    const gs = this.state;

    if (gs.powerShotCooldown > 0) {
      gs.powerShotCooldown = Math.max(0, gs.powerShotCooldown - dt);
    }

    if (hand.isFist && gs.powerShotCooldown <= 0) {
      gs.isChargingPower = true;
      gs.powerShotCharge = Math.min(1, gs.powerShotCharge + dt / POWER_SHOT_CHARGE_TIME);
    } else if (gs.isChargingPower && !hand.isFist) {
      gs.isChargingPower = false;
      if (gs.powerShotCharge >= 0.8) {
        gs.isPowerShot = true;
        setTimeout(() => { gs.isPowerShot = false; }, 500);
        gs.powerShotCooldown = POWER_SHOT_COOLDOWN;
      }
      gs.powerShotCharge = 0;
    }

    if (!hand.isFist) {
      gs.isChargingPower = false;
    }
  }

  // ── Ball Physics ─────────────────────────────────────────────────────────────
  private updateBallPhysics(dt: number) {
    const gs = this.state;
    const b = gs.ball;
    if (!b.isActive) return;

    const gravity = GRAVITY;

    // Wind effect
    if (gs.stageMods.includes('wind')) {
      b.vel.x += gs.windForce * dt;
    }

    // Spin effects in flight (Magnus effect)
    b.vel.z -= b.spin.x * SPIN_FLIGHT_EFFECT * dt; // topspin dips faster
    b.vel.x += b.spin.z * SPIN_FLIGHT_EFFECT * dt; // sidespin curves

    // Gravity
    b.vel.z += gravity * dt;

    // Air drag
    b.vel.x *= (1 - AIR_DRAG);
    b.vel.y *= (1 - AIR_DRAG);
    b.vel.z *= (1 - AIR_DRAG * 0.5);

    // Move ball
    b.pos.x += b.vel.x * dt;
    b.pos.y += b.vel.y * dt;
    b.pos.z += b.vel.z * dt;

    // Table x-bounds (sidewall)
    if (Math.abs(b.pos.x) > TABLE_HALF_W + b.radius) {
      this.handleBallOut('side');
      return;
    }

    // Table bounce
    if (b.pos.z <= b.radius) {
      this.handleTableBounce();
    }

    // Net collision
    this.checkNetCollision();

    // Paddle collisions
    this.checkPlayerPaddleCollision();
    this.checkAIPaddleCollision();

    // Ball went out past back lines
    if (b.pos.y > TABLE_HALF_L + 0.3) {
      // Ball passed AI's end
      if (b.lastHitBy === 'player') {
        // Check if it bounced on AI side before going out
        if (b.bounceCount >= 2 && b.pos.y > AI_PADDLE_Y_BASE) {
          this.awardPoint('player', 'Winner!');
        } else {
          this.awardPoint('player', 'Point!');
        }
      } else {
        this.awardPoint('ai', 'Out!');
      }
      return;
    }
    if (b.pos.y < -TABLE_HALF_L - 0.3) {
      // Ball passed player's end
      if (b.lastHitBy === 'ai') {
        this.awardPoint('ai', 'Point!');
      } else {
        this.awardPoint('player', 'Fault!');
      }
      return;
    }

    // Ball fell off table without bouncing
    if (b.pos.z < -0.5) {
      if (b.lastHitBy === 'player') this.awardPoint('ai', 'Net!');
      else this.awardPoint('player', 'Net!');
    }
  }

  private handleTableBounce() {
    const gs = this.state;
    const b = gs.ball;

    if (!this.isOnTableSurface(b.pos.x, b.pos.y)) {
      // Missed the table — ball hit the floor
      if (b.pos.z <= -0.05) {
        b.vel.z = 0; b.vel.y *= 0.3;
      }
      return;
    }

    b.pos.z = b.radius;
    const prevVz = b.vel.z;
    b.vel.z = Math.abs(prevVz) * BOUNCE_RESTITUTION;

    // Spin effect on bounce (topspin accelerates, backspin decelerates)
    b.vel.y += b.spin.x * SPIN_BOUNCE_EFFECT * 0.1;
    b.vel.x += b.spin.z * SPIN_BOUNCE_EFFECT * 0.05;

    // Random bounce modifier
    if (gs.stageMods.includes('randomBounce') && Math.random() < 0.3) {
      b.vel.x += rand(-1.5, 1.5);
      b.vel.z += rand(0.5, 1.5);
    }

    // Friction
    b.vel.x *= 0.97;
    b.vel.y *= 0.97;
    b.spin.x *= 0.7;
    b.spin.z *= 0.7;

    b.bounceCount++;

    // Spawn dust particles
    const { x: sx, y: sy } = this.worldToScreen(b.pos.x, b.pos.y, 0);
    for (let i = 0; i < 6; i++) {
      gs.particles.push(mkParticle(sx, sy, rand(-30, 30), rand(-20, -5), '#ffffff44', rand(2, 5), rand(0.3, 0.6), 'dust'));
    }

    // If ball bounces twice on same side → point for opponent
    const isPlayerSide = b.pos.y < NET_Y;
    if (b.bounceCount >= 2) {
      if (isPlayerSide && b.lastHitBy === 'ai') {
        this.awardPoint('ai', 'Two Bounces!');
      } else if (!isPlayerSide && b.lastHitBy === 'player') {
        this.awardPoint('player', 'Winner!');
      }
    }
  }

  private isOnTableSurface(x: number, y: number): boolean {
    return Math.abs(x) <= TABLE_HALF_W && Math.abs(y) <= TABLE_HALF_L;
  }

  private checkNetCollision() {
    const b = this.state.ball;
    // Check if ball crossed net
    if (b.vel.y > 0 && b.pos.y >= NET_Y - NET_THICKNESS && b.pos.y <= NET_Y + NET_THICKNESS) {
      if (b.pos.z < NET_HEIGHT + b.radius) {
        // Ball hit net
        b.vel.y *= -0.2;
        b.vel.z = Math.max(0, b.vel.z + 0.5);
        if (b.lastHitBy === 'player') {
          this.addScoreEvent('Net!', 0, b.pos.x, b.pos.y, '#ff4444');
        }
        this.awardPoint('ai', 'Net!');
      }
    }
    if (b.vel.y < 0 && b.pos.y >= NET_Y - NET_THICKNESS && b.pos.y <= NET_Y + NET_THICKNESS) {
      if (b.pos.z < NET_HEIGHT + b.radius) {
        b.vel.y *= -0.2;
        b.vel.z = Math.max(0, b.vel.z + 0.5);
        this.awardPoint('player', 'Net!');
      }
    }
  }

  private checkPlayerPaddleCollision() {
    const gs = this.state;
    const b = gs.ball;
    const p = gs.playerPaddle;
    if (!b.isActive) return;

    // Ball must be moving toward player (negative y) or near player's end
    if (b.vel.y > 0.5 && b.pos.y > PLAYER_PADDLE_Y_BASE + 0.3) return;

    const dx = Math.abs(b.pos.x - p.pos.x);
    const dz = Math.abs(b.pos.z - p.pos.z);
    const dy = Math.abs(b.pos.y - p.pos.y);

    const pw = (gs.stageMods.includes('smallPaddle') ? p.width * 0.6 : p.width) / 2;
    const ph = p.height / 2;

    if (dx <= pw + b.radius && dz <= ph + b.radius && dy <= PADDLE_THICKNESS + b.radius) {
      if (b.lastHitBy === 'player') return; // prevent double-hits

      this.applyPlayerHit(p);
    }
  }

  private applyPlayerHit(p: Paddle) {
    const gs = this.state;
    const b = gs.ball;

    // Push ball out of paddle
    b.pos.y = p.pos.y + PADDLE_THICKNESS + b.radius + 0.01;

    // Detect swing speed
    const paddleVelMag = Math.sqrt(p.vel.x**2 + p.vel.z**2);
    const isSmash = paddleVelMag > SWING_SPEED_SMASH || gs.swingSpeed > SWING_SPEED_SMASH;
    const isPower = gs.isPowerShot || gs.swingSpeed > SWING_SPEED_POWER;

    // Base speed
    let speed = MIN_BALL_SPEED + paddleVelMag * SWING_POWER_FACTOR + gs.swingSpeed * 0.5;
    if (isPower) speed *= POWER_SHOT_MULTIPLIER * 0.8;
    if (isSmash) speed *= 1.3;
    speed = clamp(speed, MIN_BALL_SPEED, MAX_BALL_SPEED);
    if (gs.stageMods.includes('fastBall')) speed *= 1.4;

    // Direction: reflect toward opponent with paddle angle influence
    const angleFactor = Math.sin(p.angle) * 0.5;
    const paddleHitX = (b.pos.x - p.pos.x) / (p.width / 2); // -1 to 1

    b.vel.x = paddleHitX * speed * 0.4 + p.vel.x * 0.6 + angleFactor * speed;
    b.vel.y = speed * 0.8; // toward opponent
    b.vel.z = Math.max(0.8, p.vel.z * 0.5 + 1.2); // upward to clear net

    // Spin from wrist angle
    const spinMult = gs.stageMods.includes('moreSpin') ? 2.0 : 1.0;
    b.spin.x = p.angle * SPIN_FACTOR * spinMult;  // topspin/backspin
    b.spin.z = p.vel.x * 0.5;                     // sidespin from horizontal move

    b.lastHitBy = 'player';
    b.bounceCount = 0;

    // Combo
    gs.combo++;
    gs.rallyCount++;
    if (gs.combo > gs.maxCombo) gs.maxCombo = gs.combo;
    if (gs.rallyCount > gs.longestRally) gs.longestRally = gs.rallyCount;

    // Perfect hit detection
    const isPerfect = Math.abs(b.pos.x - p.pos.x) < p.width * 0.15 && Math.abs(b.pos.z - p.pos.z) < p.height * 0.15;
    if (isPerfect) {
      this.triggerPerfectHit(b.pos.x, b.pos.y);
    }

    // Score events
    const comboIdx = Math.min(gs.combo - 1, COMBO_MULTIPLIERS.length - 1);
    const comboMult = COMBO_MULTIPLIERS[comboIdx];

    if (isSmash) {
      gs.smashScore += Math.round(50 * comboMult);
      gs.smashCount++;
      this.addScoreEvent('SMASH!', Math.round(50 * comboMult), b.pos.x, b.pos.y, '#ff4400');
      gs.cameraShake = 8;
      gs.slowMotion = 0.3;
      this.spawnSmashBurst(b.pos);
    } else if (isPower) {
      gs.powerShotCharge = 0;
      this.addScoreEvent('POWER!', Math.round(20 * comboMult), b.pos.x, b.pos.y, '#7c3aed');
      this.spawnEnergyBurst(b.pos);
    } else if (gs.combo >= 5) {
      this.addScoreEvent(`×${gs.combo} COMBO!`, Math.round(10 * comboMult), b.pos.x, b.pos.y, '#22d3ee');
    }

    // Trick shot detection
    this.detectTrickShot(b);

    // Target hit check (precision mode)
    if (gs.mode === 'precision') {
      this.checkTargetPrediction(b);
    }
  }

  private checkAIPaddleCollision() {
    const gs = this.state;
    const b = gs.ball;
    const ai = gs.aiPaddle;
    if (!b.isActive || b.lastHitBy === 'ai') return;

    const dx = Math.abs(b.pos.x - ai.pos.x);
    const dz = Math.abs(b.pos.z - ai.pos.z);
    const dy = Math.abs(b.pos.y - ai.pos.y);

    if (dx <= ai.width/2 + b.radius && dz <= ai.height/2 + b.radius && dy <= PADDLE_THICKNESS + b.radius) {
      this.applyAIHit(ai);
    }
  }

  private applyAIHit(ai: Paddle) {
    const gs = this.state;
    const b = gs.ball;
    const profile = this.aiProfile;

    b.pos.y = ai.pos.y - PADDLE_THICKNESS - b.radius - 0.01;

    let speed = MIN_BALL_SPEED + gs.rallyCount * RALLY_SPEED_INCREMENT * 0.8;
    speed = clamp(speed, MIN_BALL_SPEED, MAX_BALL_SPEED * 0.9);

    const paddleHitX = (b.pos.x - ai.pos.x) / (ai.width / 2);
    const spinY = profile.spinFactor * (Math.random() * 2 - 1) * (gs.stageMods.includes('moreSpin') ? 2 : 1);

    b.vel.x = paddleHitX * speed * 0.35 + (Math.random() - 0.5) * 0.8;
    b.vel.y = -speed * 0.8; // toward player
    b.vel.z = Math.max(0.6, 1.0 + Math.random() * 0.5);
    b.spin.x = spinY;
    b.spin.z = (Math.random() - 0.5) * profile.spinFactor;

    // Smash attempt
    if (gs.rallyCount > 3 && Math.random() < 0.2 && profile.smashThreshold < 5) {
      b.vel.y *= 1.4;
      b.vel.z = 1.5;
      b.spin.x = 2.0;
    }

    b.lastHitBy = 'ai';
    b.bounceCount = 0;
  }

  // ── AI Paddle ────────────────────────────────────────────────────────────────
  private updateAIPaddle(dt: number) {
    const gs = this.state;
    const b = gs.ball;
    const ai = gs.aiPaddle;
    const profile = this.aiProfile;

    if (!b.isActive || b.vel.y >= 0) {
      // Ball moving away — return to center or defensive position
      ai.vel.x = (0 - ai.pos.x) * 3;
      ai.vel.z = (PLAYER_PADDLE_Z - ai.pos.z) * 3;
      ai.pos.x = lerp(ai.pos.x, 0, dt * 2.5);
      ai.pos.z = lerp(ai.pos.z, PLAYER_PADDLE_Z, dt * 2.5);
      ai.pos.y = AI_PADDLE_Y_BASE;
      return;
    }

    // Predict where ball will be when it reaches AI's end
    const targetX = this.predictBallX(b, AI_PADDLE_Y_BASE, profile.predictionDepth);
    const targetZ = this.predictBallZ(b, AI_PADDLE_Y_BASE);

    // Apply error based on difficulty
    const errorX = (Math.random() - 0.5) * profile.errorRate * TABLE_HALF_W;
    const errorZ = (Math.random() - 0.5) * profile.errorRate * 0.2;

    const desiredX = clamp(targetX + errorX, -TABLE_HALF_W + ai.width/2, TABLE_HALF_W - ai.width/2);
    const desiredZ = clamp(targetZ + errorZ, HAND_Z_MIN, HAND_Z_MAX);

    // Move toward target with max speed
    const dxToTarget = desiredX - ai.pos.x;
    const dzToTarget = desiredZ - ai.pos.z;
    const moveX = clamp(dxToTarget, -profile.maxSpeed * dt, profile.maxSpeed * dt);
    const moveZ = clamp(dzToTarget, -profile.maxSpeed * dt, profile.maxSpeed * dt);

    ai.vel.x = moveX / Math.max(dt, 0.001);
    ai.vel.z = moveZ / Math.max(dt, 0.001);
    ai.pos.x += moveX;
    ai.pos.z += moveZ;
    ai.pos.y = AI_PADDLE_Y_BASE;

    // AI wrist angle for spin
    ai.angle = profile.spinFactor * Math.sin(performance.now() * 0.001) * 0.3;
  }

  private predictBallX(b: Ball, targetY: number, frames: number): number {
    let x = b.pos.x, y = b.pos.y, vx = b.vel.x, vy = b.vel.y;
    const dt = 1 / 60;
    for (let i = 0; i < frames; i++) {
      x += vx * dt;
      y += vy * dt;
      if (Math.abs(x) > TABLE_HALF_W) { vx = -vx; x = clamp(x, -TABLE_HALF_W, TABLE_HALF_W); }
      if (Math.abs(y) >= targetY) break;
    }
    return x;
  }

  private predictBallZ(b: Ball, targetY: number): number {
    let y = b.pos.y, z = b.pos.z, vy = b.vel.y, vz = b.vel.z;
    const dt = 1 / 60;
    for (let i = 0; i < 60; i++) {
      y += vy * dt;
      vz += GRAVITY * dt;
      z += vz * dt;
      if (z <= 0) { vz = Math.abs(vz) * BOUNCE_RESTITUTION; z = 0; }
      if (Math.abs(y) >= Math.abs(targetY)) break;
    }
    return clamp(z, HAND_Z_MIN, HAND_Z_MAX);
  }

  // ── Scoring ──────────────────────────────────────────────────────────────────
  private awardPoint(winner: 'player' | 'ai', label: string) {
    const gs = this.state;
    if (gs.phase !== 'rally') return;

    gs.ball.isActive = false;
    gs.ball.vel = { x: 0, y: 0, z: 0 };

    gs.lastPointWinner = winner;
    if (winner === 'player') {
      gs.score.player++;
      gs.coins += 5 + gs.combo * 2;
      const { x: sx, y: sy } = this.worldToScreen(0, 0, 0);
      this.addScoreEvent(label, gs.combo > 1 ? gs.combo * 5 : 0, gs.ball.pos.x, gs.ball.pos.y, '#4ade80');
      this.spawnConfetti(sx, sy);
    } else {
      gs.score.ai++;
      gs.combo = 0;
      this.addScoreEvent(label, 0, gs.ball.pos.x, gs.ball.pos.y, '#f87171');
    }

    gs.rallyCount = 0;
    gs.phase = 'pointWon';
    gs.pointWonTimer = 1.5;

    // Check match end
    const p = gs.score.player, a = gs.score.ai;
    const toWin = this.getPointsToWin();
    if ((p >= toWin || a >= toWin) && Math.abs(p - a) >= WIN_BY) {
      gs.matchWon = p > a;
      gs.matchLost = a > p;
      gs.phase = 'matchOver';
      if (gs.matchWon) this.spawnVictoryFireworks();
      // Report to KinetoFun
      try { window.parent.postMessage({ type: 'GAME_COMPLETE', score: p * 10 + gs.maxCombo }, '*'); } catch {}
    }

    // Switch serve every 2 points
    gs.score.serves++;
    if (gs.score.serves % 2 === 0) {
      gs.score.isPlayerServing = !gs.score.isPlayerServing;
    }
  }

  private getPointsToWin(): number {
    const gs = this.state;
    if (gs.mode === 'arcade') {
      return ARCADE_STAGES[Math.min(gs.stageNumber - 1, ARCADE_STAGES.length - 1)]?.targetScore ?? 5;
    }
    return POINTS_TO_WIN;
  }

  private updatePointWon(dt: number) {
    const gs = this.state;
    gs.pointWonTimer -= dt;
    if (gs.pointWonTimer <= 0) {
      // Next point
      gs.countdown = 3;
      gs.countdownTimer = 0.7;
      gs.phase = 'countdown';
      this.resetBallToServer();
    }
  }

  // ── Targets (Precision mode) ─────────────────────────────────────────────────
  private spawnTargets() {
    const gs = this.state;
    gs.targets = [];
    const types: Target['type'][] = ['static', 'static', 'moving', 'tiny', 'golden'];
    for (let i = 0; i < 5; i++) {
      const type = types[i];
      gs.targets.push({
        id: i,
        worldX: rand(-TABLE_HALF_W * 0.7, TABLE_HALF_W * 0.7),
        worldY: rand(NET_Y + 0.2, TABLE_HALF_L - 0.2),
        radius: type === 'tiny' ? 0.05 : type === 'golden' ? 0.06 : 0.1,
        type,
        points: type === 'golden' ? 50 : type === 'tiny' ? 30 : type === 'moving' ? 20 : 10,
        hit: false,
        moveDir: { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.3 },
        moveSpeed: type === 'moving' ? rand(0.2, 0.5) : 0,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private checkTargetPrediction(b: Ball) {
    // Will check after ball lands on opponent's side
    // For simplicity: check when ball bounces on AI's half
  }

  private checkTargetHit(ballX: number, ballY: number) {
    const gs = this.state;
    if (gs.mode !== 'precision') return;
    for (const t of gs.targets) {
      if (t.hit) continue;
      const d = Math.hypot(ballX - t.worldX, ballY - t.worldY);
      if (d <= t.radius + BALL_RADIUS) {
        t.hit = true;
        gs.precisionCombo++;
        const mult = COMBO_MULTIPLIERS[Math.min(gs.precisionCombo - 1, COMBO_MULTIPLIERS.length - 1)];
        const pts = Math.round(t.points * mult);
        gs.precisionScore += pts;
        gs.coins += Math.round(pts / 5);
        this.addScoreEvent(t.type === 'golden' ? '★ GOLDEN!' : 'TARGET!', pts, t.worldX, t.worldY, '#ffd700');
        if (gs.targets.every(tg => tg.hit)) {
          setTimeout(() => this.spawnTargets(), 1500);
        }
      }
    }
  }

  // ── Arcade mode ───────────────────────────────────────────────────────────────
  private applyStage(stageNum: number) {
    const gs = this.state;
    const stage = ARCADE_STAGES.find(s => s.number === stageNum) ?? ARCADE_STAGES[0];
    gs.stageMods = [...stage.mods];
    gs.stageNumber = stageNum;
  }

  private getModMultiplier(): number {
    const gs = this.state;
    let m = 1.0;
    if (gs.stageMods.includes('fastBall')) m *= 1.3;
    return m;
  }

  // ── Timed modes ──────────────────────────────────────────────────────────────
  private endTimedMode() {
    const gs = this.state;
    gs.matchWon = true;
    gs.phase = 'matchOver';
    const score = gs.mode === 'smash' ? gs.smashScore : gs.mode === 'precision' ? gs.precisionScore : gs.survivalScore;
    try { window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*'); } catch {}
  }

  // ── Effects ──────────────────────────────────────────────────────────────────
  private triggerPerfectHit(wx: number, wy: number) {
    const gs = this.state;
    gs.perfectHitFlash = 1.0;
    gs.slowMotion = 0.2;
    gs.cameraShake = 4;
    const { x: sx, y: sy } = this.worldToScreen(wx, wy, 0.2);
    this.addScoreEvent('PERFECT!', 25, wx, wy, '#ffd700');
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      gs.particles.push(mkParticle(sx, sy, Math.cos(angle) * rand(60, 120), Math.sin(angle) * rand(60, 120), '#ffd700', rand(4, 8), rand(0.5, 1.0), 'energy'));
    }
  }

  private spawnSmashBurst(pos: Vec3) {
    const gs = this.state;
    const { x: sx, y: sy } = this.worldToScreen(pos.x, pos.y, pos.z);
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(80, 200);
      gs.particles.push(mkParticle(sx, sy, Math.cos(angle) * speed, Math.sin(angle) * speed, i % 2 === 0 ? '#ff4400' : '#ffaa00', rand(3, 8), rand(0.4, 0.8), 'spark', true));
    }
  }

  private spawnEnergyBurst(pos: Vec3) {
    const gs = this.state;
    const { x: sx, y: sy } = this.worldToScreen(pos.x, pos.y, pos.z);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      gs.particles.push(mkParticle(sx, sy, Math.cos(angle) * rand(40, 100), Math.sin(angle) * rand(40, 100), '#7c3aed', rand(3, 7), rand(0.5, 1.0), 'energy'));
    }
  }

  private spawnConfetti(sx: number, sy: number) {
    const gs = this.state;
    const colors = ['#ff4ade', '#4ade80', '#fbbf24', '#22d3ee', '#f87171'];
    for (let i = 0; i < 20; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      gs.particles.push({
        x: sx + rand(-100, 100), y: sy,
        vx: rand(-60, 60), vy: rand(-100, -20),
        life: rand(1.0, 2.0), maxLife: 2.0,
        size: rand(4, 10), color: c, alpha: 1,
        type: 'confetti', gravity: true,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: rand(-5, 5),
      });
    }
  }

  private spawnVictoryFireworks() {
    const gs = this.state;
    const colors = ['#ff4ade', '#4ade80', '#fbbf24', '#22d3ee', '#f87171', '#a855f7'];
    for (let burst = 0; burst < 6; burst++) {
      setTimeout(() => {
        const sx = rand(100, window.innerWidth - 100);
        const sy = rand(80, window.innerHeight * 0.6);
        const c = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 40; i++) {
          const angle = (i / 40) * Math.PI * 2;
          const speed = rand(80, 180);
          gs.particles.push(mkParticle(sx, sy, Math.cos(angle) * speed, Math.sin(angle) * speed, c, rand(3, 7), rand(0.8, 1.5), 'star', true));
        }
      }, burst * 300);
    }
  }

  // ── Trick shot detection ─────────────────────────────────────────────────────
  private detectTrickShot(b: Ball) {
    const gs = this.state;
    const isCornerHit = Math.abs(b.pos.x) > TABLE_HALF_W * 0.75;
    const isExtremeAngle = Math.abs(b.vel.x / b.vel.y) > 0.7;

    if (isCornerHit && isExtremeAngle) {
      const pts = 30;
      gs.coins += 15;
      this.addScoreEvent('CORNER TRICK!', pts, b.pos.x, b.pos.y, '#fbbf24');
    }
  }

  // ── Particles ────────────────────────────────────────────────────────────────
  private updateParticles(dt: number) {
    const gs = this.state;
    const GRAV = 200;
    for (let i = gs.particles.length - 1; i >= 0; i--) {
      const p = gs.particles[i];
      p.life -= dt;
      if (p.life <= 0) { gs.particles.splice(i, 1); continue; }
      if (p.gravity) p.vy += GRAV * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = p.life / p.maxLife;
      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed * dt;
      }
    }
  }

  private updateScoreEvents(dt: number) {
    const gs = this.state;
    for (let i = gs.scoreEvents.length - 1; i >= 0; i--) {
      const e = gs.scoreEvents[i];
      e.life -= dt;
      if (e.life <= 0) gs.scoreEvents.splice(i, 1);
      else { e.screenY -= 40 * dt; }
    }
  }

  private addScoreEvent(label: string, points: number, wx: number, wy: number, color: string) {
    const { x: sx, y: sy } = this.worldToScreen(wx, wy, 0.3);
    this.state.scoreEvents.push({
      label, points, screenX: sx, screenY: sy,
      life: 1.5, maxLife: 1.5, color, scale: 1,
    });
  }

  // ── Replay ───────────────────────────────────────────────────────────────────
  private updateReplay(_dt: number) {
    // Handled externally by renderer for cinematic effect
  }

  // ── Projection helper (approximate) ─────────────────────────────────────────
  worldToScreen(wx: number, wy: number, wz: number): { x: number; y: number } {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const t = (wy + TABLE_HALF_L) / (TABLE_HALF_L * 2);
    const nearW = W * 0.85, farW = W * 0.38;
    const nearY = H * 0.88, farY = H * 0.18;
    const screenW = nearW + (farW - nearW) * t;
    const baseY = nearY + (farY - nearY) * t;
    const screenX = W / 2 + (wx / TABLE_HALF_W) * (screenW / 2);
    const heightScale = 90 * (1 - t * 0.35);
    const screenY = baseY - wz * heightScale;
    return { x: screenX, y: screenY };
  }

  handleBallOut(_side: string) {
    const gs = this.state;
    // Ball went out wide — fault for whoever hit last
    if (gs.ball.lastHitBy === 'player') this.awardPoint('ai', 'Wide!');
    else this.awardPoint('player', 'Wide!');
  }

  // ── Survival ─────────────────────────────────────────────────────────────────
  updateSurvivalScore() {
    const gs = this.state;
    gs.survivalScore = Math.round(gs.survivalTime * 10 + gs.rallyCount * 5 + gs.maxCombo * 8);
  }

  // Expose for GameCanvas to call when match ends
  getResults() {
    const gs = this.state;
    return {
      playerScore: gs.score.player,
      aiScore: gs.score.ai,
      maxCombo: gs.maxCombo,
      longestRally: gs.longestRally,
      smashCount: gs.smashCount,
      coins: gs.coins,
      mode: gs.mode,
    };
  }
}
