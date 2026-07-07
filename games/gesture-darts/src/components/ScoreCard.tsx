import type { GameMode } from '../types';
import type { PlayerState, TurnPhase } from '../systems/matchEngine';
import { CRICKET_NUMBERS } from '../systems/cricketEngine';

interface ScoreCardProps {
  mode: GameMode;
  you: PlayerState;
  cpu: PlayerState;
  phase: TurnPhase;
}

function MarkPips({ count }: { count: number }) {
  return (
    <div className="gdt-pips">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`gdt-pip ${i < count ? 'gdt-pip--filled' : ''}`} />
      ))}
    </div>
  );
}

export function ScoreCard({ mode, you, cpu, phase }: ScoreCardProps) {
  if (mode === 'cricket') {
    return (
      <div className="gdt-scorecard gdt-scorecard--cricket">
        <div className="gdt-scorecard__row gdt-scorecard__row--head">
          <span>You</span>
          <span>#</span>
          <span>CPU</span>
        </div>
        {CRICKET_NUMBERS.map((n) => (
          <div key={n} className="gdt-scorecard__row">
            <MarkPips count={you.marks[n]} />
            <span className="gdt-scorecard__num">{n === 25 ? 'Bull' : n}</span>
            <MarkPips count={cpu.marks[n]} />
          </div>
        ))}
        <div className="gdt-scorecard__row gdt-scorecard__row--total">
          <span>{you.score}</span>
          <span>Pts</span>
          <span>{cpu.score}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gdt-scorecard gdt-scorecard--x01">
      <div className={`gdt-scorecard__player ${phase === 'PLAYER_TURN' ? 'gdt-scorecard__player--active' : ''}`}>
        <span className="gdt-scorecard__label">You</span>
        <span className="gdt-scorecard__value">{you.score}</span>
      </div>
      <div className={`gdt-scorecard__player ${phase === 'CPU_TURN' ? 'gdt-scorecard__player--active' : ''}`}>
        <span className="gdt-scorecard__label">CPU</span>
        <span className="gdt-scorecard__value">{cpu.score}</span>
      </div>
    </div>
  );
}
