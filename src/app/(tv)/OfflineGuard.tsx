"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/features/i18n/I18nProvider";

const PROBE_MS = 2000;

export function OfflineGuard() {
  const [offline, setOffline] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/tv-sw.js", { scope: "/tvsetup" }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    // navigator.onLine stays true when Wi-Fi is up but the router has no internet, so confirm with a real request.
    const probe = () => {
      const img = new Image();
      img.onload = () => {
        if (!stopped) setOffline(false);
      };
      img.onerror = () => {
        if (stopped) return;
        setOffline(true);
        timer = setTimeout(probe, PROBE_MS);
      };
      img.src = `/logo.png?t=${Date.now()}`;
    };

    const goOffline = () => {
      setOffline(true);
      clearTimeout(timer);
      timer = setTimeout(probe, PROBE_MS);
    };
    const goOnline = () => {
      clearTimeout(timer);
      probe();
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    if (!navigator.onLine) goOffline();
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-12 bg-white text-[#6d28d9]">
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image would need the network to optimise it */}
      <img src="/logo.png" alt="KinetoFun" className="w-[360px] max-w-[40vw]" />
      <div className="h-16 w-16 animate-spin rounded-full border-[7px] border-[#ede9fe] border-t-[#7c3aed]" />
      <p className="text-3xl font-bold opacity-80">{t.tv.offline}</p>
    </div>
  );
}
