// Normalized keypoint positions for reference avatar drawing.
// Coordinate system: x=[0..1] left-to-right, y=[0..1] top-to-bottom
// Defined for a forward-facing figure with neutral stance at center.
// LM indices match MediaPipe landmark order for the joints we care about.

function kp(x, y) { return { x, y }; }

// Base standing figure keypoints (used as fallback)
const BASE = {
  0:  kp(0.50, 0.08),  // nose
  11: kp(0.38, 0.28),  // left shoulder
  12: kp(0.62, 0.28),  // right shoulder
  13: kp(0.30, 0.44),  // left elbow
  14: kp(0.70, 0.44),  // right elbow
  15: kp(0.26, 0.60),  // left wrist
  16: kp(0.74, 0.60),  // right wrist
  23: kp(0.42, 0.58),  // left hip
  24: kp(0.58, 0.58),  // right hip
  25: kp(0.42, 0.76),  // left knee
  26: kp(0.58, 0.76),  // right knee
  27: kp(0.42, 0.94),  // left ankle
  28: kp(0.58, 0.94),  // right ankle
};

// Connections for drawing skeleton
export const SKELETON_CONNECTIONS = [
  [0, 11], [0, 12],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24],
  [23, 24],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
];

export const POSES = [
  // ── EASY ────────────────────────────────────────────────────────────────
  {
    id: 'tpose',
    name: 'T-Pose',
    description: 'Spread arms wide like a T',
    difficulty: 1,
    keypoints: {
      ...BASE,
      13: kp(0.15, 0.28), 14: kp(0.85, 0.28),
      15: kp(0.05, 0.28), 16: kp(0.95, 0.28),
    },
    angles: {
      leftShoulder:  { target: 88,  weight: 3, tol: 18 },
      rightShoulder: { target: 88,  weight: 3, tol: 18 },
      leftElbow:     { target: 175, weight: 2, tol: 15 },
      rightElbow:    { target: 175, weight: 2, tol: 15 },
      leftKnee:      { target: 175, weight: 1, tol: 20 },
      rightKnee:     { target: 175, weight: 1, tol: 20 },
    },
    posChecks: [],
  },
  {
    id: 'hands_up',
    name: 'Hands Up!',
    description: 'Raise both hands above your head',
    difficulty: 1,
    keypoints: {
      ...BASE,
      13: kp(0.28, 0.18), 14: kp(0.72, 0.18),
      15: kp(0.22, 0.02), 16: kp(0.78, 0.02),
    },
    angles: {
      leftShoulder:  { target: 160, weight: 3, tol: 20 },
      rightShoulder: { target: 160, weight: 3, tol: 20 },
      leftElbow:     { target: 160, weight: 2, tol: 20 },
      rightElbow:    { target: 160, weight: 2, tol: 20 },
    },
    posChecks: [
      { check: 'leftHandAboveHead',  weight: 3 },
      { check: 'rightHandAboveHead', weight: 3 },
    ],
  },
  {
    id: 'hands_down',
    name: 'Stand Straight',
    description: 'Arms at your sides, stand tall',
    difficulty: 1,
    keypoints: {
      ...BASE,
    },
    angles: {
      leftShoulder:  { target: 12,  weight: 3, tol: 18 },
      rightShoulder: { target: 12,  weight: 3, tol: 18 },
      leftElbow:     { target: 165, weight: 1, tol: 20 },
      rightElbow:    { target: 165, weight: 1, tol: 20 },
      leftKnee:      { target: 175, weight: 1, tol: 20 },
      rightKnee:     { target: 175, weight: 1, tol: 20 },
    },
    posChecks: [],
  },
  {
    id: 'left_hand_up',
    name: 'Left Hand Up',
    description: 'Raise only your LEFT hand',
    difficulty: 1,
    keypoints: {
      ...BASE,
      13: kp(0.28, 0.18), 15: kp(0.22, 0.02),
      14: kp(0.70, 0.44), 16: kp(0.74, 0.60),
    },
    angles: {
      leftShoulder:  { target: 158, weight: 3, tol: 20 },
      rightShoulder: { target: 12,  weight: 3, tol: 18 },
      leftElbow:     { target: 158, weight: 2, tol: 20 },
      rightElbow:    { target: 165, weight: 1, tol: 20 },
    },
    posChecks: [
      { check: 'leftHandAboveHead',       weight: 3 },
      { check: 'rightHandBelowShoulder',  weight: 2 },
    ],
  },
  {
    id: 'right_hand_up',
    name: 'Right Hand Up',
    description: 'Raise only your RIGHT hand',
    difficulty: 1,
    keypoints: {
      ...BASE,
      14: kp(0.72, 0.18), 16: kp(0.78, 0.02),
      13: kp(0.30, 0.44), 15: kp(0.26, 0.60),
    },
    angles: {
      rightShoulder: { target: 158, weight: 3, tol: 20 },
      leftShoulder:  { target: 12,  weight: 3, tol: 18 },
      rightElbow:    { target: 158, weight: 2, tol: 20 },
      leftElbow:     { target: 165, weight: 1, tol: 20 },
    },
    posChecks: [
      { check: 'rightHandAboveHead',     weight: 3 },
      { check: 'leftHandBelowShoulder',  weight: 2 },
    ],
  },

  // ── MEDIUM ───────────────────────────────────────────────────────────────
  {
    id: 'hands_on_head',
    name: 'Hands on Head',
    description: 'Put both hands on top of your head',
    difficulty: 2,
    keypoints: {
      ...BASE,
      13: kp(0.22, 0.18), 14: kp(0.78, 0.18),
      15: kp(0.40, 0.06), 16: kp(0.60, 0.06),
    },
    angles: {
      leftShoulder:  { target: 95,  weight: 3, tol: 20 },
      rightShoulder: { target: 95,  weight: 3, tol: 20 },
      leftElbow:     { target: 75,  weight: 3, tol: 22 },
      rightElbow:    { target: 75,  weight: 3, tol: 22 },
    },
    posChecks: [
      { check: 'leftHandAboveNose',  weight: 2 },
      { check: 'rightHandAboveNose', weight: 2 },
    ],
  },
  {
    id: 'cross_arms',
    name: 'Cross Arms',
    description: 'Cross your arms over your chest',
    difficulty: 2,
    keypoints: {
      ...BASE,
      13: kp(0.48, 0.34), 14: kp(0.52, 0.34),
      15: kp(0.58, 0.38), 16: kp(0.42, 0.38),
    },
    angles: {
      leftShoulder:  { target: 42,  weight: 3, tol: 22 },
      rightShoulder: { target: 42,  weight: 3, tol: 22 },
      leftElbow:     { target: 68,  weight: 2, tol: 22 },
      rightElbow:    { target: 68,  weight: 2, tol: 22 },
    },
    posChecks: [
      { check: 'handsCrossed', weight: 4 },
    ],
  },
  {
    id: 'lean_left',
    name: 'Lean Left',
    description: 'Tilt your body to the LEFT',
    difficulty: 2,
    keypoints: {
      ...BASE,
      0:  kp(0.38, 0.08),
      11: kp(0.28, 0.28), 12: kp(0.52, 0.28),
      13: kp(0.20, 0.44), 14: kp(0.62, 0.44),
      15: kp(0.16, 0.58), 16: kp(0.70, 0.58),
      23: kp(0.35, 0.58), 24: kp(0.52, 0.58),
    },
    angles: {
      leftKnee:  { target: 175, weight: 1, tol: 20 },
      rightKnee: { target: 175, weight: 1, tol: 20 },
    },
    posChecks: [
      { check: 'leaningLeft', weight: 5 },
    ],
  },
  {
    id: 'lean_right',
    name: 'Lean Right',
    description: 'Tilt your body to the RIGHT',
    difficulty: 2,
    keypoints: {
      ...BASE,
      0:  kp(0.62, 0.08),
      11: kp(0.48, 0.28), 12: kp(0.72, 0.28),
      13: kp(0.38, 0.44), 14: kp(0.80, 0.44),
      15: kp(0.30, 0.58), 16: kp(0.84, 0.58),
      23: kp(0.48, 0.58), 24: kp(0.65, 0.58),
    },
    angles: {
      leftKnee:  { target: 175, weight: 1, tol: 20 },
      rightKnee: { target: 175, weight: 1, tol: 20 },
    },
    posChecks: [
      { check: 'leaningRight', weight: 5 },
    ],
  },

  // ── HARD ─────────────────────────────────────────────────────────────────
  {
    id: 'left_knee_up',
    name: 'Left Knee Up',
    description: 'Raise your LEFT knee high',
    difficulty: 3,
    keypoints: {
      ...BASE,
      25: kp(0.40, 0.65), 27: kp(0.40, 0.65),
    },
    angles: {
      leftKnee:  { target: 80,  weight: 3, tol: 22 },
      leftHip:   { target: 62,  weight: 3, tol: 22 },
      rightKnee: { target: 175, weight: 2, tol: 20 },
    },
    posChecks: [
      { check: 'leftKneeRaised', weight: 4 },
    ],
  },
  {
    id: 'right_knee_up',
    name: 'Right Knee Up',
    description: 'Raise your RIGHT knee high',
    difficulty: 3,
    keypoints: {
      ...BASE,
      26: kp(0.60, 0.65), 28: kp(0.60, 0.65),
    },
    angles: {
      rightKnee: { target: 80,  weight: 3, tol: 22 },
      rightHip:  { target: 62,  weight: 3, tol: 22 },
      leftKnee:  { target: 175, weight: 2, tol: 20 },
    },
    posChecks: [
      { check: 'rightKneeRaised', weight: 4 },
    ],
  },
  {
    id: 'squat',
    name: 'Squat!',
    description: 'Bend both knees and squat down',
    difficulty: 3,
    keypoints: {
      ...BASE,
      23: kp(0.42, 0.65), 24: kp(0.58, 0.65),
      25: kp(0.38, 0.80), 26: kp(0.62, 0.80),
      27: kp(0.36, 0.94), 28: kp(0.64, 0.94),
    },
    angles: {
      leftKnee:  { target: 88,  weight: 3, tol: 22 },
      rightKnee: { target: 88,  weight: 3, tol: 22 },
      leftHip:   { target: 88,  weight: 2, tol: 22 },
      rightHip:  { target: 88,  weight: 2, tol: 22 },
    },
    posChecks: [
      { check: 'squatting', weight: 4 },
    ],
  },

  // ── EXPERT ───────────────────────────────────────────────────────────────
  {
    id: 'warrior',
    name: 'Warrior Stance',
    description: 'Left arm forward, right arm back — warrior pose!',
    difficulty: 4,
    keypoints: {
      ...BASE,
      13: kp(0.18, 0.24), 15: kp(0.06, 0.20),
      14: kp(0.75, 0.32), 16: kp(0.88, 0.38),
      25: kp(0.36, 0.72), 26: kp(0.62, 0.78),
      27: kp(0.30, 0.94), 28: kp(0.66, 0.94),
    },
    angles: {
      leftShoulder:  { target: 125, weight: 3, tol: 22 },
      rightShoulder: { target: 48,  weight: 3, tol: 22 },
      leftElbow:     { target: 168, weight: 2, tol: 20 },
      rightElbow:    { target: 165, weight: 2, tol: 20 },
      leftKnee:      { target: 148, weight: 2, tol: 22 },
      rightKnee:     { target: 148, weight: 2, tol: 22 },
    },
    posChecks: [],
  },
];

// Build ordered sequence: 3 easy, 3 medium, 3 hard, 3 expert (cycling)
export function buildRoundSequence() {
  const byDiff = { 1: [], 2: [], 3: [], 4: [] };
  for (const p of POSES) byDiff[p.difficulty].push(p);

  // Shuffle each bucket
  for (const k of Object.keys(byDiff)) {
    byDiff[k].sort(() => Math.random() - 0.5);
  }

  const sequence = [];
  const counts = { 1: 3, 2: 3, 3: 3, 4: 3 };
  for (const [diff, count] of Object.entries(counts)) {
    const pool = byDiff[diff];
    for (let i = 0; i < count; i++) {
      sequence.push(pool[i % pool.length]);
    }
  }
  return sequence;
}
