"use client";

// /tvsetup — the screen the Raspberry Pi opens on boot.
//
// Creates a temporary pairing session, shows the QR + short code, and polls
// until a phone authenticates. Works unchanged in a desktop browser, which is
// how the TV is simulated during development.

import { Suspense, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, RefreshCw, WifiOff } from "lucide-react";
import { useTvSession } from "@/features/tv/useTvSession";
import { PairingQr } from "@/components/tv/PairingQr";
import { Button } from "@/components/ui/Button";
import { LanguagePicker } from "@/components/i18n/LanguagePicker";
import { useI18n } from "@/features/i18n/I18nProvider";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function TvSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // A real Pi is configured with a stable key (?device=KF-TV-001). The hook
  // remembers the newest well-formed key, so pairing screens reached without
  // the query string (for example after disconnecting) still identify the
  // unit. Without any key, it generates and remembers a per-browser one so a
  // simulated TV behaves like a single device across reloads.
  const deviceKey = searchParams.get("device");

  const { session, status, reconnecting, error, secondsLeft, regenerate } =
    useTvSession({ deviceKey });

  // A phone completed authentication — move to the welcome screen, which
  // exchanges the TV's secret for its own session.
  useEffect(() => {
    if (status === "authenticated" || status === "ready") {
      router.replace("/tvsetup/getstarted");
    }
  }, [status, router]);

  const isPaired = status === "authenticated" || status === "ready";
  const { t, serverText } = useI18n();
  const w = t.tv.welcome;

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <LanguagePicker variant="tv" tone="dark" className="fixed right-10 top-10 z-20 [&_button]:min-w-0 [&_button]:px-8 [&_button]:py-4 [&_button]:text-2xl" />
      <header className="flex flex-col items-center gap-4">
        <Image src="/logo.png" alt="KinetoFun" width={220} height={64} priority />
        <h1 className="text-6xl font-black tracking-tight sm:text-7xl">
          {w.title}
        </h1>
        <p className="max-w-3xl text-3xl font-medium text-white/70">
          {w.scan}
        </p>
      </header>

      {session && !isPaired ? (
        <div className="flex flex-col items-center gap-5">
          <PairingQr value={session.joinUrl} size={360} />

          <div className="flex flex-col items-center gap-3">
            <p className="text-xl uppercase tracking-[0.35em] text-white/50">{w.code}</p>
            <p className="font-mono text-6xl font-black tracking-[0.2em] text-accent">
              {session.pairingCode}
            </p>
          </div>

          <p className="text-xl text-white/50" aria-live="polite">
            {secondsLeft > 0
              ? w.expires(formatCountdown(secondsLeft))
              : w.generating}
          </p>
        </div>
      ) : (
        <div
          className="flex h-[360px] w-[360px] flex-col items-center justify-center gap-6 rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-2xl"
          role="status"
        >
          <LoaderCircle className="h-16 w-16 animate-spin text-primary" />
          <p className="text-2xl text-white/60">
            {isPaired ? w.connecting : w.preparing}
          </p>
        </div>
      )}

      {/* Network trouble is a state, not a broken screen: the QR stays up and
          the hook keeps retrying behind this banner. */}
      {reconnecting && (
        <div
          className="flex items-center gap-4 rounded-2xl border border-accent/30 bg-accent/10 px-8 py-5 text-2xl text-accent"
          role="status"
        >
          <WifiOff className="h-7 w-7 shrink-0" />
          <span>{w.reconnecting}</span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-6" role="alert">
          <p className="max-w-2xl text-2xl text-destructive">{serverText(error)}</p>
          <Button size="lg" onClick={regenerate} className="h-16 px-10 text-2xl!">
            <RefreshCw className="h-6 w-6" />
            {t.common.actions.retry}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TvSetupPage() {
  return (
    <Suspense fallback={<div className="h-[70vh]" />}>
      <TvSetup />
    </Suspense>
  );
}
