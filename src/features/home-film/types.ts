/** Every animatable part of the mascot. All values are plain numbers so a pose is a pure function of time. */
export interface MascotPose {
  /** Hand rotation around the wrist, in degrees. */
  wave: number;
  /** 0 = left eye open, 1 = the logo's wink. */
  wink: number;
  /** 0 = right eye open, 1 = closed. */
  blink: number;
  /** 0 = mouth nearly closed, 1 = the logo's open smile. */
  mouth: number;
  /** Antenna tilt around its base, in degrees. */
  antenna: number;
  /** Opacity of the inner signal arc, 0 to 1. */
  signalNear: number;
  /** Opacity of the outer signal arc, 0 to 1. */
  signalFar: number;
  /** Vertical offset of the whole TV, in logo pixels (negative is up). */
  bounce: number;
  /** -1 stretch to 1 squash, applied from the base. */
  squash: number;
  /** Tilt of the whole mascot around the middle of its base, in degrees. */
  lean: number;
  /** Opacity of the stars, dots and orbit swooshes around the TV. */
  decor: number;
  /**
   * How far each foot sits below its resting place, in logo pixels: a
   * planted foot reaches down while the body bobs up, a stepping foot tucks
   * up behind the body (negative).
   */
  footLeft: number;
  footRight: number;
  /** 0 = no second hand, 1 = a mirror of the logo hand out of the right side. */
  hand2: number;
  /** Second hand rotation around its wrist, in degrees, mirrored like the hand. */
  wave2: number;
  /** Where the eyes look, in logo pixels from straight ahead. */
  lookX: number;
  lookY: number;
}

export type SceneName = "hello" | "tv" | "dive" | "pop" | "slice" | "catch" | "learn" | "library" | "rewards" | "bye";

/** The scenes inside the TV where the mascot shows one thing the product does. */
export type StopName = "pop" | "slice" | "catch" | "learn" | "library" | "rewards";

/** Every set of words in the film. */
export type LineKey = "hello" | "camera" | StopName | "bye";

export type FormatKey = "desktop" | "phone";

export type Point = { x: number; y: number };

export type Rect = { x: number; y: number; width: number; height: number };

/** Where the camera looks in the room: the room point at the stage centre, and the zoom. */
export type CameraShot = { x: number; y: number; scale: number };

/** Where the mascot stands, in screen units: the centre of its base, and the width of its frame. */
export type Spot = Point & { width: number };

/** The hand cursor on the TV screen: where it is, how visible (0 to 1), how full its ring is, and how far it swells as it selects. */
export type CursorState = { point: Point; shown: number; fill: number; swell: number };

/** A burst of confetti on the TV screen, `amount` from 0 (just fired) to 1 (gone). */
export type BurstState = { at: Point; amount: number };

/** A box of words on the stage, in stage px. */
export type TextBox = Rect & { align: "left" | "center"; maxSize: number };

/**
 * The part of the TV screen the stops play in, in screen units: clear of
 * the words on every format. `ground` is where the mascot's base rests and
 * `mascot` the width of its frame there.
 */
export type PlayBox = Rect & { ground: number; mascot: number };

/** A stage format: its size and where each scene places its parts on it. */
export interface FilmFormat {
  key: FormatKey;
  width: number;
  height: number;
  /** The camera inside the TV screen. */
  screenShot: CameraShot;
  /** The camera pulled back to show the room. */
  roomShot: CameraShot;
  /** Where the mascot stands on the TV screen when it says hello and goodbye. */
  helloMascot: Spot;
  /** The box the lines inside the TV sit in. */
  helloText: TextBox;
  /** The box the caption in the room sits in. */
  captionText: TextBox;
  playBox: PlayBox;
}

/** The film's words in one language: each set is a list of lines, the last one set in blue. */
export interface FilmCopy {
  lines: Record<LineKey, readonly string[]>;
  /** What the film shows, for screen readers. */
  description: string;
}
