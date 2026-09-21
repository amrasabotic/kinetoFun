import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
    >
      <span className="text-amber-400" aria-hidden>
        {"★".repeat(rounded)}
        <span className="text-zinc-600">{"★".repeat(5 - rounded)}</span>
      </span>
      <span className="text-sm font-medium text-zinc-300">
        {rating.toFixed(1)}
      </span>
    </span>
  );
}
