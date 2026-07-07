import type { EnemyDef } from '../types';

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  grunt: { id: 'grunt', hp: 30, speed: 0.09, reward: 5, damageToBase: 1, color: '#4ade80', radius: 0.014 },
  runner: { id: 'runner', hp: 18, speed: 0.16, reward: 4, damageToBase: 1, color: '#facc15', radius: 0.012 },
  tank: { id: 'tank', hp: 90, speed: 0.05, reward: 12, damageToBase: 3, color: '#a855f7', radius: 0.02 },
};
