import { LM } from './constants.js';
import { angleDeg, dist2d, angleSimilarity, clamp, mean } from '../utils/MathUtils.js';

// Extract all relevant joint angles from a landmark array
export function extractAngles(lm) {
  if (!lm || lm.length < 33) return null;

  const get = (i) => lm[i] ?? { x: 0, y: 0, z: 0, visibility: 0 };

  const ls = get(LM.LEFT_SHOULDER);
  const rs = get(LM.RIGHT_SHOULDER);
  const le = get(LM.LEFT_ELBOW);
  const re = get(LM.RIGHT_ELBOW);
  const lw = get(LM.LEFT_WRIST);
  const rw = get(LM.RIGHT_WRIST);
  const lh = get(LM.LEFT_HIP);
  const rh = get(LM.RIGHT_HIP);
  const lk = get(LM.LEFT_KNEE);
  const rk = get(LM.RIGHT_KNEE);
  const la = get(LM.LEFT_ANKLE);
  const ra = get(LM.RIGHT_ANKLE);
  const nose = get(LM.NOSE);

  const midHip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  const midShoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };

  return {
    // Elbow angles (shoulder-elbow-wrist)
    leftElbow:     angleDeg(ls, le, lw),
    rightElbow:    angleDeg(rs, re, rw),

    // Shoulder abduction angles (hip-shoulder-elbow)
    leftShoulder:  angleDeg(lh, ls, le),
    rightShoulder: angleDeg(rh, rs, re),

    // Knee angles (hip-knee-ankle)
    leftKnee:      angleDeg(lh, lk, la),
    rightKnee:     angleDeg(rh, rk, ra),

    // Hip flexion angles (shoulder-hip-knee)
    leftHip:       angleDeg(ls, lh, lk),
    rightHip:      angleDeg(rs, rh, rk),

    // Positional data for pos checks
    _raw: {
      nose, ls, rs, le, re, lw, rw, lh, rh, lk, rk, la, ra,
      midHip, midShoulder,
    },
  };
}

// Evaluate position-based checks using normalized landmark data
function evalPosCheck(check, raw) {
  const { nose, ls, rs, lw, rw, lh, rh, lk, rk, midShoulder } = raw;

  // y is 0 at top, 1 at bottom → "above" means lower y value
  switch (check) {
    case 'leftHandAboveHead':
      return lw.y < nose.y - 0.05 ? 1 : clamp(1 - (lw.y - (nose.y - 0.05)) / 0.15, 0, 1);
    case 'rightHandAboveHead':
      return rw.y < nose.y - 0.05 ? 1 : clamp(1 - (rw.y - (nose.y - 0.05)) / 0.15, 0, 1);
    case 'leftHandAboveNose':
      return lw.y < nose.y ? 1 : clamp(1 - (lw.y - nose.y) / 0.12, 0, 1);
    case 'rightHandAboveNose':
      return rw.y < nose.y ? 1 : clamp(1 - (rw.y - nose.y) / 0.12, 0, 1);
    case 'leftHandAboveShoulder':
      return lw.y < ls.y ? 1 : clamp(1 - (lw.y - ls.y) / 0.15, 0, 1);
    case 'rightHandAboveShoulder':
      return rw.y < rs.y ? 1 : clamp(1 - (rw.y - rs.y) / 0.15, 0, 1);
    case 'leftHandBelowShoulder':
      return lw.y > ls.y + 0.05 ? 1 : clamp(1 - (ls.y + 0.05 - lw.y) / 0.15, 0, 1);
    case 'rightHandBelowShoulder':
      return rw.y > rs.y + 0.05 ? 1 : clamp(1 - (rs.y + 0.05 - rw.y) / 0.15, 0, 1);
    case 'handsCrossed': {
      // In mirrored view: left wrist x > right wrist x means arms are crossed
      const crossed = lw.x - rw.x;
      return crossed > 0 ? clamp(crossed / 0.10, 0, 1) : clamp(1 + crossed / 0.08, 0, 1);
    }
    case 'leaningLeft': {
      // Left shoulder significantly lower than right shoulder (in y)
      const diff = ls.y - rs.y; // positive = left is lower
      return diff > 0.04 ? clamp(diff / 0.12, 0, 1) : clamp(1 + (diff - 0.04) / 0.08, 0, 1);
    }
    case 'leaningRight': {
      const diff = rs.y - ls.y;
      return diff > 0.04 ? clamp(diff / 0.12, 0, 1) : clamp(1 + (diff - 0.04) / 0.08, 0, 1);
    }
    case 'leftKneeRaised': {
      // Left knee y should be significantly above left hip y
      const lifted = lh.y - lk.y;
      return lifted > 0.08 ? clamp(lifted / 0.18, 0, 1) : clamp(1 + (lifted - 0.08) / 0.12, 0, 1);
    }
    case 'rightKneeRaised': {
      const lifted = rh.y - rk.y;
      return lifted > 0.08 ? clamp(lifted / 0.18, 0, 1) : clamp(1 + (lifted - 0.08) / 0.12, 0, 1);
    }
    case 'squatting': {
      // Hips significantly lower (higher y) than in standing — measure ratio
      const torsoH = Math.abs(midShoulder.y - ((lh.y + rh.y) / 2));
      const hipY = (lh.y + rh.y) / 2;
      const kneeY = (lk.y + rk.y) / 2;
      const squat = (kneeY - hipY) / Math.max(torsoH, 0.05);
      return squat < 0.4 ? clamp(1 - (0.4 - squat) / 0.5, 0, 1) : 1;
    }
    default:
      return 0;
  }
}

// Compare current landmarks against a pose definition.
// Returns { accuracy: 0-100, details: {} }
export function comparePose(landmarks, pose) {
  const angles = extractAngles(landmarks);
  if (!angles) return { accuracy: 0, details: {} };

  const details = {};
  let weightedSum = 0;
  let totalWeight = 0;

  // Angle comparisons
  for (const [joint, spec] of Object.entries(pose.angles)) {
    const actual = angles[joint];
    if (actual === undefined) continue;
    const sim = angleSimilarity(actual, spec.target, spec.tol);
    details[joint] = { actual, target: spec.target, sim };
    weightedSum += sim * spec.weight;
    totalWeight += spec.weight;
  }

  // Position checks
  for (const { check, weight } of (pose.posChecks ?? [])) {
    const sim = evalPosCheck(check, angles._raw);
    details[check] = { sim };
    weightedSum += sim * weight;
    totalWeight += weight;
  }

  const accuracy = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
  return { accuracy: clamp(accuracy, 0, 100), details };
}

// Detect "hands above head" — used for start / restart gestures
export function handsAboveHead(landmarks) {
  if (!landmarks || landmarks.length < 33) return false;
  const nose  = landmarks[LM.NOSE];
  const lw    = landmarks[LM.LEFT_WRIST];
  const rw    = landmarks[LM.RIGHT_WRIST];
  return lw && rw && nose &&
    lw.y < nose.y - 0.08 &&
    rw.y < nose.y - 0.08;
}

// Detect clap: both wrists close together and moving toward each other
export function detectClap(landmarks, prevLandmarks) {
  if (!landmarks || !prevLandmarks || landmarks.length < 33) return false;
  const lw    = landmarks[LM.LEFT_WRIST];
  const rw    = landmarks[LM.RIGHT_WRIST];
  const plw   = prevLandmarks[LM.LEFT_WRIST];
  const prw   = prevLandmarks[LM.RIGHT_WRIST];
  if (!lw || !rw || !plw || !prw) return false;

  const currDist = dist2d(lw, rw);
  const prevDist = dist2d(plw, prw);
  // Clap: hands came together quickly (distance dropped significantly)
  return currDist < 0.12 && prevDist > 0.22 && (prevDist - currDist) > 0.10;
}

// Check if a person is visible in frame (nose + both shoulders visible)
export function personInFrame(landmarks) {
  if (!landmarks || landmarks.length < 33) return false;
  const vis = (i) => (landmarks[i]?.visibility ?? 0) > 0.5;
  return vis(LM.NOSE) && vis(LM.LEFT_SHOULDER) && vis(LM.RIGHT_SHOULDER) && vis(LM.LEFT_HIP);
}
