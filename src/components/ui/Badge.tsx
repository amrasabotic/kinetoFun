import { cn } from "@/lib/utils";

type BadgeTone = "default" | "accent" | "outline";

const TONES: Record<BadgeTone, string> = {
  default: "bg-white/[0.08] text-foreground/70",
  accent: "bg-primary/15 text-primary ring-1 ring-primary/30",
  outline: "border border-white/[0.12] text-foreground/50",
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
