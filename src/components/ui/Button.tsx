"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-bg shadow-lg shadow-accent/30 hover:shadow-accent/50 hover:brightness-105 hover:scale-[1.02] active:scale-100",
  secondary:
    "bg-surface border border-line text-white backdrop-blur-md hover:bg-surface-2 hover:scale-[1.02] active:scale-100",
  ghost: "bg-transparent text-muted hover:bg-surface-2 hover:text-white",
  danger: "bg-red-600 text-white hover:bg-red-500 hover:scale-[1.02] active:scale-100",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-14 px-8 text-lg",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  fullWidth = false,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition select-none focus:outline-none",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      data-focusable
      className={cn(buttonClasses(variant, size, fullWidth), className)}
      {...rest}
    >
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      data-focusable
      className={cn(buttonClasses(variant, size, fullWidth), className)}
    >
      {children}
    </Link>
  );
}
