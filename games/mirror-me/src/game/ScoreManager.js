import { GAME_CONFIG } from './constants.js';

const LS_KEYS = {
  highScore:   'mirrorMe_highScore',
  bestStreak:  'mirrorMe_bestStreak',
  gamesPlayed: 'mirrorMe_gamesPlayed',
  avgAccuracy: 'mirrorMe_avgAccuracy',
};

export class ScoreManager {
  constructor() {
    this.reset();
    this.records = this._loadRecords();
  }

  reset() {
    this.totalScore    = 0;
    this.combo         = 0;
    this.bestStreak    = 0;
    this.poseScores    = [];
    this.accuracies    = [];
  }

  // Called after each pose with accuracy (0-100) and elapsed time (ms) vs allowed time (ms)
  addPoseResult(accuracy, elapsedMs, allowedMs) {
    const speedRatio   = Math.max(0, 1 - elapsedMs / allowedMs);
    const speedBonus   = 1 + speedRatio * (GAME_CONFIG.SPEED_BONUS_MAX - 1);
    const comboIdx     = Math.min(this.combo, GAME_CONFIG.COMBO_MULTIPLIERS.length - 1);
    const comboMult    = GAME_CONFIG.COMBO_MULTIPLIERS[comboIdx];
    const baseScore    = GAME_CONFIG.SCORE_BASE * (accuracy / 100);
    const finalScore   = Math.round(baseScore * speedBonus * comboMult);

    if (accuracy >= GAME_CONFIG.ACCURACY_THRESHOLDS.GOOD) {
      this.combo++;
      if (this.combo > this.bestStreak) this.bestStreak = this.combo;
    } else {
      this.combo = 0;
    }

    this.totalScore += finalScore;
    this.accuracies.push(accuracy);
    this.poseScores.push(finalScore);

    return { finalScore, speedBonus, comboMult };
  }

  get avgAccuracy() {
    if (!this.accuracies.length) return 0;
    return Math.round(this.accuracies.reduce((s, v) => s + v, 0) / this.accuracies.length);
  }

  get comboMultiplier() {
    const idx = Math.min(this.combo, GAME_CONFIG.COMBO_MULTIPLIERS.length - 1);
    return GAME_CONFIG.COMBO_MULTIPLIERS[idx];
  }

  saveGame() {
    const records = this.records;
    if (this.totalScore > records.highScore) records.highScore = this.totalScore;
    if (this.bestStreak > records.bestStreak) records.bestStreak = this.bestStreak;
    records.gamesPlayed++;

    // Rolling average of accuracy
    const prev = records.avgAccuracy;
    const n    = records.gamesPlayed;
    records.avgAccuracy = Math.round((prev * (n - 1) + this.avgAccuracy) / n);

    this._saveRecords(records);
    this.records = records;
  }

  _loadRecords() {
    return {
      highScore:   parseInt(localStorage.getItem(LS_KEYS.highScore)   ?? '0'),
      bestStreak:  parseInt(localStorage.getItem(LS_KEYS.bestStreak)  ?? '0'),
      gamesPlayed: parseInt(localStorage.getItem(LS_KEYS.gamesPlayed) ?? '0'),
      avgAccuracy: parseInt(localStorage.getItem(LS_KEYS.avgAccuracy) ?? '0'),
    };
  }

  _saveRecords(r) {
    localStorage.setItem(LS_KEYS.highScore,   r.highScore);
    localStorage.setItem(LS_KEYS.bestStreak,  r.bestStreak);
    localStorage.setItem(LS_KEYS.gamesPlayed, r.gamesPlayed);
    localStorage.setItem(LS_KEYS.avgAccuracy, r.avgAccuracy);
  }
}
