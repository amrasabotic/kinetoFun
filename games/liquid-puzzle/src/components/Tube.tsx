import { AnimatePresence, motion } from 'framer-motion';
import { colorDef, colorSymbol } from '../utils/colors';
import { TUBE_CAPACITY } from '../types';

interface TubeProps {
  index: number;
  colors: number[]; // bottom-to-top
  isHovered: boolean;
  isGrabbed: boolean; // currently pinched — tilts slightly, as if lifted and ready to pour
  isHintSource: boolean;
  isHintTarget: boolean;
  isRejecting: boolean; // brief shake+red-glow when an illegal pour was attempted here
  colorblindMode: boolean;
  reducedMotion: boolean;
  tubeRef: (el: HTMLDivElement | null) => void;
}

export function Tube({
  index,
  colors,
  isHovered,
  isGrabbed,
  isHintSource,
  isHintTarget,
  isRejecting,
  colorblindMode,
  reducedMotion,
  tubeRef,
}: TubeProps) {
  const emptySlots = TUBE_CAPACITY - colors.length;

  return (
    <div
      ref={tubeRef}
      data-tube-index={index}
      className={[
        'lp-tube',
        isHovered && 'lp-tube--hovered',
        isGrabbed && 'lp-tube--grabbed',
        (isHintSource || isHintTarget) && 'lp-tube--hint',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <motion.div
        className="lp-tube__glass"
        animate={
          isRejecting && !reducedMotion
            ? { x: [0, -6, 6, -4, 4, 0], rotate: 0 }
            : { x: 0, rotate: isGrabbed && !reducedMotion ? -8 : 0, y: isGrabbed && !reducedMotion ? -10 : 0 }
        }
        transition={{ duration: isRejecting ? 0.4 : 0.2 }}
      >
        <div className="lp-tube__stack">
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} className="lp-tube__unit lp-tube__unit--empty" />
          ))}
          <AnimatePresence initial={false}>
            {colors.map((c, i) => (
              <motion.div
                key={`slot-${i}`}
                layout
                initial={{ opacity: 0, scaleY: 0.3 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0.3 }}
                transition={{ duration: reducedMotion ? 0.12 : 0.32, ease: 'easeOut' }}
                className="lp-tube__unit"
                style={{ background: `linear-gradient(180deg, ${colorDef(c).glow} 0%, ${colorDef(c).hex} 60%)` }}
              >
                {i === colors.length - 1 && <div className="lp-tube__surface" />}
                {colorblindMode && <span className="lp-tube__symbol">{colorSymbol(c)}</span>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="lp-tube__glass-highlight" />
        <div className="lp-tube__glass-rim" />
      </motion.div>
    </div>
  );
}
