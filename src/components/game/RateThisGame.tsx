"use client";

import { useUserRating } from "@/features/games/useRating";
import { RatingInput } from "@/components/ui/RatingInput";
import { useI18n } from "@/features/i18n/I18nProvider";

export function RateThisGame({ gameId }: { gameId: string }) {
  const { rating, loading, submitRating } = useUserRating(gameId);
  const g = useI18n().t.games;

  if (loading) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        {g.loadingRating}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-card/40 p-4">
      <h3 className="text-sm font-semibold text-foreground">
        {rating ? g.yourRating : g.rateThis}
      </h3>
      <RatingInput
        onRate={(score) => {
          void submitRating(score);
        }}
        currentScore={rating}
      />
    </div>
  );
}
