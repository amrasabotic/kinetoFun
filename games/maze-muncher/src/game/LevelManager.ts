import type { EnemyKind } from '../types/GameTypes';
import { MAZE_SEEDS, type MazeSeedConfig } from './MazeGenerator';

export interface LevelConfig {
  level: number;
  mazeConfig: MazeSeedConfig;
  enemyKinds: EnemyKind[];
  enemySpeed: number;
  playerSpeed: number;
  frightenedDurationMs: number;
  label: string;
}

export const PLAYER_BASE_SPEED = 3.4; // tiles/second

/** Enemy roster grows through levels 1-3, then holds at 4 while speed/aggression ramp. */
const ROSTER_ORDER: EnemyKind[] = ['patroller', 'chaser', 'ambusher', 'hunter'];

export function getLevelConfig(level: number): LevelConfig {
  const mazeIndex = (level - 1) % MAZE_SEEDS.length;
  const difficultyTier = Math.floor((level - 1) / MAZE_SEEDS.length);
  const mazeConfig = MAZE_SEEDS[mazeIndex];

  const enemyCount = Math.min(2 + Math.max(0, level - 1), 4);
  const enemyKinds = ROSTER_ORDER.slice(0, enemyCount);

  const enemySpeed = Math.min(1.55 + level * 0.11 + difficultyTier * 0.35, 3.6);
  const frightenedDurationMs = Math.max(3000, 8000 - (level - 1) * 300);

  return {
    level,
    mazeConfig,
    enemyKinds,
    enemySpeed,
    playerSpeed: PLAYER_BASE_SPEED,
    frightenedDurationMs,
    label: mazeConfig.label,
  };
}
