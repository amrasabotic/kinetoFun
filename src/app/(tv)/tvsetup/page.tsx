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

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function TvSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // A real Pi is configured with a stable key (?device=KF-TV-001). Without one,
  // the hook generates and remembers a per-browser key so a simulated TV still
  // behaves like a single device across reloads.
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

  return (
    <div className="flex flex-col items-center gap-12 text-center">
      <header className="flex flex-col items-center gap-6">
        <Image src="/logo.png" alt="KinetoFun" width={220} height={64} priority />
        <h1 className="text-6xl font-black tracking-tight sm:text-7xl">
          WELCOME TO KINETOFUN
        </h1>
        <p className="max-w-3xl text-3xl font-medium text-white/70">
          Scan this QR code with your phone to get started
        </p>
      </header>

      {session && !isPaired ? (
        <div className="flex flex-col items-center gap-8">
          <PairingQr value={session.joinUrl} size={440} />

          <div className="flex flex-col items-center gap-3">
            <p className="text-xl uppercase tracking-[0.35em] text-white/50">Code</p>
            <p className="font-mono text-7xl font-black tracking-[0.2em] text-accent">
              {session.pairingCode}
            </p>
          </div>

          <p className="text-xl text-white/50" aria-live="polite">
            {secondsLeft > 0
              ? `This code expires in ${formatCountdown(secondsLeft)}`
              : "Generating a new code…"}
          </p>
        </div>
      ) : (
        <div
          className="flex h-[440px] w-[440px] flex-col items-center justify-center gap-6 rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-2xl"
          role="status"
        >
          <LoaderCircle className="h-16 w-16 animate-spin text-primary" />
          <p className="text-2xl text-white/60">
            {isPaired ? "Connecting…" : "Preparing your TV…"}
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
          <span>Reconnecting to KinetoFun…</span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-6" role="alert">
          <p className="max-w-2xl text-2xl text-destructive">{error}</p>
          <Button size="lg" onClick={regenerate} className="h-16 px-10 text-2xl">
            <RefreshCw className="h-6 w-6" />
            Try again
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
