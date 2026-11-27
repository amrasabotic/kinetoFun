// Platform languages. Games are not translated: they keep their own English text.

export const LOCALES = ["en", "sq"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "kf-locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Each language is named in itself, so a reader can always find their own. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  sq: "Shqip",
};

/** BCP 47 tags for Intl number and date formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  sq: "sq-AL",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** First supported language in an Accept-Language header, by q-value. */
function fromAcceptLanguage(header: string): Locale | null {
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const weight = q ? Number(q.trim().slice(2)) : 1;
      return { lang: tag.toLowerCase().split("-")[0], weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((entry) => entry.lang && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const entry of ranked) {
    if (isLocale(entry.lang)) return entry.lang;
  }
  return null;
}

/** The saved choice wins; otherwise the browser's languages; otherwise English. */
export function pickLocale(cookie?: string | null, acceptLanguage?: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  if (acceptLanguage) return fromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
  return DEFAULT_LOCALE;
}
