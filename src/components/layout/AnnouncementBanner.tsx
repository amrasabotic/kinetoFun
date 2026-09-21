"use client";

import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/session-context";

interface PublicSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementActive: boolean;
  announcementText: string;
  announcementType: "info" | "warning" | "success";
  registrationOpen: boolean;
}

const ANNOUNCEMENT_DISMISS_KEY = "kf_announcement_dismissed";

export function AnnouncementBanner() {
  const { user } = useSession();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setSettings(d as PublicSettings);
      })
      .catch(() => {});
  }, []);

  // Read dismiss state from sessionStorage (cleared when tab closes)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(!!sessionStorage.getItem(ANNOUNCEMENT_DISMISS_KEY));
    }
  }, []);

  if (!settings) return null;

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // Maintenance mode — full-page overlay for regular users, banner for admins
  if (settings.maintenanceMode) {
    if (!isAdmin) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-slate-950/95 px-6 text-center backdrop-blur-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20">
            <ShieldAlert className="h-10 w-10 text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Down for Maintenance</h1>
            <p className="mt-3 max-w-sm text-base text-slate-400">
              {settings.maintenanceMessage}
            </p>
          </div>
          <p className="text-xs text-slate-600">Check back soon</p>
        </div>
      );
    }

    // Admins see a dismissable banner instead of the full overlay
    return (
      <div className="flex items-center justify-between gap-4 bg-rose-600 px-5 py-2.5 text-sm text-white">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">Maintenance mode is active.</span>{" "}
            Regular users see a maintenance screen. You can access the app as an admin.
          </span>
        </div>
      </div>
    );
  }

  // Announcement banner
  if (!settings.announcementActive || !settings.announcementText || dismissed) return null;

  const styles = {
    info: {
      wrapper: "bg-sky-50 border-sky-200 text-sky-800",
      icon: <Info className="h-4 w-4 shrink-0 text-sky-500" />,
      close: "text-sky-500 hover:bg-sky-100",
    },
    warning: {
      wrapper: "bg-amber-50 border-amber-200 text-amber-800",
      icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />,
      close: "text-amber-500 hover:bg-amber-100",
    },
    success: {
      wrapper: "bg-emerald-50 border-emerald-200 text-emerald-800",
      icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />,
      close: "text-emerald-500 hover:bg-emerald-100",
    },
  }[settings.announcementType];

  function dismiss() {
    setDismissed(true);
    sessionStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, "1");
  }

  return (
    <div className={cn("flex items-center gap-3 border-b px-5 py-2.5 text-sm", styles.wrapper)}>
      {styles.icon}
      <span className="flex-1">{settings.announcementText}</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className={cn("rounded-md p-1 transition", styles.close)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
