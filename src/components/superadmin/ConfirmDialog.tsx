"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AdminButton } from "./ui";

/** An accessible, animated confirm modal. Render conditionally on `open`. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  busy,
  icon,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setShown(true));
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      setShown(false);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200",
          shown ? "opacity-100" : "opacity-0",
        )}
        onClick={onCancel}
      />
      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20 transition-all duration-200",
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        {icon && (
          <div
            className={cn(
              "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl",
              danger ? "bg-rose-50 text-rose-600" : "bg-violet-50 text-violet-600",
            )}
          >
            {icon}
          </div>
        )}
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <div className="mt-1.5 text-sm text-slate-500">{description}</div>

        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </AdminButton>
          <AdminButton
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
