export interface Coin {
  value: number; // cents
  label: string;
  color: string;
  size: 'small' | 'medium' | 'large';
}

export const COINS: Coin[] = [
  { value: 1, label: 'Penny', color: '#B87333', size: 'small' },
  { value: 5, label: 'Nickel', color: '#C0C0C0', size: 'medium' },
  { value: 10, label: 'Dime', color: '#C0C0C0', size: 'medium' },
  { value: 25, label: 'Quarter', color: '#FFD700', size: 'large' },
];

const NUMBER_WORDS = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS_WORDS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberToWords(n: number): string {
  if (n < 20) return NUMBER_WORDS[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? TENS_WORDS[tens] : `${TENS_WORDS[tens]}-${NUMBER_WORDS[ones]}`;
}

export function formatAmount(cents: number): string {
  return `${cents}¢`;
}

export function speakableAmount(cents: number): string {
  if (cents < 100) {
    return `${numberToWords(cents)} cents`;
  }
  return `$${(cents / 100).toFixed(2)}`;
}

export function breakIntoCoins(cents: number): Array<{ value: number; count: number }> {
  const result: Array<{ value: number; count: number }> = [];
  let remaining = cents;

  for (const coin of COINS.sort((a, b) => b.value - a.value)) {
    if (remaining >= coin.value) {
      const count = Math.floor(remaining / coin.value);
      result.push({ value: coin.value, count });
      remaining -= count * coin.value;
    }
  }

  return result;
}

/** Returns amounts reachable with minCoins to maxCoins coins, optionally excluding a value. */
export function randomAmount(minCoins: number, maxCoins: number, exclude?: number): number {
  let candidate: number;
  let guard = 0;
  do {
    guard += 1;
    // Generate a random amount in range 1-99¢
    candidate = 1 + Math.floor(Math.random() * 99);
    // Check if it falls within the coin-count range
    const breakdown = breakIntoCoins(candidate);
    const coinCount = breakdown.reduce((s, c) => s + c.count, 0);
    if (coinCount < minCoins || coinCount > maxCoins) continue;
    if (exclude !== undefined && candidate === exclude) continue;
    break;
  } while (guard < 100);

  return candidate;
}

/** Generates `count` distractor amounts, each at least 5¢ apart from `target` and from each other. */
export function distinctDistractorAmounts(target: number, count: number, minCoins: number, maxCoins: number): number[] {
  const results: number[] = [];
  let guard = 0;

  while (results.length < count && guard < 500) {
    guard += 1;
    const candidate = randomAmount(minCoins, maxCoins);
    if (Math.abs(candidate - target) < 5) continue;
    if (results.some((a) => Math.abs(candidate - a) < 5)) continue;
    results.push(candidate);
  }

  return results;
}
