// ============================================================
//  FLAGS QUIZ — Multi-Mode Game Platform
// ============================================================

import {
  GESTURES, GESTURE_ICONS, GESTURE_LABELS,
  detectGesture, gestureEngine,
  cursor, hover,
  initCursor, lerpCursor, updateCursorPosition,
  updateHoverState, resetHover,
  updateGestureUI,
} from './gesture.js';

import {
  COUNTRIES, CONTINENTS, CAMPAIGN_STAGES, ARCADE_CONTINENTS,
  flagUrl, getCountriesByContinent,
} from './data.js';

// ── App state ────────────────────────────────────────────────
const app = {
  screen:         'home',
  mode:           null,     // 'campaign' | 'arcade' | 'survival'

  // Campaign
  campaignStage:  0,
  stageCorrect:   0,

  // Arcade continent selection
  arcadeContinent: null,

  // Shared game state
  lives:          3,
  score:          0,
  streak:         0,
  bestStreak:     0,
  totalCorrect:   0,
  questionsAnswered: 0,
  recentFlags:    [],
  paused:         false,
  showingFeedback: false,
  currentQuestion: null,
  activeContinent: null, // continent pool for current session
  difficulty:     1,
};

// ── Screen management ────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`${name}-screen`);
  if (el) el.classList.add('active');
  app.screen = name;
  resetHover();
}

// ── Home screen ──────────────────────────────────────────────
function showHome() {
  showScreen('home');
}

function selectMode(modeIndex) {
  const modes = ['campaign', 'arcade', 'survival'];
  const mode = modes[modeIndex];
  if (!mode) return;
  app.mode = mode;

  if (mode === 'campaign') {
    app.campaignStage = 0;
    showTransition('start');
  } else if (mode === 'arcade') {
    showScreen('arcade-select');
  } else {
    startGame('survival', 'world');
  }
}

// ── Arcade continent selection ────────────────────────────────
function selectArcadeContinent(idx) {
  const cont = ARCADE_CONTINENTS[idx];
  if (!cont) return;
  startGame('arcade', cont.id);
}

// ── Transition screen ─────────────────────────────────────────
// type: 'start' | 'complete' | 'victory'
let transitionType = 'start';

function showTransition(type) {
  transitionType = type;
  const stage = CAMPAIGN_STAGES[app.campaignStage];
  const prevStage = app.campaignStage > 0 ? CAMPAIGN_STAGES[app.campaignStage - 1] : null;

  const el = document.getElementById('transition-screen');

  if (type === 'victory') {
    el.querySelector('.transition-badge').textContent = '🏆';
    el.querySelector('.transition-title').textContent = 'CAMPAIGN COMPLETE!';
    el.querySelector('.transition-sub').textContent = 'You conquered every continent!';
    el.querySelector('.transition-score').textContent = `Final Score: ${app.score}`;
    el.querySelector('.transition-next').textContent = '';
    el.querySelector('.transition-hint').textContent = '✊ Fist to return home';
  } else if (type === 'complete' && prevStage) {
    el.querySelector('.transition-badge').textContent = prevStage.emoji;
    el.querySelector('.transition-title').textContent = `${prevStage.label.toUpperCase()} COMPLETE!`;
    el.querySelector('.transition-sub').textContent = `${app.stageCorrect} correct answers`;
    el.querySelector('.transition-score').textContent = `Score: ${app.score}`;
    if (stage) {
      el.querySelector('.transition-next').textContent = `Next: ${stage.emoji} ${stage.label}`;
      el.querySelector('.transition-hint').textContent = '✊ Fist to continue';
    }
  } else {
    // Stage start
    el.querySelector('.transition-badge').textContent = stage.emoji;
    el.querySelector('.transition-title').textContent = `STAGE ${app.campaignStage + 1}: ${stage.label.toUpperCase()}`;
    el.querySelector('.transition-sub').textContent = `Get ${stage.required} correct answers to advance`;
    el.querySelector('.transition-score').textContent = app.campaignStage > 0 ? `Score so far: ${app.score}` : '';
    el.querySelector('.transition-next').textContent = '';
    el.querySelector('.transition-hint').textContent = '✊ Fist to start';
  }

  showScreen('transition');
}

function continueFromTransition() {
  if (app.mode === 'campaign') {
    const stage = CAMPAIGN_STAGES[app.campaignStage];
    if (!stage) {
      showHome();
      return;
    }
    startGame('campaign', stage.id === 'world' ? 'world' : stage.id);
  } else {
    showHome();
  }
}

// ── Game initialization ───────────────────────────────────────
function startGame(mode, continent) {
  app.mode            = mode;
  app.activeContinent = continent;
  app.lives           = 3;
  app.streak          = 0;
  app.recentFlags     = [];
  app.paused          = false;
  app.showingFeedback = false;
  app.currentQuestion = null;
  app.difficulty      = 1;

  if (mode === 'campaign') {
    app.stageCorrect = 0;
    // score persists across campaign stages
  } else {
    app.score        = 0;
    app.bestStreak   = 0;
    app.totalCorrect = 0;
    app.questionsAnswered = 0;
  }

  showScreen('game');
  updateHUD();
  nextQuestion();
}

// ── Question generation ───────────────────────────────────────
function generateQuestion(continent, difficulty) {
  // Correct answer pool
  const correctPool = getCountriesByContinent(continent === 'world' ? 'world' : continent);
  const available   = correctPool.filter(c => !app.recentFlags.includes(c.code));
  const pool        = available.length > 5 ? available : correctPool;
  const correct     = pool[Math.floor(Math.random() * pool.length)];

  app.recentFlags.push(correct.code);
  if (app.recentFlags.length > 20) app.recentFlags.shift();

  // Wrong options: at high difficulty pull from same continent (similar-looking flags)
  let wrongPool = difficulty >= 2
    ? COUNTRIES.filter(c => c.name !== correct.name && c.continent === correct.continent)
    : COUNTRIES.filter(c => c.name !== correct.name);

  // Fallback when same-continent pool is too small
  if (wrongPool.length < 3) wrongPool = COUNTRIES.filter(c => c.name !== correct.name);

  const wrongOptions = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3);
  const options      = [correct, ...wrongOptions].sort(() => Math.random() - 0.5);

  return {
    flag:         flagUrl(correct.code),
    options:      options.map(c => c.name),
    answer:       correct.name,
    correctIndex: options.findIndex(c => c.name === correct.name),
    continent:    correct.continent,
  };
}

function loadQuestion(q) {
  app.currentQuestion  = q;
  app.showingFeedback  = false;
  resetHover();

  document.getElementById('flag-image').src = q.flag;
  document.querySelectorAll('.answer-card').forEach((card, i) => {
    card.querySelector('.answer-text').textContent = q.options[i];
    card.className = 'answer-card selectable';
  });

  hideFeedback();
}

function nextQuestion() {
  // Increase difficulty for survival every 10 correct
  if (app.mode === 'survival') {
    app.difficulty = Math.min(1 + Math.floor(app.totalCorrect / 10), 3);
  } else if (app.mode === 'campaign') {
    app.difficulty = Math.min(1 + app.campaignStage, 3);
  } else {
    app.difficulty = 2; // arcade always continent-specific
  }

  loadQuestion(generateQuestion(app.activeContinent, app.difficulty));
}

// ── Answer submission ─────────────────────────────────────────
function submitAnswer() {
  if (app.screen !== 'game' || app.paused || app.showingFeedback) return;
  const q = app.currentQuestion;
  if (!q) return;

  const confirmIndex = hover.lockedIndex >= 0 ? hover.lockedIndex : -1;
  if (confirmIndex < 0) return;

  app.showingFeedback = true;
  app.questionsAnswered++;
  const isCorrect = confirmIndex === q.correctIndex;

  if (isCorrect) {
    const mult   = getMultiplier();
    const points = 1 * mult;
    app.score      += points;
    app.streak++;
    app.totalCorrect++;
    app.stageCorrect++;
    if (app.streak > app.bestStreak) app.bestStreak = app.streak;

    markAnswerCard(confirmIndex, 'correct');
    showFeedback(true, q.answer);
    showScorePopup(points);

    if (app.streak === 3 || app.streak === 7 || app.streak === 15) {
      setTimeout(() => showStreakBurst(app.streak), 200);
    }

    // Campaign stage completion check
    if (app.mode === 'campaign') {
      const stage = CAMPAIGN_STAGES[app.campaignStage];
      if (app.stageCorrect >= stage.required) {
        setTimeout(() => completeStage(), 1500);
        return;
      }
    }
  } else {
    app.streak = 0;
    app.lives--;
    markAnswerCard(confirmIndex, 'wrong');
    markAnswerCard(q.correctIndex, 'correct');
    showFeedback(false, q.answer);
  }

  updateHUD();

  if (app.lives <= 0) {
    setTimeout(() => gameOver(), 1500);
  } else {
    setTimeout(() => {
      app.showingFeedback = false;
      nextQuestion();
    }, 1400);
  }
}

function skipQuestion() {
  if (app.screen !== 'game' || app.paused || app.showingFeedback) return;
  app.lives--;
  app.streak = 0;
  app.questionsAnswered++;
  const q = app.currentQuestion;
  if (q) markAnswerCard(q.correctIndex, 'correct');
  showFeedback(false, q?.answer || '');
  document.getElementById('feedback-text').textContent = 'SKIPPED!';
  app.showingFeedback = true;
  updateHUD();

  if (app.lives <= 0) {
    setTimeout(() => gameOver(), 1500);
  } else {
    setTimeout(() => {
      app.showingFeedback = false;
      nextQuestion();
    }, 1200);
  }
}

function togglePause() {
  if (app.screen !== 'game') return;
  app.paused = !app.paused;
  document.getElementById('pause-overlay').classList.toggle('hidden', !app.paused);
  if (!app.paused) resetHover();
}

// ── Campaign stage completion ─────────────────────────────────
function completeStage() {
  app.campaignStage++;
  app.stageCorrect = 0;
  app.lives        = 3; // replenish between stages

  if (app.campaignStage >= CAMPAIGN_STAGES.length) {
    showTransition('victory');
  } else {
    showTransition('complete');
  }
}

function gameOver() {
  window.parent.postMessage({ type: 'GAME_COMPLETE', score: app.score }, '*');
  const el = document.getElementById('gameover-screen');
  el.querySelector('#final-score').textContent   = app.score;
  el.querySelector('#final-streak').textContent  = app.bestStreak;
  el.querySelector('#final-correct').textContent = app.totalCorrect;

  const modeLabel = app.mode === 'campaign' ? `Campaign — ${CAMPAIGN_STAGES[Math.max(0, app.campaignStage - 1)]?.label || 'Stage 1'}`
    : app.mode === 'arcade' ? `Arcade — ${CONTINENTS[app.activeContinent]?.label || ''}`
    : 'Survival';
  el.querySelector('#gameover-mode').textContent = modeLabel;

  // Show retry hint for campaign
  const retryHint = el.querySelector('#gameover-retry-hint');
  if (app.mode === 'campaign') {
    retryHint.textContent = '✊ Fist to retry this stage';
    retryHint.style.display = '';
  } else {
    retryHint.textContent = '';
    retryHint.style.display = 'none';
  }

  showScreen('gameover');
}

// ── Multiplier / scoring ──────────────────────────────────────
function getMultiplier() {
  if (app.streak >= 15) return 5;
  if (app.streak >= 7)  return 3;
  if (app.streak >= 3)  return 2;
  return 1;
}

// ── HUD ──────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('score-value').textContent  = app.score;
  document.getElementById('streak-value').textContent = app.streak;

  const mult  = getMultiplier();
  const badge = document.getElementById('multiplier-badge');
  badge.textContent = `x${mult}`;
  badge.className = mult > 1 ? `multiplier x${mult}` : 'multiplier hidden';

  // Lives (show for all modes)
  const hearts = document.getElementById('lives-hearts');
  hearts.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const h = document.createElement('span');
    h.className = 'heart' + (i >= app.lives ? ' lost' : '');
    h.textContent = '❤️';
    hearts.appendChild(h);
  }

  // Continent badge
  const contKey  = app.activeContinent === 'world' ? 'world' : app.activeContinent;
  const contInfo = CONTINENTS[contKey] || { emoji: '🌐', label: '' };
  document.getElementById('continent-badge').textContent =
    app.mode === 'campaign'
      ? `Stage ${app.campaignStage + 1}: ${contInfo.emoji} ${contInfo.label}`
      : `${contInfo.emoji} ${contInfo.label}`;

  // Campaign progress bar
  const progressBar = document.getElementById('stage-progress-bar');
  const progressWrap = document.getElementById('stage-progress-wrap');
  if (app.mode === 'campaign') {
    progressWrap.style.display = '';
    const stage    = CAMPAIGN_STAGES[app.campaignStage];
    const pct      = stage ? Math.min((app.stageCorrect / stage.required) * 100, 100) : 100;
    progressBar.style.width = `${pct}%`;
    document.getElementById('stage-progress-label').textContent =
      stage ? `${app.stageCorrect} / ${stage.required}` : '';
  } else {
    progressWrap.style.display = 'none';
  }
}

// ── UI feedback helpers ───────────────────────────────────────
function markAnswerCard(index, type) {
  const cards = document.querySelectorAll('.answer-card');
  if (index >= 0 && index < cards.length) cards[index].classList.add(type);
}

function showFeedback(isCorrect, correctAnswer) {
  const overlay = document.getElementById('feedback-overlay');
  overlay.className = isCorrect ? 'correct' : 'wrong';
  document.getElementById('feedback-icon').textContent   = isCorrect ? '✅' : '❌';
  document.getElementById('feedback-text').textContent   = isCorrect ? 'CORRECT!' : 'WRONG!';
  document.getElementById('feedback-country').textContent = isCorrect ? '' : `Answer: ${correctAnswer}`;
  const apEl = document.getElementById('app');
  apEl.className = isCorrect ? 'flash-correct' : 'flash-wrong';
  setTimeout(() => apEl.className = '', 500);
}

function hideFeedback() {
  document.getElementById('feedback-overlay').className = 'hidden';
}

function showScorePopup(points) {
  const popup = document.createElement('div');
  popup.className   = 'score-popup';
  popup.textContent = `+${points}`;
  popup.style.top   = '45%';
  popup.style.left  = `${40 + Math.random() * 20}%`;
  document.getElementById('app').appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

function showStreakBurst(streak) {
  const el = document.createElement('div');
  el.className   = 'streak-burst';
  el.textContent = streak >= 15 ? 'x5 FRENZY!' : streak >= 7 ? 'x3 BLAZING!' : 'x2 STREAK!';
  document.getElementById('app').appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// ── Gesture routing (per screen) ─────────────────────────────
function handleGestureAction(engineState) {
  const { gesture, ready, locked } = engineState;
  if (!ready || locked) return;
  if (gesture === GESTURES.NONE || gesture === GESTURES.POINT) return;

  switch (app.screen) {
    case 'home':
      if (gesture === GESTURES.THUMBS_UP && hover.lockedIndex >= 0) {
        gestureEngine.lock();
        selectMode(hover.lockedIndex);
      }
      break;

    case 'arcade-select':
      if (gesture === GESTURES.THUMBS_UP && hover.lockedIndex >= 0) {
        gestureEngine.lock();
        selectArcadeContinent(hover.lockedIndex);
      } else if (gesture === GESTURES.FIST) {
        gestureEngine.lock();
        showHome();
      }
      break;

    case 'transition':
      if (gesture === GESTURES.FIST || gesture === GESTURES.THUMBS_UP) {
        gestureEngine.lock();
        if (transitionType === 'victory') {
          showHome();
        } else {
          continueFromTransition();
        }
      }
      break;

    case 'game':
      if (gesture === GESTURES.OPEN_PALM) {
        gestureEngine.lock();
        togglePause();
        return;
      }
      if (app.paused) return;
      if (gesture === GESTURES.THUMBS_UP) {
        gestureEngine.lock();
        submitAnswer();
      } else if (gesture === GESTURES.THUMBS_DOWN) {
        gestureEngine.lock();
        skipQuestion();
      }
      break;

    case 'gameover':
      if (gesture === GESTURES.FIST) {
        gestureEngine.lock();
        if (app.mode === 'campaign') {
          // Retry current stage
          startGame('campaign', CAMPAIGN_STAGES[app.campaignStage]?.id || 'europe');
        } else {
          showHome();
        }
      } else if (gesture === GESTURES.THUMBS_UP) {
        gestureEngine.lock();
        showHome();
      }
      break;

    case 'victory':
      if (gesture === GESTURES.FIST || gesture === GESTURES.THUMBS_UP) {
        gestureEngine.lock();
        showHome();
      }
      break;
  }
}

// ── Debug canvas ─────────────────────────────────────────────
let debugEnabled = false;

function drawDebugLandmarks(canvas, landmarks, w, h) {
  const ctx = canvas.getContext('2d');
  canvas.width = w; canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  const CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],
  ];
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1.5;
  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    ctx.stroke();
  }
  for (const lm of landmarks) {
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6b35'; ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(landmarks[8].x * w, landmarks[8].y * h, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#00e676'; ctx.fill();
}

// ── MediaPipe setup ───────────────────────────────────────────
function initMediaPipe() {
  const videoEl  = document.getElementById('camera-feed');
  const canvas   = document.getElementById('debug-canvas');
  const statusEl = document.getElementById('camera-status');

  if (typeof Hands === 'undefined') {
    statusEl.textContent = 'MediaPipe not loaded — check internet connection.';
    statusEl.classList.add('error');
    return;
  }

  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
  });

  hands.setOptions({
    maxNumHands:            1,
    modelComplexity:        1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence:  0.6,
  });

  hands.onResults(results => {
    const now = Date.now();

    if (results.multiHandLandmarks?.length > 0) {
      const lm = results.multiHandLandmarks[0];
      gestureEngine.pushFrame(detectGesture(lm));

      const tip = lm[8];
      cursor.targetX = (1 - tip.x) * window.innerWidth;
      cursor.targetY = tip.y * window.innerHeight;
      cursor.visible = true;

      if (debugEnabled) drawDebugLandmarks(canvas, lm, videoEl.videoWidth || 320, videoEl.videoHeight || 240);
    } else {
      gestureEngine.pushFrame(GESTURES.NONE);
      cursor.visible = false;
    }

    lerpCursor();
    updateCursorPosition();

    // Hover disabled during feedback or pause
    const interactionOn = app.screen !== 'game' || (!app.showingFeedback && !app.paused);
    updateHoverState(now, interactionOn);

    const engineState = gestureEngine.tick(now);
    updateGestureUI(engineState);
    handleGestureAction(engineState);
  });

  const camera = new Camera(videoEl, {
    onFrame: async () => { await hands.send({ image: videoEl }); },
    width: 320, height: 240,
  });

  camera.start()
    .then(() => {
      statusEl.textContent = 'Camera ready — point at a mode to begin!';
      statusEl.classList.add('ready');
    })
    .catch(err => {
      statusEl.textContent = `Camera error: ${err.message}`;
      statusEl.classList.add('error');
    });
}

// ── Debug toggle (mouse only) ─────────────────────────────────
document.getElementById('debug-toggle').addEventListener('click', () => {
  debugEnabled = !debugEnabled;
  const btn    = document.getElementById('debug-toggle');
  const canvas = document.getElementById('debug-canvas');
  btn.classList.toggle('on', debugEnabled);
  canvas.style.display = debugEnabled ? 'block' : 'none';
  if (!debugEnabled) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
});

// ── Boot ──────────────────────────────────────────────────────
initCursor();
showScreen('home');
initMediaPipe();
