// ============================================================
//  FLAGS QUIZ — Gesture Engine + Cursor + Hover System
// ============================================================

// ── Gesture constants ────────────────────────────────────────
export const GESTURES = {
  NONE:        'NONE',
  FIST:        'FIST',
  POINT:       'POINT',
  THUMBS_UP:   'THUMBS_UP',
  THUMBS_DOWN: 'THUMBS_DOWN',
  OPEN_PALM:   'OPEN_PALM',
};

export const GESTURE_ICONS = {
  NONE:        '',
  FIST:        '✊',
  POINT:       '☝️',
  THUMBS_UP:   '👍',
  THUMBS_DOWN: '👎',
  OPEN_PALM:   '✋',
};

export const GESTURE_LABELS = {
  NONE:        'NO HAND',
  FIST:        'FIST',
  POINT:       'POINT',
  THUMBS_UP:   'THUMBS UP',
  THUMBS_DOWN: 'THUMBS DOWN',
  OPEN_PALM:   'OPEN PALM',
};

// Priority: higher = wins when both gestures present in buffer
export const GESTURE_PRIORITY = {
  [GESTURES.THUMBS_UP]:   4,
  [GESTURES.THUMBS_DOWN]: 4,
  [GESTURES.FIST]:        3,
  [GESTURES.OPEN_PALM]:   2,
  [GESTURES.POINT]:       1,
  [GESTURES.NONE]:        0,
};

// ── Gesture detection (per-frame landmark classification) ────
export function detectGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return GESTURES.NONE;

  const wrist     = landmarks[0];
  const thumbTip  = landmarks[4];
  const thumbMcp  = landmarks[2];

  const indexMcp  = landmarks[5];
  const indexPip  = landmarks[6];
  const indexTip  = landmarks[8];

  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleTip = landmarks[12];

  const ringMcp   = landmarks[13];
  const ringPip   = landmarks[14];
  const ringTip   = landmarks[16];

  const pinkyMcp  = landmarks[17];
  const pinkyPip  = landmarks[18];
  const pinkyTip  = landmarks[20];

  // Finger extended: tip is meaningfully above its PIP
  const indexExt  = indexTip.y  < indexPip.y  - 0.04;
  const middleExt = middleTip.y < middlePip.y - 0.04;
  const ringExt   = ringTip.y   < ringPip.y   - 0.04;
  const pinkyExt  = pinkyTip.y  < pinkyPip.y  - 0.04;

  // Finger folded: tip at or below its MCP knuckle
  const indexFolded  = indexTip.y  > indexMcp.y  - 0.01;
  const middleFolded = middleTip.y > middleMcp.y - 0.01;
  const ringFolded   = ringTip.y   > ringMcp.y   - 0.01;
  const pinkyFolded  = pinkyTip.y  > pinkyMcp.y  - 0.01;

  const extendedCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;
  const foldedCount   = [indexFolded, middleFolded, ringFolded, pinkyFolded].filter(Boolean).length;

  // ── THUMBS UP (checked first — highest priority) ──────────
  const otherTipsMinY = Math.min(indexTip.y, middleTip.y, ringTip.y, pinkyTip.y);
  if (thumbTip.y < otherTipsMinY - 0.06 && foldedCount >= 3) return GESTURES.THUMBS_UP;

  // ── THUMBS DOWN ───────────────────────────────────────────
  const otherTipsMaxY = Math.max(indexTip.y, middleTip.y, ringTip.y, pinkyTip.y);
  if (thumbTip.y > otherTipsMaxY + 0.06 && foldedCount >= 3) return GESTURES.THUMBS_DOWN;

  // ── FIST ──────────────────────────────────────────────────
  if (foldedCount >= 3 && extendedCount === 0) {
    if (thumbTip.x > indexMcp.x - 0.08) return GESTURES.FIST;
  }

  // ── OPEN PALM (requires spread to prevent false positives) ─
  if (extendedCount >= 4 && Math.abs(indexTip.x - pinkyTip.x) > 0.12) {
    return GESTURES.OPEN_PALM;
  }

  // ── POINT (cursor mode — never triggers actions) ──────────
  if (indexExt && !middleExt && !ringExt && !pinkyExt) return GESTURES.POINT;

  return GESTURES.NONE;
}

// ── Gesture engine (priority + 500ms stability + 700ms lock) ─
export const gestureEngine = {
  frameBuffer:    [],
  bufferSize:     12,
  candidate:      GESTURES.NONE,
  candidateStart: 0,
  stabilityMs:    500,
  lockUntil:      0,
  lockDuration:   700,

  pushFrame(gesture) {
    this.frameBuffer.push(gesture);
    if (this.frameBuffer.length > this.bufferSize) this.frameBuffer.shift();
  },

  getDominant() {
    if (this.frameBuffer.length < Math.ceil(this.bufferSize * 0.6)) return GESTURES.NONE;
    const counts = {};
    for (const g of this.frameBuffer) counts[g] = (counts[g] || 0) + 1;
    let best = GESTURES.NONE, bestPri = -1;
    for (const [g, count] of Object.entries(counts)) {
      if (g === GESTURES.NONE) continue;
      if (count / this.frameBuffer.length < 0.5) continue;
      const pri = GESTURE_PRIORITY[g] ?? 0;
      if (pri > bestPri) { best = g; bestPri = pri; }
    }
    return best;
  },

  tick(now) {
    const dominant = this.getDominant();
    // OPEN_PALM cannot displace a higher-priority in-progress candidate
    const isLowerPriority =
      dominant === GESTURES.OPEN_PALM &&
      this.candidate !== GESTURES.NONE &&
      (GESTURE_PRIORITY[this.candidate] ?? 0) > (GESTURE_PRIORITY[GESTURES.OPEN_PALM] ?? 0);

    if (!isLowerPriority && dominant !== this.candidate) {
      this.candidate     = dominant;
      this.candidateStart = now;
    }

    const stableMs = now - this.candidateStart;
    const ready    = stableMs >= this.stabilityMs && this.candidate !== GESTURES.NONE && this.candidate !== GESTURES.POINT;
    const locked   = now < this.lockUntil;
    return { gesture: this.candidate, stableMs, ready, locked };
  },

  lock() {
    this.lockUntil      = Date.now() + this.lockDuration;
    this.candidate      = GESTURES.NONE;
    this.candidateStart = 0;
    this.frameBuffer    = [];
  },
};

// ── Cursor (smoothed index-fingertip tracking) ───────────────
export const cursor = {
  targetX: -200, targetY: -200,
  x: -200, y: -200,
  visible: false,
  lerpFactor: 0.22,
};

let cursorEl    = null;
let dwellRingEl = null;

export function initCursor() {
  cursorEl = document.createElement('div');
  cursorEl.id = 'finger-cursor';
  cursorEl.innerHTML = `
    <svg class="cursor-dwell-ring" viewBox="0 0 44 44">
      <circle class="dwell-track" cx="22" cy="22" r="18"/>
      <circle class="dwell-fill"  cx="22" cy="22" r="18"/>
    </svg>
    <div class="cursor-dot"></div>`;
  document.getElementById('app').appendChild(cursorEl);
  dwellRingEl = cursorEl.querySelector('.dwell-fill');
}

export function lerpCursor() {
  cursor.x += (cursor.targetX - cursor.x) * cursor.lerpFactor;
  cursor.y += (cursor.targetY - cursor.y) * cursor.lerpFactor;
}

export function updateCursorPosition() {
  if (!cursorEl) return;
  cursorEl.style.transform = `translate(${cursor.x - 22}px, ${cursor.y - 22}px)`;
  cursorEl.style.opacity   = cursor.visible ? '1' : '0';
}

// ── Hover / dwell system ─────────────────────────────────────
export const hover = {
  index:        -1,
  dwellStart:   0,
  dwellDuration: 350,
  lockedIndex:  -1,
};

function getSelectableItems() {
  return Array.from(document.querySelectorAll('.screen.active .selectable'));
}

function hitTestSelectables(x, y) {
  const items = getSelectableItems();
  for (let i = 0; i < items.length; i++) {
    const r = items[i].getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
  }
  return -1;
}

export function setDwellProgress(t) {
  if (!dwellRingEl) return;
  const circ = 113.1;
  dwellRingEl.style.strokeDasharray = `${t * circ} ${circ}`;
  dwellRingEl.style.opacity = hover.index >= 0 ? '1' : '0';
}

export function updateSelectableHighlight() {
  const items = getSelectableItems();
  items.forEach((item, i) => {
    item.classList.remove('selected', 'hover-active');
    if (i === hover.lockedIndex)      item.classList.add('selected');
    else if (i === hover.index)       item.classList.add('hover-active');
  });
}

export function updateHoverState(now, interactionEnabled = true) {
  if (!interactionEnabled) {
    if (hover.index !== -1 || hover.lockedIndex !== -1) {
      hover.index = -1; hover.lockedIndex = -1;
      setDwellProgress(0);
      updateSelectableHighlight();
    }
    if (cursorEl) cursorEl.classList.remove('on-card');
    return;
  }

  const hitIndex = hitTestSelectables(cursor.x, cursor.y);

  if (hitIndex !== hover.index) {
    hover.index       = hitIndex;
    hover.dwellStart  = now;
    hover.lockedIndex = -1;
    updateSelectableHighlight();
  }

  if (hover.index >= 0) {
    const elapsed  = now - hover.dwellStart;
    setDwellProgress(Math.min(elapsed / hover.dwellDuration, 1));
    if (elapsed >= hover.dwellDuration && hover.lockedIndex !== hover.index) {
      hover.lockedIndex = hover.index;
      updateSelectableHighlight();
    }
  } else {
    setDwellProgress(0);
  }

  if (cursorEl) cursorEl.classList.toggle('on-card', hover.index >= 0);
}

export function resetHover() {
  hover.index = -1;
  hover.lockedIndex = -1;
  setDwellProgress(0);
  updateSelectableHighlight();
}

// ── Gesture indicator UI ─────────────────────────────────────
export function updateGestureUI(engineState) {
  const { gesture, stableMs, ready, locked } = engineState;
  const indicator = document.getElementById('gesture-indicator');
  if (!indicator) return;
  document.getElementById('gesture-icon').textContent  = GESTURE_ICONS[gesture]  || '';
  document.getElementById('gesture-label').textContent = GESTURE_LABELS[gesture] || 'NO HAND';

  const progress = Math.min(stableMs / gestureEngine.stabilityMs, 1);
  const bar = document.getElementById('confidence-bar');
  if (bar) {
    bar.style.width      = `${Math.round(progress * 100)}%`;
    bar.style.background = locked ? 'var(--warning)' : ready ? 'var(--success)' : 'var(--primary)';
  }

  const isActive = gesture !== GESTURES.NONE && gesture !== GESTURES.POINT;
  indicator.classList.toggle('active',  isActive);
  indicator.classList.toggle('ready',   ready && !locked);
  indicator.classList.toggle('locked',  locked);
}
