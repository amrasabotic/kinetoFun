import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, className, id, ...rest }: TextFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <input
        id={id}
        data-focusable
        className={cn(
          "h-12 w-full rounded-xl border border-line bg-surface px-4 text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none",
          className,
        )}
        {...rest}
      />
    </label>
  );
}
