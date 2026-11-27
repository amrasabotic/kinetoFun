"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/features/i18n/I18nProvider";

export function RatingInput({
  onRate,
  disabled = false,
  currentScore,
}: {
  onRate: (score: number) => void | Promise<void>;
  disabled?: boolean;
  currentScore?: number | null;
}) {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const g = useI18n().t.games;

  const displayScore = hoveredScore ?? currentScore ?? 0;

  const handleClick = async (score: number) => {
    if (disabled || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onRate(score);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="inline-flex gap-0.5"
        onMouseLeave={() => setHoveredScore(null)}
      >
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => handleClick(score)}
            onMouseEnter={() => setHoveredScore(score)}
            disabled={disabled || isSubmitting}
            aria-label={g.rateStars(score)}
            className={cn(
              "text-2xl transition-colors duration-75",
              score <= displayScore ? "text-amber-400" : "text-muted-foreground/40",
              !disabled && !isSubmitting && "cursor-pointer hover:text-amber-300",
              (disabled || isSubmitting) && "cursor-not-allowed opacity-50",
            )}
          >
            ★
          </button>
        ))}
      </div>
      {displayScore > 0 && (
        <span className="text-sm font-medium text-foreground/80">
          {displayScore}
        </span>
      )}
    </div>
  );
}
