"use client";

import { Globe } from "lucide-react";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { useI18n } from "@/features/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const SHORT: Record<Locale, string> = { en: "EN", sq: "SQ" };

/**
 * Switches the platform language. `compact` fits a toolbar, `large` a settings row,
 * `tv` is sized for hand dwell from across the room.
 */
export function LanguagePicker({
  variant = "compact",
  tone = "light",
  className,
}: {
  variant?: "compact" | "large" | "tv";
  tone?: "light" | "dark";
  className?: string;
}) {
  const { locale, setLocale, t } = useI18n();
  const dark = tone === "dark";

  if (variant === "compact") {
    return (
      <div
        role="group"
        aria-label={t.common.language.label}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full border p-0.5",
          dark ? "border-white/15 bg-white/5" : "border-[#1A2E74]/15 bg-white/70",
          className,
        )}
      >
        <Globe className={cn("mx-1 h-3.5 w-3.5", dark ? "text-white/50" : "text-[#1A2E74]/50")} aria-hidden />
        {LOCALES.map((code) => {
          const active = code === locale;
          return (
            <button
              key={code}
              type="button"
              data-focusable
              lang={code}
              aria-pressed={active}
              title={LOCALE_NAMES[code]}
              onClick={() => !active && setLocale(code)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1AACE0]/60",
                active
                  ? dark
                    ? "bg-white/90 text-[#0a1438]"
                    : "bg-[#1A2E74] text-white"
                  : dark
                    ? "text-white/60 hover:text-white"
                    : "text-[#1A2E74]/60 hover:text-[#1A2E74]",
              )}
            >
              {SHORT[code]}
            </button>
          );
        })}
      </div>
    );
  }

  const tv = variant === "tv";
  return (
    <div
      role="group"
      aria-label={t.common.language.label}
      className={cn("flex flex-wrap gap-3", tv && "gap-6", className)}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            data-focusable
            lang={code}
            aria-pressed={active}
            onClick={() => !active && setLocale(code)}
            className={cn(
              "flex items-center gap-2 rounded-2xl border-2 font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              tv ? "min-w-[14rem] justify-center px-10 py-5 text-3xl" : "px-5 py-2.5 text-sm",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : dark
                  ? "border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                  : "border-border bg-card text-foreground/80 hover:border-primary/40",
            )}
          >
            <span className={cn("font-mono opacity-70", tv ? "text-2xl" : "text-xs")}>{SHORT[code]}</span>
            {LOCALE_NAMES[code]}
          </button>
        );
      })}
    </div>
  );
}
