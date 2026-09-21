import type { TowerTypeId } from '../../types';
import { TOWER_DEFS, TOWER_ORDER } from '../../data/towers';

interface BuildTrayProps {
  currency: number;
  trayRef: (typeId: TowerTypeId, el: HTMLDivElement | null) => void;
  trashRef: (el: HTMLDivElement | null) => void;
  draggingFromTray: TowerTypeId | null;
}

/** The tower palette — each tile is itself the pinch-drag grabbable, and the trash icon is the sell dropzone for a currently-held placed tower. */
export function BuildTray({ currency, trayRef, trashRef, draggingFromTray }: BuildTrayProps) {
  return (
    <div className="td-tray">
      <span className="td-tray__label">Towers</span>
      <div className="td-tray__tiles">
        {TOWER_ORDER.map((typeId) => {
          const def = TOWER_DEFS[typeId];
          const affordable = currency >= def.cost;
          return (
            <div
              key={typeId}
              ref={(el) => trayRef(typeId, el)}
              className={`td-tray__tile ${!affordable ? 'td-tray__tile--disabled' : ''} ${draggingFromTray === typeId ? 'td-tray__tile--dragging' : ''}`}
            >
              <div className="td-tray__swatch" style={{ background: def.color }} />
              <span className="td-tray__name">{def.name}</span>
              <span className="td-tray__cost">{def.cost}</span>
            </div>
          );
        })}
      </div>
      <div ref={trashRef} className="td-tray__trash">
        Sell
      </div>
    </div>
  );
}
