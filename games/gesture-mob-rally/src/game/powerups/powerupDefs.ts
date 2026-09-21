import type { PowerUpDef } from '../../types';

export const POWERUP_DEFS: Record<string, PowerUpDef> = {
  shield: { id: 'shield', kind: 'shield', label: 'Shield', durationMs: 8000, color: '#38BDF8' },
  speed: { id: 'speed', kind: 'speed', label: 'Speed Boost', durationMs: 6000, color: '#4ADE80' },
  magnet: { id: 'magnet', kind: 'magnet', label: 'Magnet', durationMs: 8000, color: '#F472B6' },
  freeze: { id: 'freeze', kind: 'freeze', label: 'Slow-Mo', durationMs: 5000, color: '#A5F3FC' },
  megaCrowd: { id: 'megaCrowd', kind: 'megaCrowd', label: 'Mega Crowd', durationMs: 0, color: '#FACC15', instant: true },
  doubleCoins: { id: 'doubleCoins', kind: 'doubleCoins', label: 'Double Coins', durationMs: 10000, color: '#FDE047' },
  invincibility: { id: 'invincibility', kind: 'invincibility', label: 'Invincibility', durationMs: 5000, color: '#F87171' },
};

export function randomPowerUpId(): string {
  const keys = Object.keys(POWERUP_DEFS);
  return keys[Math.floor(Math.random() * keys.length)];
}
