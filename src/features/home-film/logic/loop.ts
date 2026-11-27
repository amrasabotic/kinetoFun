/** The longest step the clock takes in one frame, so a tab that was throttled resumes where it was. */
export const MAX_STEP = 0.1;

/** The film time `elapsed` seconds after `time`, wrapped into the loop. */
export const advanceLoop = (time: number, elapsed: number, length: number) => {
  const step = Math.min(Math.max(elapsed, 0), MAX_STEP);
  const next = (time + step) % length;
  return next < 0 ? next + length : next;
};

export type Size = { width: number; height: number };

/** Scale and offset that cover `box` with a stage of `stage` size, centred. */
export const fitStage = (box: Size, stage: Size) => {
  if (box.width <= 0 || box.height <= 0) return { scale: 0, left: 0, top: 0 };
  const scale = Math.max(box.width / stage.width, box.height / stage.height);
  return {
    scale,
    left: (box.width - stage.width * scale) / 2,
    top: (box.height - stage.height * scale) / 2,
  };
};

/**
 * Whether a frame should be drawn now. A screen that refreshes faster than
 * the target rate draws on a steady subset of its refreshes; the slack lets a
 * 60 Hz screen settle on every frame at 60 and every second frame at 30.
 */
export const shouldDraw = (now: number, lastDrawn: number, framesPerSecond: number) =>
  now - lastDrawn >= 1000 / framesPerSecond - 4;

/**
 * The frame rate to aim for, given the recent frame times in ms. Starts at
 * 60 and drops to 30 when most recent frames ran long, so a slow device
 * draws evenly instead of stuttering.
 */
export const pickFrameRate = (recentFrameMs: readonly number[]) => {
  if (recentFrameMs.length < 20) return 60;
  const long = recentFrameMs.filter((ms) => ms > 24).length;
  return long / recentFrameMs.length > 0.5 ? 30 : 60;
};
