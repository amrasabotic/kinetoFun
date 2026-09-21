export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (progress: { completedLevels: number; perfectLevels: number; totalStars: number; hintsUsed: boolean; speed: boolean }) => boolean;
}

export const achievements: Achievement[] = [
  {
    id: 'first_connection',
    name: 'First Connection',
    description: 'Complete your first level',
    icon: 'Zap',
    condition: (p) => p.completedLevels >= 1,
  },
  {
    id: 'ten_levels',
    name: 'Getting Started',
    description: 'Complete 10 levels',
    icon: 'Star',
    condition: (p) => p.completedLevels >= 10,
  },
  {
    id: 'fifty_levels',
    name: 'Puzzle Enthusiast',
    description: 'Complete 50 levels',
    icon: 'Trophy',
    condition: (p) => p.completedLevels >= 50,
  },
  {
    id: 'perfect_ten',
    name: 'Perfect Ten',
    description: 'Get 3 stars on 10 levels',
    icon: 'Crown',
    condition: (p) => p.perfectLevels >= 10,
  },
  {
    id: 'speed_solver',
    name: 'Speed Solver',
    description: 'Complete a level in under 10 seconds',
    icon: 'Timer',
    condition: (p) => p.speed,
  },
  {
    id: 'hint_free',
    name: 'No Help Needed',
    description: 'Complete 5 levels without hints',
    icon: 'Brain',
    condition: (p) => !p.hintsUsed && p.completedLevels >= 5,
  },
  {
    id: 'star_collector',
    name: 'Star Collector',
    description: 'Earn 30 total stars',
    icon: 'Stars',
    condition: (p) => p.totalStars >= 30,
  },
  {
    id: 'master_connector',
    name: 'Master Connector',
    description: 'Complete all available levels',
    icon: 'Award',
    condition: (p) => p.completedLevels >= 15,
  },
];
