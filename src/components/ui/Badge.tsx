import { cn } from "@/lib/utils";

type BadgeTone = "default" | "accent" | "outline";

const TONES: Record<BadgeTone, string> = {
  default: "bg-surface-2 text-zinc-200",
  accent: "bg-accent/15 text-accent ring-1 ring-accent/30",
  outline: "border border-line text-muted",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
