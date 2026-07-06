"use client";

import { useUserRating } from "@/features/games/useRating";
import { RatingInput } from "@/components/ui/RatingInput";

export function RateThisGame({ gameId }: { gameId: string }) {
  const { rating, loading, submitRating } = useUserRating(gameId);

  if (loading) {
    return (
      <div className="py-4 text-sm text-zinc-400">
        Loading your rating...
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-100">
        {rating ? "Your rating" : "Rate this game"}
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
