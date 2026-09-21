import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export type TrackingStatus = 'initializing' | 'tracking' | 'no-camera' | 'error';

export interface RawHandFrame {
  handCount: number;
  cursorX: number; // palm center, mirrored — stays put whether the hand is open, fisted, or pinching
  cursorY: number;
  isPinching: boolean; // thumb+index "pick" — grab a tube, or drag it over another to pour
  isPalmOpen: boolean; // held for 2s anywhere — opens the pause menu
  isThumbsUp: boolean; // undo
  isVictorySign: boolean; // hint
}

const EMPTY: RawHandFrame = {
  handCount: 0,
  cursorX: 0.5,
  cursorY: 0.5,
  isPinching: false,
  isPalmOpen: false,
  isThumbsUp: false,
  isVictorySign: false,
};

const OPEN_ON = 1.15;

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Per-finger extension (tip distance from palm center, normalized by hand
 * scale) is the primitive open-palm/thumbs-up/victory-sign are all built
 * from, matching every other classifyHand in this catalog. Pinch distance
 * (thumb tip to index tip) is returned separately rather than resolved into
 * a boolean here, since it needs frame-to-frame hysteresis — handled by the
 * caller in `detect()`, the same pattern gesture-sudoku's `isPinching` uses.
 */
function classifyHand(lm: NormalizedLandmark[]) {
  const wrist = lm[0];
  const midMcp = lm[9];
  const handScale = Math.max(0.02, dist(wrist, midMcp));
  const palmPts = [lm[0], lm[5], lm[9], lm[13], lm[17]];
  const palmX = palmPts.reduce((s, p) => s + p.x, 0) / palmPts.length;
  const palmY = palmPts.reduce((s, p) => s + p.y, 0) / palmPts.length;

  const extension = (tip: NormalizedLandmark) => Math.hypot(tip.x - palmX, tip.y - palmY) / handScale;
  const indexExt = extension(lm[8]);
  const middleExt = extension(lm[12]);
  const ringExt = extension(lm[16]);
  const pinkyExt = extension(lm[20]);
  const avgExt = (indexExt + middleExt + ringExt + pinkyExt) / 4;

  const thumbTip = lm[4];
  const thumbMcp = lm[2];
  const thumbExt = dist(thumbTip, wrist) / handScale;
  // "Pointing up" means higher on screen — smaller y — than its own base joint.
  const thumbPointsUp = thumbTip.y < thumbMcp.y - 0.03;

  const fourCurled = avgExt < 0.7;
  const isThumbsUp = fourCurled && thumbExt > 0.75 && thumbPointsUp;

  // Victory sign: index+middle extended and spread apart in a V, ring+pinky curled.
  const indexMiddleExtended = indexExt > 1.0 && middleExt > 1.0;
  const ringPinkyCurled = ringExt < 0.75 && pinkyExt < 0.75;
  const tipSpread = dist(lm[8], lm[12]) / handScale;
  const isVictorySign = indexMiddleExtended && ringPinkyCurled && tipSpread > 0.35;

  return {
    // The palm center (wrist + MCP knuckles), not the index fingertip: the
    // fingertip moves substantially between an open hand, a fist, and a
    // pinch, which would yank the cursor off whatever it was hovering at
    // the exact moment a gesture is made. The palm's knuckle structure
    // barely moves across any of these hand shapes, so it stays put under
    // the cursor the player is trying to hold in place.
    cursorX: palmX,
    cursorY: palmY,
    pinchDist: dist(lm[4], lm[8]) / handScale,
    isPalmOpen: avgExt > OPEN_ON,
    isThumbsUp,
    isVictorySign,
  };
}

interface StartOptions {
  video: HTMLVideoElement;
  mirror: boolean;
  /** Settings.gestureSensitivity (0..1), read live each frame — higher widens the pinch trigger distance, making a grab easier to register without needing to restart tracking when the setting changes. */
  pinchSensitivityRef: { current: number };
  onFrame: (frame: RawHandFrame) => void;
  onStatus: (status: TrackingStatus) => void;
}

export function startHandTracking(opts: StartOptions): () => void {
  let landmarker: HandLandmarker | null = null;
  let rafId = 0;
  let alive = true;
  let stream: MediaStream | null = null;

  async function init() {
    opts.onStatus('initializing');
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm',
      );
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        // Only one hand is ever meaningful to this game's gesture vocabulary.
        numHands: 1,
        minHandDetectionConfidence: 0.7,
        minHandPresenceConfidence: 0.7,
        minTrackingConfidence: 0.7,
        runningMode: 'VIDEO',
      });

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 960, height: 540 },
      });
      if (!alive) return;
      opts.video.srcObject = stream;
      await opts.video.play();
    } catch (err) {
      console.error('[liquid-puzzle] camera/model init failed', err);
      opts.onStatus('no-camera');
      return;
    }

    opts.onStatus('tracking');
    let lastMs = -1;
    let pinching = false;

    function detect() {
      if (!alive || !landmarker) return;
      const vid = opts.video;
      if (vid && vid.readyState >= 2 && vid.currentTime !== lastMs) {
        lastMs = vid.currentTime;
        const res = landmarker.detectForVideo(vid, performance.now());
        const landmarks = res.landmarks ?? [];

        if (landmarks.length === 0) {
          pinching = false;
          opts.onFrame(EMPTY);
        } else {
          const primary = classifyHand(landmarks[0]);
          const rawX = primary.cursorX;
          const cursorX = opts.mirror ? 1 - rawX : rawX;

          // A looser sensitivity setting widens both the trigger and release
          // distance together, preserving the hysteresis gap between them so
          // pinch detection never chatters right at the boundary regardless
          // of the current setting.
          const pinchOn = 0.3 + opts.pinchSensitivityRef.current * 0.15;
          const pinchOff = pinchOn + 0.1;
          if (pinching) {
            if (primary.pinchDist > pinchOff) pinching = false;
          } else if (primary.pinchDist < pinchOn) {
            pinching = true;
          }

          opts.onFrame({
            handCount: landmarks.length,
            cursorX,
            cursorY: primary.cursorY,
            isPinching: pinching,
            isPalmOpen: primary.isPalmOpen,
            isThumbsUp: primary.isThumbsUp,
            isVictorySign: primary.isVictorySign,
          });
        }
      }
      rafId = requestAnimationFrame(detect);
    }
    rafId = requestAnimationFrame(detect);
  }

  init();

  return () => {
    alive = false;
    cancelAnimationFrame(rafId);
    landmarker?.close();
    stream?.getTracks().forEach((t) => t.stop());
  };
}
