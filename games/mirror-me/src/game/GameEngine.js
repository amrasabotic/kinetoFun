import { STATES, GAME_CONFIG } from './constants.js';
import { buildRoundSequence } from './PoseLibrary.js';
import { comparePose, personInFrame } from './PoseComparator.js';
import { GestureRecognizer } from './GestureRecognizer.js';
import { ScoreManager } from './ScoreManager.js';
import { LandmarkSmoother, MotionTracker } from '../utils/Smoother.js';
import { Renderer } from '../ui/Renderer.js';
import { SoundManager } from '../audio/SoundManager.js';

export class GameEngine {
  constructor(videoEl, overlayCanvas, uiCanvas) {
    this.video    = videoEl;
    this.renderer = new Renderer(overlayCanvas, uiCanvas);
    this.smoother = new LandmarkSmoother();
    this.motion   = new MotionTracker();
    this.gestures = new GestureRecognizer();
    this.score    = new ScoreManager();
    this.sound    = new SoundManager();
    this._dotsEl  = document.getElementById('progress-bar-container');

    this.state        = STATES.LOADING;
    this.landmarks    = null;
    this.poseSequence = [];
    this.poseIndex    = 0;
    this.currentPose  = null;

    // Challenge phase state
    this._challengeStart    = null;
    this._challengeAllowed  = 0;
    this._lastAccuracy      = 0;
    this._lastPoseResult    = null;
    this._feedbackStart     = null;

    // Countdown state
    this._countdownStart    = null;
    this._countdownNumber   = 3;
    this._prevCountdown     = -1;

    // Previous state (for pause/resume)
    this._pausedFrom        = null;

    this._animFrame         = null;
    this._resizeObserver    = null;

    this._setupResize();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  onMediaPipeReady() {
    this.state = STATES.IDLE;
  }

  onLandmarks(results) {
    const raw = results.poseLandmarks ?? null;
    this.landmarks = this.smoother.smooth(raw);
    const motion = this.motion.update(this.landmarks);
    this._tick(motion);
  }

  start() {
    this._loop();
  }

  // ── Main tick ─────────────────────────────────────────────────────────────

  _tick(motionLevel) {
    const now    = performance.now();
    const lm     = this.landmarks;
    const events = this.gestures.update(lm, motionLevel, now);

    this.renderer.clearOverlay();
    this.renderer.clearUI();

    switch (this.state) {
      case STATES.LOADING:
        this.renderer.drawLoadingScreen(0.5);
        break;

      case STATES.IDLE:
        this._handleIdle(events, now);
        break;

      case STATES.COUNTDOWN:
        this._handleCountdown(events, now);
        break;

      case STATES.CHALLENGE:
        this._handleChallenge(events, now);
        break;

      case STATES.FEEDBACK:
        this._handleFeedback(events, now);
        break;

      case STATES.GAME_OVER:
        this._handleGameOver(events, now);
        break;

      case STATES.PAUSED:
        this._handlePaused(events, now);
        break;
    }
  }

  // ── State handlers ────────────────────────────────────────────────────────

  _handleIdle(events, now) {
    const personProgress   = this.gestures.personDetectedProgress(now);
    const handsUpProgress  = this.gestures.handsUpProgress(now);

    this.renderer.drawIdleScreen(personProgress, handsUpProgress);

    if (this.landmarks) {
      this.renderer.drawPlayerSkeleton(this.landmarks);
    }

    if (events.startGesture || events.personDetected || events.clapGesture) {
      this._startRound();
    }
  }

  _startRound() {
    this.score.reset();
    this.poseSequence = buildRoundSequence();
    this.poseIndex    = 0;
    this.gestures.reset();
    this._buildProgressDots();
    this._beginCountdown();
  }

  _buildProgressDots() {
    if (!this._dotsEl) return;
    this._dotsEl.innerHTML = '';
    for (let i = 0; i < this.poseSequence.length; i++) {
      const d = document.createElement('div');
      d.className  = 'pose-dot' + (i === 0 ? ' current' : '');
      d.dataset.i  = i;
      this._dotsEl.appendChild(d);
    }
  }

  _updateProgressDots() {
    if (!this._dotsEl) return;
    this._dotsEl.querySelectorAll('.pose-dot').forEach((d) => {
      const i = parseInt(d.dataset.i);
      d.className = 'pose-dot';
      if (i < this.poseIndex)      d.classList.add('done');
      else if (i === this.poseIndex) d.classList.add('current');
    });
  }

  _beginCountdown() {
    this.state             = STATES.COUNTDOWN;
    this._countdownStart   = performance.now();
    this._countdownNumber  = 3;
    this._prevCountdown    = -1;
  }

  _handleCountdown(events, now) {
    const elapsed  = now - this._countdownStart;
    const tick     = Math.floor(elapsed / 1000);
    const remaining = 3 - tick;

    if (remaining !== this._prevCountdown) {
      if (remaining > 0 && remaining <= 3) {
        this.sound.countdown(remaining);
      } else if (remaining <= 0) {
        this.sound.go();
      }
      this._prevCountdown = remaining;
    }

    if (this.landmarks) this.renderer.drawPlayerSkeleton(this.landmarks);

    if (remaining > 0) {
      this.renderer.drawCountdown(remaining, 'GET READY!');
    } else if (remaining === 0) {
      this.renderer.drawCountdown(0, 'GO!');
    } else {
      this._beginChallenge();
    }
  }

  _beginChallenge() {
    if (this.poseIndex >= this.poseSequence.length) {
      this._endGame();
      return;
    }
    this.currentPose       = this.poseSequence[this.poseIndex];
    this.state             = STATES.CHALLENGE;
    this._challengeStart   = performance.now();
    this._challengeAllowed = GAME_CONFIG.POSE_TIME_BY_DIFFICULTY[this.currentPose.difficulty] * 1000;
    this._lastAccuracy     = 0;
    this._updateProgressDots();
  }

  _handleChallenge(events, now) {
    const elapsed  = now - this._challengeStart;
    const timeLeft = Math.max(0, (this._challengeAllowed - elapsed) / 1000);

    // Evaluate pose accuracy
    if (this.landmarks && personInFrame(this.landmarks)) {
      const { accuracy } = comparePose(this.landmarks, this.currentPose);
      this._lastAccuracy = accuracy;

      // Auto-complete on perfect match early
      if (accuracy >= 94 && elapsed > 400) {
        this._completePose(now, elapsed);
        return;
      }
    }

    if (this.landmarks) this.renderer.drawPlayerSkeleton(this.landmarks);
    this.renderer.drawRefPose(this.currentPose);
    this.renderer.drawChallengeHUD(
      this.currentPose,
      timeLeft,
      this._challengeAllowed / 1000,
      this.score.totalScore,
      this.score.combo,
      this._lastAccuracy,
    );

    // Pause gesture
    if (events.freezeGesture) {
      this._pausedFrom = STATES.CHALLENGE;
      this.state       = STATES.PAUSED;
      return;
    }

    // Time up
    if (elapsed >= this._challengeAllowed) {
      this._completePose(now, elapsed);
    }

    // Low time tick
    if (timeLeft < 3 && timeLeft > 0 && Math.floor(timeLeft + 0.05) !== Math.floor(timeLeft + 0.05 + 0.016)) {
      // Tick every second when under 3s (rough)
    }
  }

  _completePose(now, elapsed) {
    const accuracy   = this._lastAccuracy;
    const result     = this.score.addPoseResult(accuracy, elapsed, this._challengeAllowed);
    this._lastPoseResult = { accuracy, ...result };

    if (accuracy >= GAME_CONFIG.ACCURACY_THRESHOLDS.PERFECT) {
      this.sound.perfect();
    } else if (accuracy >= GAME_CONFIG.ACCURACY_THRESHOLDS.GOOD) {
      this.sound.good();
      if (this.score.combo > 1) this.sound.combo(this.score.combo);
    } else {
      this.sound.miss();
    }

    this.state          = STATES.FEEDBACK;
    this._feedbackStart = performance.now();
    this.poseIndex++;
  }

  _handleFeedback(events, now) {
    const elapsed = now - this._feedbackStart;
    const { accuracy, finalScore, speedBonus, comboMult } = this._lastPoseResult ?? {};

    let label = 'TRY AGAIN!';
    if (accuracy >= GAME_CONFIG.ACCURACY_THRESHOLDS.PERFECT) label = 'PERFECT!';
    else if (accuracy >= GAME_CONFIG.ACCURACY_THRESHOLDS.GOOD) label = 'GOOD!';

    if (this.landmarks) this.renderer.drawPlayerSkeleton(this.landmarks);
    this.renderer.drawRefPose(this.currentPose);
    this.renderer.drawFeedback(label, accuracy ?? 0, finalScore ?? 0, speedBonus ?? 1, comboMult ?? 1);

    if (elapsed >= GAME_CONFIG.FEEDBACK_DURATION_MS) {
      if (this.poseIndex >= this.poseSequence.length) {
        this._endGame();
      } else {
        this._beginChallenge();
      }
    }
  }

  _endGame() {
    window.parent.postMessage({ type: 'GAME_COMPLETE', score: this.score.totalScore }, '*');
    this.score.saveGame();
    this.sound.gameOver();
    this.state = STATES.GAME_OVER;
    this.gestures.reset();
    if (this._dotsEl) this._dotsEl.innerHTML = '';
  }

  _handleGameOver(events, now) {
    if (this.landmarks) this.renderer.drawPlayerSkeleton(this.landmarks);
    this.renderer.drawGameOver(
      this.score.totalScore,
      this.score.bestStreak,
      this.score.avgAccuracy,
      this.score.records,
    );

    if (events.startGesture || events.clapGesture) {
      this._startRound();
    }
  }

  _handlePaused(events, now) {
    if (this.landmarks) this.renderer.drawPlayerSkeleton(this.landmarks);
    const fp = this.gestures.freezeProgress(now);
    this.renderer.drawPausedOverlay(fp);

    // Resume on movement (motion detected above threshold)
    const motion = this.motion.getAvgMotion();
    if (motion > GAME_CONFIG.FREEZE_THRESHOLD * 4) {
      this.gestures.reset();
      this.motion.reset();
      this.state = this._pausedFrom ?? STATES.IDLE;
      // Reset challenge timer so player gets full time
      if (this.state === STATES.CHALLENGE) {
        this._challengeStart = performance.now();
      }
    }
  }

  // ── Animation loop (fallback render) ─────────────────────────────────────

  _loop() {
    // The main loop is driven by MediaPipe callbacks via onLandmarks.
    // This RAF loop handles the case where no pose is detected (IDLE/GAME_OVER)
    // so the UI still refreshes.
    this._animFrame = requestAnimationFrame(() => this._loop());

    // Only render independently if landmarks haven't fired recently
    if (this.state === STATES.LOADING || this.state === STATES.GAME_OVER) {
      this.renderer.clearUI();
      if (this.state === STATES.LOADING) {
        this.renderer.drawLoadingScreen(0.5);
      } else {
        this.renderer.drawGameOver(
          this.score.totalScore,
          this.score.bestStreak,
          this.score.avgAccuracy,
          this.score.records,
        );
      }
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────

  _setupResize() {
    const doResize = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      this.renderer.resize(W, H);
      this.video.width  = W;
      this.video.height = H;
    };
    doResize();
    window.addEventListener('resize', doResize);
  }
}
