export type Continent =
  | 'Europe'
  | 'Asia'
  | 'Africa'
  | 'North America'
  | 'South America'
  | 'Oceania';

export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'expert';

/** One of the 8 fixed palette colors offered in every level. */
export type ColorId =
  | 'red' | 'blue' | 'green' | 'yellow'
  | 'black' | 'white' | 'orange' | 'brown';

export interface PaletteColor {
  id: ColorId;
  hex: string;
  label: string;
}

/** A single paintable (or pre-filled) area of a flag. */
export interface FlagRegion {
  /** Unique within the flag. */
  id: string;
  /** The correct paint color for this region. */
  colorId: ColorId;
  /** Polygon in flag-local viewBox coordinates, used both for SVG rendering and hit-testing. */
  points: [number, number][];
  /** If true, region is shown already filled and is not part of the puzzle. */
  prefilled?: boolean;
}

export interface FlagFacts {
  capital: string;
  population: string;
  language: string;
  independence: string;
  funFact: string;
}

export interface FlagDef {
  id: string;
  country: string;
  continent: Continent;
  difficulty: DifficultyTier;
  /** [width, height] of the flag's local coordinate space. */
  viewBox: [number, number];
  regions: FlagRegion[];
  /** Colors offered on the palette for this level (correct colors + distractors). */
  paletteColorIds: ColorId[];
  targetTimeSec: number;
  facts: FlagFacts;
}

export type RegionProgressState = 'empty' | 'filling' | 'complete' | 'error';

export interface RegionRuntimeState {
  state: RegionProgressState;
  progress: number; // 0..1
}

export type GameMode = 'world-tour' | 'practice' | 'endless';

export interface LevelResult {
  flagId: string;
  stars: 0 | 1 | 2 | 3;
  score: number;
  accuracy: number; // 0..1
  timeSec: number;
  mistakes: number;
  bestCombo: number;
  medal: 'none' | 'bronze' | 'silver' | 'gold' | 'perfect';
}

export interface SaveData {
  version: 1;
  unlockedContinents: Continent[];
  unlockedCountryIds: string[];
  starsByFlag: Record<string, 0 | 1 | 2 | 3>;
  bestScoreByFlag: Record<string, number>;
  bestTimeByFlag: Record<string, number>;
  totalStars: number;
  flagsCompleted: string[];
  perfectFlags: string[];
  achievements: string[];
  endlessBestScore: number;
}

export interface GestureSettings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  difficulty: DifficultyTier;
  dominantHand: 'right' | 'left';
  mirrorCamera: boolean;
  language: 'en';
  colorblindMode: boolean;
  highContrast: boolean;
  largerCursor: boolean;
  slowerPainting: boolean;
  audioNarration: boolean;
}

export interface HandFrame {
  detected: boolean;
  confidence: number;
  /** Mirror-corrected, smoothed cursor position in [0,1] screen space. */
  cursorX: number;
  cursorY: number;
  /** Raw index fingertip depth-ish signal (z), used for pinch/pointing intent, smaller = closer. */
  indexZ: number;
  /** True while the hand is basically an open flat palm (used for pause gesture). */
  isPalmOpen: boolean;
  /** True while the hand is a closed fist (used for reset/resume gesture). */
  isFist: boolean;
}
