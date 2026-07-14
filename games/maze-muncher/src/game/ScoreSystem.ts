export class ScoreSystem {
  score = 0;
  streak = 0;
  chainKillCount = 0;
  level = 1;
  highScore = 0;

  get comboMultiplier(): 1 | 2 | 3 | 5 {
    if (this.streak >= 30) return 5;
    if (this.streak >= 15) return 3;
    if (this.streak >= 5) return 2;
    return 1;
  }

  addPoints(base: number): void {
    this.streak++;
    this.score += base * this.comboMultiplier;
  }

  resetStreak(): void {
    this.streak = 0;
    this.chainKillCount = 0;
  }

  reset(level: number): void {
    this.score = 0;
    this.streak = 0;
    this.chainKillCount = 0;
    this.level = level;
  }
}
