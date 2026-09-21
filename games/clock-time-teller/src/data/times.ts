import type { TimeValue } from '../types';

const MINUTE_OPTIONS: Array<0 | 15 | 30 | 45> = [0, 15, 30, 45];
const EASY_MINUTE_OPTIONS: Array<0 | 15 | 30 | 45> = [0, 30];

export function minuteOptionsForRound(roundIndex: number): Array<0 | 15 | 30 | 45> {
  return roundIndex < 4 ? EASY_MINUTE_OPTIONS : MINUTE_OPTIONS;
}

export function formatDigital(time: TimeValue): string {
  const minuteStr = time.minute.toString().padStart(2, '0');
  return `${time.hour}:${minuteStr}`;
}

const NUMBER_WORDS = [
  'twelve', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

function hourWord(hour: number): string {
  return NUMBER_WORDS[hour] ?? String(hour);
}

/** Speaks a time using the vocabulary kids are taught: o'clock, quarter past, half past, quarter to. */
export function speakableTime(time: TimeValue): string {
  const { hour, minute } = time;
  if (minute === 0) return `${hourWord(hour)} o'clock`;
  if (minute === 15) return `quarter past ${hourWord(hour)}`;
  if (minute === 30) return `half past ${hourWord(hour)}`;
  // :45 -> quarter to the next hour
  const nextHour = hour === 12 ? 1 : hour + 1;
  return `quarter to ${hourWord(nextHour)}`;
}

function timesEqual(a: TimeValue, b: TimeValue): boolean {
  return a.hour === b.hour && a.minute === b.minute;
}

/** Two times are "meaningfully different" if the hour differs or the minutes are at least 15 apart. */
function isDistinctEnough(a: TimeValue, b: TimeValue): boolean {
  if (a.hour !== b.hour) return true;
  return Math.abs(a.minute - b.minute) >= 15;
}

export function randomTime(minuteOptions: Array<0 | 15 | 30 | 45>, exclude?: TimeValue): TimeValue {
  let candidate: TimeValue;
  let guard = 0;
  do {
    guard += 1;
    const hour = 1 + Math.floor(Math.random() * 12);
    const minute = minuteOptions[Math.floor(Math.random() * minuteOptions.length)];
    candidate = { hour, minute };
  } while (exclude && timesEqual(candidate, exclude) && guard < 50);
  return candidate;
}

/** Generates `count` distractor times, each meaningfully different from `target` and from each other. */
export function distinctDistractorTimes(target: TimeValue, count: number, minuteOptions: Array<0 | 15 | 30 | 45>): TimeValue[] {
  const results: TimeValue[] = [];
  let guard = 0;
  while (results.length < count && guard < 500) {
    guard += 1;
    const candidate = randomTime(minuteOptions);
    if (!isDistinctEnough(candidate, target)) continue;
    if (results.some((t) => !isDistinctEnough(candidate, t))) continue;
    results.push(candidate);
  }
  return results;
}
