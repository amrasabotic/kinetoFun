import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import { useRaceStore } from '../../stores/raceStore';
import { COURSES } from '../../data/courses';

interface Props {
  onSelect: (courseId: string) => void;
  onBack: () => void;
}

export default function CourseSelect({ onSelect, onBack }: Props) {
  const unlockedCourses = useRaceStore((s) => s.unlockedCourses);
  const courseProgress = useRaceStore((s) => s.courseProgress);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex flex-col text-white p-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-5xl font-extrabold tracking-tight mb-2">Course Select</h1>
        <p className="text-white/50">Pick a track to race</p>
      </motion.div>

      <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-max overflow-y-auto px-4 mb-6">
        {COURSES.map((course) => {
          const isUnlocked = unlockedCourses.includes(course.id);
          const progress = courseProgress[course.id];
          const stars = progress?.stars ?? 0;

          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <HoverButton
                onActivate={() => isUnlocked && onSelect(course.id)}
                ringColor={isUnlocked ? '#00D4FF' : '#666'}
                className={`flex flex-col items-start justify-between w-full h-32 rounded-lg p-4 border transition-all ${
                  isUnlocked
                    ? 'bg-white/10 border-white/20'
                    : 'bg-black/30 border-white/10 opacity-50 cursor-not-allowed'
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-white/90">{course.name}</p>
                  <p className="text-xs text-white/50">{course.lapCount} laps</p>
                </div>
                <div className="text-lg">{'⭐'.repeat(stars)}</div>
              </HoverButton>
            </motion.div>
          );
        })}
      </div>

      <HoverButton
        onActivate={onBack}
        ringColor="#FF6B6B"
        className="px-6 py-3 rounded-full bg-black/30 border border-white/15 text-sm font-semibold"
      >
        Back to Menu
      </HoverButton>
    </div>
  );
}
