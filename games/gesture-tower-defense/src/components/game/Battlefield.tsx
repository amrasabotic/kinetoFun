import type { BattleState, MapDef } from '../../types';
import { TOWER_DEFS } from '../../data/towers';
import { ENEMY_DEFS } from '../../data/enemies';
import { preparePath, pointAtProgress } from '../../systems/pathing';
import { useMemo } from 'react';

interface BattlefieldProps {
  map: MapDef;
  battle: BattleState;
  hoveredSlot: number | null;
  slotRef: (index: number, el: HTMLDivElement | null) => void;
}

/**
 * Renders the path, build slots (towers or empty markers, doubling as the
 * pinch-drag grab/drop targets — no separate invisible hit-test overlay is
 * needed since the tower's own visual div is the grabbable rect), enemies,
 * and in-flight projectiles. Kept DOM-based (an SVG path plus absolutely-
 * positioned divs) rather than a canvas, matching this catalog's default
 * for entity counts in the tens rather than the thousands (contrast Snake
 * Arena's canvas-based particle pool for a very different scale).
 */
export function Battlefield({ map, battle, hoveredSlot, slotRef }: BattlefieldProps) {
  const prepared = useMemo(() => preparePath(map.path), [map]);
  const pathD = useMemo(
    () => map.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 100} ${p.y * 100}`).join(' '),
    [map],
  );

  return (
    <div className="td-battlefield">
      <svg className="td-battlefield__path" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={pathD} />
      </svg>

      {map.buildSlots.map((slot, i) => {
        const tower = battle.towers.find((t) => t.slotIndex === i);
        const def = tower ? TOWER_DEFS[tower.typeId] : null;
        return (
          <div
            key={i}
            ref={(el) => slotRef(i, el)}
            className={`td-slot ${tower ? 'td-slot--occupied' : 'td-slot--empty'} ${hoveredSlot === i ? 'td-slot--hovered' : ''}`}
            style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
          >
            {def && (
              <>
                <div className="td-slot__range" style={{ width: `${def.range * 200}%`, height: `${def.range * 200}%` }} />
                <div className="td-tower" style={{ background: def.color }} />
              </>
            )}
          </div>
        );
      })}

      {battle.enemies.map((enemy) => {
        const pos = pointAtProgress(prepared, enemy.progress);
        const pct = enemy.hp / enemy.maxHp;
        const def = ENEMY_DEFS[enemy.defId];
        const slowed = battle.simTimeMs < enemy.slowUntilMs;
        return (
          <div
            key={enemy.id}
            className={`td-enemy ${slowed ? 'td-enemy--slowed' : ''}`}
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
          >
            <div className="td-enemy__body" style={{ background: def.color, width: `${def.radius * 300}%`, height: `${def.radius * 300}%` }} />
            <div className="td-enemy__hpbar">
              <div className="td-enemy__hpfill" style={{ width: `${pct * 100}%` }} />
            </div>
          </div>
        );
      })}

      {battle.projectiles.map((proj) => (
        <div key={proj.id} className="td-projectile" style={{ left: `${proj.x * 100}%`, top: `${proj.y * 100}%`, background: proj.color }} />
      ))}
    </div>
  );
}
