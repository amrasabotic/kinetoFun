/**
 * MediaPipe HandLandmarker wrapper. Loads model on demand, streams a
 * normalized fingertip position + pinch state. Caller can stop tracking
 * at any time. All MediaPipe imports are dynamic to keep the home page
 * lightweight and avoid SSR issues.
 */

export interface HandTrackingState {
  /** Normalized [0..1] x/y of index fingertip, mirrored horizontally for camera-feels-natural. Null if no hand. */
  point: { x: number; y: number } | null;
  pinch: boolean;
  /** All 21 hand landmarks (normalized, NOT mirrored — caller mirrors when drawing). */
  landmarks: Array<{ x: number; y: number; z: number }> | null;
}

export interface HandTracker {
  stop: () => void;
  video: HTMLVideoElement;
}

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const PINCH_ON_THRESHOLD = 0.055; // normalized distance between thumb & index tips
const PINCH_OFF_THRESHOLD = 0.085;

export async function startHandTracking(
  onUpdate: (s: HandTrackingState) => void,
): Promise<HandTracker> {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");

  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const landmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: "user" },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();

  let pinchActive = false;
  let rafId = 0;
  let stopped = false;
  let lastTs = -1;

  const loop = () => {
    if (stopped) return;
    const ts = performance.now();
    if (video.readyState >= 2 && ts !== lastTs) {
      lastTs = ts;
      try {
        const res = landmarker.detectForVideo(video, ts);
        if (res.landmarks?.[0]) {
          const lm = res.landmarks[0];
          const idxTip = lm[8];
          const thumbTip = lm[4];
          // Mirror horizontally (camera is selfie-style)
          const x = 1 - idxTip.x;
          const y = idxTip.y;
          const dx = idxTip.x - thumbTip.x;
          const dy = idxTip.y - thumbTip.y;
          const dist = Math.hypot(dx, dy);
          if (!pinchActive && dist < PINCH_ON_THRESHOLD) pinchActive = true;
          else if (pinchActive && dist > PINCH_OFF_THRESHOLD) pinchActive = false;
          onUpdate({ point: { x, y }, pinch: pinchActive, landmarks: lm });
        } else {
          pinchActive = false;
          onUpdate({ point: null, pinch: false, landmarks: null });
        }
      } catch {
        /* ignore frame errors */
      }
    }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);

  return {
    video,
    stop: () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream.getTracks().forEach((t) => t.stop());
      landmarker.close();
    },
  };
}