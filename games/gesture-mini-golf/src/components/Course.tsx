import type { HoleDef, SwingSnapshot } from '../types';

interface CourseProps {
  hole: HoleDef;
  swing: SwingSnapshot;
}

const OBSTACLE_CLASS: Record<string, string> = {
  wall: 'gmg-obstacle--wall',
  sand: 'gmg-obstacle--sand',
  water: 'gmg-obstacle--water',
  slope: 'gmg-obstacle--slope',
};

export function Course({ hole, swing }: CourseProps) {
  const showAimLine = swing.state === 'READY' || swing.state === 'CHARGING';

  return (
    <div className="gmg-course-wrap">
      <div className="gmg-course">
        {hole.obstacles.map((o, i) => (
          <div
            key={i}
            className={`gmg-obstacle ${OBSTACLE_CLASS[o.kind]}`}
            style={{ left: `${o.x * 100}%`, top: `${o.y * 100}%`, width: `${o.w * 100}%`, height: `${o.h * 100}%` }}
          />
        ))}

        <div className="gmg-tee" style={{ left: `${hole.tee.x * 100}%`, top: `${hole.tee.y * 100}%` }} />
        <div
          className="gmg-cup"
          style={{
            left: `${hole.cup.x * 100}%`,
            top: `${hole.cup.y * 100}%`,
            width: `${hole.cupRadius * 200}%`,
            height: `${hole.cupRadius * 200}%`,
          }}
        />

        {showAimLine && (
          <svg className="gmg-aim-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line
              x1={swing.ballPosition.x * 100}
              y1={swing.ballPosition.y * 100}
              x2={swing.aimTarget.x * 100}
              y2={swing.aimTarget.y * 100}
              className="gmg-aim-line"
            />
          </svg>
        )}

        <div className="gmg-ball" style={{ left: `${swing.ballPosition.x * 100}%`, top: `${swing.ballPosition.y * 100}%` }} />
      </div>
    </div>
  );
}
