// Camera + MediaPipe hand landmarker for TV screens.
//
// Tracks a single hand: menus follow one person, and every extra hand costs
// inference time a Raspberry Pi does not have. Reports the index fingertip in
// raw camera coordinates (0–1, not mirrored); mapping it onto the screen is the
// caller's job.

import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { HAND_MODEL_URL, MEDIAPIPE_WASM_URL } from "./assets";

export type TrackerStatus = "loading" | "ready" | "denied" | "no-camera" | "error";

export interface HandSample {
  present: boolean;
  /** Index fingertip, camera space (0–1). Only meaningful when `present`. */
  x: number;
  y: number;
  /** Handedness confidence of the detected hand (0–1). */
  score: number;
  /** Time spent inside `detectForVideo` for this frame. */
  inferenceMs: number;
  timestamp: number;
}

export type Delegate = "GPU" | "CPU";

interface StartOptions {
  video: HTMLVideoElement;
  onSample: (sample: HandSample) => void;
  onStatus: (status: TrackerStatus) => void;
  /** Which backend the model ended up on; CPU means WebGL was unavailable. */
  onDelegate?: (delegate: Delegate) => void;
  /** Upper bound on inference rate; the camera may deliver fewer frames. */
  maxFps?: number;
}

const INDEX_TIP = 8;

function cameraErrorStatus(err: unknown): TrackerStatus {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "NotReadableError" || name === "OverconstrainedError") {
    return "no-camera";
  }
  return "error";
}

async function createLandmarker(): Promise<{ landmarker: HandLandmarker; delegate: Delegate }> {
  // Loaded on demand so the ~1 MB bundle only reaches browsers that show a
  // TV screen, never the desktop pages.
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

  const options = (delegate: Delegate) => ({
    baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });

  try {
    return { landmarker: await HandLandmarker.createFromOptions(vision, options("GPU")), delegate: "GPU" };
  } catch {
    // No usable WebGL (some Pi images, software rendering): the CPU path is
    // slower but still interactive.
    return { landmarker: await HandLandmarker.createFromOptions(vision, options("CPU")), delegate: "CPU" };
  }
}

/** Starts the camera and tracking loop. Returns a function that stops both. */
export function startHandTracker({
  video,
  onSample,
  onStatus,
  onDelegate,
  maxFps = 30,
}: StartOptions): () => void {
  let alive = true;
  let stream: MediaStream | null = null;
  let landmarker: HandLandmarker | null = null;
  let frameHandle = 0;
  let lastVideoTime = -1;
  let lastInferenceAt = 0;
  const minInterval = 1000 / maxFps;
  const useVideoFrames = "requestVideoFrameCallback" in HTMLVideoElement.prototype;

  const scheduleNext = () => {
    if (!alive) return;
    frameHandle = useVideoFrames
      ? video.requestVideoFrameCallback(detect)
      : requestAnimationFrame(detect);
  };

  function detect() {
    if (!alive || !landmarker) return;
    const now = performance.now();

    if (
      video.readyState >= 2 &&
      video.currentTime !== lastVideoTime &&
      now - lastInferenceAt >= minInterval
    ) {
      lastVideoTime = video.currentTime;
      lastInferenceAt = now;
      const result = landmarker.detectForVideo(video, now);
      const inferenceMs = performance.now() - now;
      const hand = result.landmarks[0];

      onSample(
        hand
          ? {
              present: true,
              x: hand[INDEX_TIP].x,
              y: hand[INDEX_TIP].y,
              score: result.handedness[0]?.[0]?.score ?? 0,
              inferenceMs,
              timestamp: now,
            }
          : { present: false, x: 0, y: 0, score: 0, inferenceMs, timestamp: now },
      );
    }

    scheduleNext();
  }

  async function init() {
    onStatus("loading");

    // Camera and model load in parallel; the model is the slow part on a cold
    // cache, and a missing camera should be reported without waiting for it.
    const cameraPromise = navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      })
      .then((s) => ({ ok: true as const, stream: s }))
      .catch((err: unknown) => ({ ok: false as const, err }));

    const modelPromise = createLandmarker()
      .then((created) => ({ ok: true as const, ...created }))
      .catch((err: unknown) => ({ ok: false as const, err }));

    const camera = await cameraPromise;
    if (!camera.ok) {
      if (alive) onStatus(cameraErrorStatus(camera.err));
      void modelPromise.then((m) => m.ok && m.landmarker.close());
      return;
    }
    stream = camera.stream;
    if (!alive) {
      stream.getTracks().forEach((t) => t.stop());
      void modelPromise.then((m) => m.ok && m.landmarker.close());
      return;
    }

    const model = await modelPromise;
    if (!model.ok) {
      console.error("[hand-input] hand model failed to load", model.err);
      if (alive) onStatus("error");
      return;
    }
    landmarker = model.landmarker;
    if (!alive) {
      landmarker.close();
      return;
    }
    onDelegate?.(model.delegate);

    try {
      video.srcObject = stream;
      await video.play();
    } catch (err) {
      console.error("[hand-input] camera preview failed to start", err);
      if (alive) onStatus("error");
      return;
    }

    if (!alive) return;
    onStatus("ready");
    scheduleNext();
  }

  void init();

  return () => {
    alive = false;
    if (useVideoFrames) video.cancelVideoFrameCallback(frameHandle);
    else cancelAnimationFrame(frameHandle);
    // Releasing the camera matters: a game iframe opened next needs it.
    stream?.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
    landmarker?.close();
  };
}
