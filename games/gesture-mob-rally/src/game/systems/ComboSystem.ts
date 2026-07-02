import { COMBO_MAX_MULTIPLIER } from '../../constants/gameConfig';

export interface ComboState {
  combo: number;
  best: number;
}

export function createComboState(): ComboState {
  return { combo: 0, best: 0 };
}

export function increment(state: ComboState, amount = 1): void {
  state.combo += amount;
  if (state.combo > state.best) state.best = state.combo;
}

export function reset(state: ComboState): void {
  state.combo = 0;
}

export function multiplierFor(combo: number): number {
  return 1 + Math.min(COMBO_MAX_MULTIPLIER - 1, Math.floor(combo / 5));
}
