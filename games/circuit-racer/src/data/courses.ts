import type { CourseDef } from '../types';

export const COURSES: CourseDef[] = [
  {
    id: 'c1',
    name: 'Sunny Speedway',
    environment: 'grassland',
    lapCount: 3,
    difficulty: 'easy',
    aiSpeedMultiplier: 0.8,
    star2Position: 2,
    star3Position: 1,
  },
  {
    id: 'c2',
    name: 'Desert Dunes',
    environment: 'desert',
    lapCount: 3,
    difficulty: 'easy',
    aiSpeedMultiplier: 0.85,
    star2Position: 2,
    star3Position: 1,
  },
  {
    id: 'c3',
    name: 'Mountain Pass',
    environment: 'mountain',
    lapCount: 4,
    difficulty: 'medium',
    aiSpeedMultiplier: 1.0,
    star2Position: 2,
    star3Position: 1,
  },
  {
    id: 'c4',
    name: 'Frozen Plateau',
    environment: 'snow',
    lapCount: 4,
    difficulty: 'medium',
    aiSpeedMultiplier: 1.0,
    star2Position: 2,
    star3Position: 1,
  },
  {
    id: 'c5',
    name: 'Volcano Circuit',
    environment: 'volcano',
    lapCount: 5,
    difficulty: 'hard',
    aiSpeedMultiplier: 1.2,
    star2Position: 2,
    star3Position: 1,
  },
  {
    id: 'c6',
    name: 'Night Track',
    environment: 'night',
    lapCount: 5,
    difficulty: 'hard',
    aiSpeedMultiplier: 1.2,
    star2Position: 2,
    star3Position: 1,
  },
];

export function courseById(id: string): CourseDef | undefined {
  return COURSES.find((c) => c.id === id);
}
