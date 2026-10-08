import { getHandLandmarker, readHand, type HandState } from "./handTracker";

/**
 * One camera stream and one detection loop for the whole app. The menus and
 * the archery game both read the latest hand from here, because the hand
 * landmarker in VIDEO mode rejects two callers feeding it frames, and the
 * game is played on TVs where every screen must respond to the hand.
 */
type HandInput = {
  stream: MediaStream;
  latest: HandState | null;
  lastT: number;
};

let current: HandInput | null = null;
let inputPromise: Promise<HandInput> | null = null;

export function startHandInput(): Promise<HandInput> {
  if (!inputPromise) {
    inputPromise = (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      const landmarker = await getHandLandmarker();

      const input: HandInput = { stream, latest: null, lastT: 0 };
      let lastVideoTime = -1;
      const loop = () => {
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const hand = readHand(landmarker.detectForVideo(video, performance.now()));
            if (hand) {
              input.latest = hand;
              input.lastT = performance.now();
            }
          } catch {
            /* a dropped frame is harmless */
          }
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      current = input;
      return input;
    })();
    // Let a later call retry if the camera was refused or unavailable.
    inputPromise.catch(() => {
      inputPromise = null;
    });
  }
  return inputPromise;
}

/** Synchronous read for render loops; null until the camera has started. */
export function latestHand(): { hand: HandState | null; lastT: number } {
  return current ? { hand: current.latest, lastT: current.lastT } : { hand: null, lastT: 0 };
}

export async function ensureHandInput(): Promise<MediaStream> {
  return (await startHandInput()).stream;
}

/** Screens call this when their buttons change, so a resting hand cannot press through. */
export function rearmPointer() {
  window.dispatchEvent(new Event("hand-pointer:rearm"));
}
