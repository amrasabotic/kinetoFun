/**
 * Tiny className combiner. Filters out falsy values so we can write
 * conditional classes inline without pulling in a dependency.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
