import HoverButton from '../common/HoverButton';
import type { GameMode } from '../../types';

interface HUDProps {
  mode: GameMode;
  waveLabel: string;
  currency: number;
  baseHealth: number;
  maxBaseHealth: number;
  waveActive: boolean;
  onStartWave: () => void;
  onPause: () => void;
  trackingLabel: string;
}

export function HUD({ mode, waveLabel, currency, baseHealth, maxBaseHealth, waveActive, onStartWave, onPause, trackingLabel }: HUDProps) {
  const healthPct = Math.max(0, baseHealth / maxBaseHealth);
  return (
    <div className="td-hud">
      <div className="td-hud__left">
        <span className="td-hud__badge">{mode.toUpperCase()}</span>
        <span className="td-hud__wave">{waveLabel}</span>
      </div>
      <div className="td-hud__center">
        <span className="td-hud__currency">${currency}</span>
        <div className="td-hud__health-track">
          <div className="td-hud__health-fill" style={{ width: `${healthPct * 100}%` }} />
        </div>
        <span className="td-hud__health-label">{Math.max(0, Math.round(baseHealth))} HP</span>
      </div>
      <div className="td-hud__right">
        <span className="td-hud__tracking">{trackingLabel}</span>
        {!waveActive && (
          <HoverButton onActivate={onStartWave} dwellMs={500} ringColor="#4ADE80" className="td-hud-btn td-hud-btn--primary">
            Start Wave
          </HoverButton>
        )}
        <HoverButton onActivate={onPause} dwellMs={600} ringColor="#94A3B8" className="td-hud-btn">
          Pause
        </HoverButton>
      </div>
    </div>
  );
}
