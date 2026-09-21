import {
  SCORE_PER_ENEMY_DEFEATED, SCORE_PER_BOSS_DEFEAT, SCORE_PER_LEVEL_COMPLETE,
  SCORE_NO_DAMAGE_BONUS, SCORE_PERFECT_LEVEL_BONUS,
} from '../../constants/gameConfig';

export interface ScoreBreakdown {
  score: number;
  coins: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  levelsCompleted: number;
  tookDamageThisLevel: boolean;
}

export function createScoreBreakdown(): ScoreBreakdown {
  return { score: 0, coins: 0, enemiesDefeated: 0, bossesDefeated: 0, levelsCompleted: 0, tookDamageThisLevel: false };
}

export function addEnemyKill(sb: ScoreBreakdown, comboMultiplier: number): void {
  sb.score += Math.round(SCORE_PER_ENEMY_DEFEATED * comboMultiplier);
  sb.enemiesDefeated++;
}

export function addBossDefeat(sb: ScoreBreakdown): void {
  sb.score += SCORE_PER_BOSS_DEFEAT;
  sb.bossesDefeated++;
}

export function addLevelComplete(sb: ScoreBreakdown, comboMultiplier: number): void {
  sb.score += SCORE_PER_LEVEL_COMPLETE;
  sb.levelsCompleted++;
  if (!sb.tookDamageThisLevel) sb.score += SCORE_NO_DAMAGE_BONUS;
  sb.score += Math.round(SCORE_PERFECT_LEVEL_BONUS * (comboMultiplier / 2));
  sb.tookDamageThisLevel = false;
}

export function addGateGrowth(sb: ScoreBreakdown, unitsGained: number, comboMultiplier: number): void {
  sb.score += Math.round(Math.max(0, unitsGained) * 1.5 * comboMultiplier);
}

export function addCoins(sb: ScoreBreakdown, amount: number): void {
  sb.coins += amount;
}
