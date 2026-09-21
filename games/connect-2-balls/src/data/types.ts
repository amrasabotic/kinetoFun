export interface Position {
  row: number;
  col: number;
}

export interface Ball {
  position: Position;
  color: string;
  pairId: number;
  type?: 'normal' | 'rainbow' | 'bomb' | 'frozen' | 'locked' | 'electric' | 'magnetic';
}

export interface LevelData {
  id: number;
  gridSize: number;
  pairs: Array<{ color: string; positions: [Position, Position] }>;
  walls?: Position[];
  bridges?: Position[];
  portals?: Array<{ from: Position; to: Position }>;
  crackedTiles?: Position[];
  oneWayCells?: Array<{ position: Position; direction: 'up' | 'down' | 'left' | 'right' }>;
}

export interface PathSegment {
  pairId: number;
  color: string;
  cells: Position[];
  completed: boolean;
}

export interface GameState {
  currentLevel: number;
  paths: PathSegment[];
  activePath: PathSegment | null;
  isDrawing: boolean;
  mistakes: number;
  startTime: number;
  hintsUsed: number;
  combo: number;
}

export interface PlayerProgress {
  currentLevel: number;
  completedLevels: Record<number, { stars: number; bestTime: number; score: number }>;
  totalStars: number;
  hints: number;
  achievements: string[];
  unlockedThemes: string[];
  unlockedCursors: string[];
  unlockedPaths: string[];
  selectedTheme: string;
  selectedCursor: string;
  selectedPath: string;
  combo: number;
  dailyChallengeHistory: Record<string, { completed: boolean; stars: number }>;
}

export interface GameSettings {
  sensitivity: number;
  leftHanded: boolean;
  largeCursor: boolean;
  colorblindMode: boolean;
  highContrast: boolean;
  reducedParticles: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
}

export interface Theme {
  id: string;
  name: string;
  background: string;
  gridColor: string;
  cellColor: string;
  cellBorder: string;
  textColor: string;
  accentColor: string;
  particleColors: string[];
  unlockLevel: number;
}

export type GameMode = 'campaign' | 'endless' | 'timeAttack' | 'zen' | 'daily';

export type GameScreen = 'menu' | 'levelSelect' | 'game' | 'settings' | 'tutorial' | 'achievements' | 'shop';
