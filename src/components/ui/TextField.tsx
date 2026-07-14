import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
}

export function TextField({ label, className, id, icon, ...rest }: TextFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-foreground/50">
        {label}
      </span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/30">
            {icon}
          </span>
        )}
        <input
          id={id}
          data-focusable
          className={cn(
            "h-12 w-full rounded-xl border border-white/10 bg-white/5 text-foreground placeholder:text-foreground/25 backdrop-blur-sm transition-all duration-200",
            "focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20",
            icon ? "pl-10 pr-4" : "px-4",
            className,
          )}
          {...rest}
        />
      </div>
    </label>
  );
}
