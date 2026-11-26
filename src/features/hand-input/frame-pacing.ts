// Frame pacing for the hand tracker: decides which camera frames get an
// inference. Frame times come from the camera clock, so the spacing between
// frames of a steady camera is regular up to float rounding and capture jitter.

/**
 * Share of the frame interval a frame may arrive early and still be kept. A
 * strict "at least one full interval" test drops frames that arrive a fraction
 * early, so the gap doubles and a 30 fps camera is tracked at 15 to 30 fps.
 */
export const EARLY_FRAME_TOLERANCE = 0.25;

/**
 * Returns a function that takes a camera frame time in milliseconds and says
 * whether to run inference on it. A camera running at `maxFps` or slower keeps
 * every frame; one running at twice `maxFps` keeps every second frame.
 *
 * A gap of zero or less (a restarted stream, or a clock that does not advance)
 * is always accepted, so tracking can never stall.
 */
export function createFramePacer(maxFps: number): (frameTimeMs: number) => boolean {
  const minGapMs = (1000 / maxFps) * (1 - EARLY_FRAME_TOLERANCE);
  let lastAcceptedMs: number | null = null;

  return (frameTimeMs) => {
    if (lastAcceptedMs !== null) {
      const gap = frameTimeMs - lastAcceptedMs;
      if (gap > 0 && gap < minGapMs) return false;
    }
    lastAcceptedMs = frameTimeMs;
    return true;
  };
}
