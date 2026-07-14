import type Matter from 'matter-js';

// Vehicle skin cosmetics
export interface VehicleSkin {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  bodyColor: string;
  cabinColor: string;
  wheelColor: string;
  rimColor: string;
  accentColor: string;
  exhaustColor: string;
  description: string;
}

export interface GestureSettings {
  musicVolume: number;
  sfxVolume: number;
  mirrorCamera: boolean;
  colorblindMode: boolean;
  highContrast: boolean;
  largerCursor: boolean;
  slowerPace: boolean;
  audioNarration: boolean;
}

export interface HandFrame {
  detected: boolean;
  confidence: number;
  cursorX: number;
  cursorY: number;
  indexZ: number;
  isPalmOpen: boolean;
  isFist: boolean;
  isPinching: boolean;
}

// Vehicle physics
export interface Vehicle {
  chassis: Matter.Body;
  frontWheel: Matter.Body;
  rearWheel: Matter.Body;
  frontSuspension: Matter.Constraint;
  rearSuspension: Matter.Constraint;
  frontAntiSway: Matter.Constraint;
  rearAntiSway: Matter.Constraint;
}

// Race progress/save data
export interface RaceProgress {
  courseId: string;
  position: number;
  lapCount: number;
  lapTime: number;
  bestLapTime: number;
  finishTime: number | null;
  coins: number;
}

export interface CircuitRacerSaveData {
  version: number;
  totalCoinsEarned: number; // lifetime, monotonic — submitted as score
  unlockedCourses: string[];
  courseProgress: Record<string, { stars: number; bestTime: number }>;
  achievements: string[];
}

export interface CourseDef {
  id: string;
  name: string;
  environment: string;
  lapCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  aiSpeedMultiplier: number;
  star2Position: number;
  star3Position: number;
}

// Race state during gameplay
export interface RaceState {
  courseId: string;
  mode: 'quick' | 'championship' | 'time-trial';
  playerPosition: number;
  playerLapCount: number;
  playerLapTime: number;
  playerBestLapTime: number;
  aiPositions: number[];
  aiLapCounts: number[];
  raceTime: number;
  finished: boolean;
  finalPosition: number;
  coinsEarned: number;
  starsEarned: number;
}
