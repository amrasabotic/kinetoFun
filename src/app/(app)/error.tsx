"use client";

import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { useI18n } from "@/features/i18n/I18nProvider";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
        <span className="text-3xl">⚠️</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.common.error.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.common.error.body}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110"
        >
          {t.common.actions.retry}
        </button>
        <ButtonLink href="/" variant="secondary">
          {t.common.actions.goHome}
        </ButtonLink>
      </div>
    </div>
  );
}
