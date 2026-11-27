"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  getMessages,
  translateServerMessage,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import {
  categoryLabel,
  formatDate,
  formatDateTime,
  formatNumber,
  playersLabel,
  relativeTime,
} from "@/lib/format";
import { badgeText, rewardLabel, shopItemName } from "@/lib/i18n/rewards";
import type { GamePlayers } from "@/types";

interface I18nState {
  locale: Locale;
  t: Messages;
  setLocale: (next: Locale) => void;
  /** Albanian text for an English message returned by the API. */
  serverText: (message: string) => string;
  fmt: {
    number: (value: number) => string;
    date: (iso: string) => string;
    dateTime: (iso: string) => string;
    relative: (iso: string) => string;
    players: (players: GamePlayers) => string;
    category: (category: string) => string;
    badge: (badge: { id: string; title: string; description: string }) => { title: string; description: string };
    item: (item: { id: string; name: string }) => string;
    rewardLabel: (label: string) => string;
  };
}

const I18nContext = createContext<I18nState | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
      document.documentElement.lang = next;
      setLocaleState(next);
      // Server-rendered pages (legal pages, metadata) read the cookie.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nState>(
    () => ({
      locale,
      t: getMessages(locale),
      setLocale,
      serverText: (message) => translateServerMessage(locale, message),
      fmt: {
        number: (value) => formatNumber(value, locale),
        date: (iso) => formatDate(iso, locale),
        dateTime: (iso) => formatDateTime(iso, locale),
        relative: (iso) => relativeTime(iso, locale),
        players: (players) => playersLabel(players, locale),
        category: (category) => categoryLabel(category, locale),
        badge: (badge) => badgeText(locale, badge),
        item: (item) => shopItemName(locale, item),
        rewardLabel: (label) => rewardLabel(locale, label),
      },
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
