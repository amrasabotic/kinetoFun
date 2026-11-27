/** Formatting helpers shared across pages. */

import { DEFAULT_LOCALE, INTL_LOCALE, getMessages, type Locale } from "@/lib/i18n";
import type { GamePlayers } from "@/types";

export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return value.toLocaleString(INTL_LOCALE[locale]);
}

export function formatScore(score: number, locale: Locale = DEFAULT_LOCALE): string {
  return formatNumber(score, locale);
}

export function formatDate(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  return new Date(iso).toLocaleDateString(INTL_LOCALE[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  return new Date(iso).toLocaleString(INTL_LOCALE[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const t = getMessages(locale).common.time;
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return t.minutesAgo(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t.hoursAgo(hours);
  const days = Math.round(hours / 24);
  if (days < 30) return t.daysAgo(days);
  return formatDate(iso, locale);
}

export function playersLabel(players: GamePlayers, locale: Locale = DEFAULT_LOCALE): string {
  return getMessages(locale).common.players[players];
}

/** Category names come from the database, so unknown ones are shown as stored. */
export function categoryLabel(category: string, locale: Locale = DEFAULT_LOCALE): string {
  return getMessages(locale).common.categories[category] ?? category;
}
