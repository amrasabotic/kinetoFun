"use client";

// /tvsetup/getstarted — shown once a phone has authenticated the pairing.
//
// This is where the TV redeems its pairing secret for its own KinetoFun
// session (POST .../claim sets the normal kf_auth cookie). From here on the TV
// is a signed-in client like any other, so GET STARTED opens the TV games
// home and every existing game / score / session API works.

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoaderCircle, PartyPopper } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useSession } from "@/features/auth/session-context";
import { useHandInput } from "@/features/hand-input/HandInputProvider";
import { useI18n } from "@/features/i18n/I18nProvider";
import { LanguagePicker } from "@/components/i18n/LanguagePicker";
import {
  clearStoredTvSession,
  readStoredTvSession,
  type StoredTvSession,
} from "@/features/tv/useTvSession";

type Phase = "claiming" | "ready" | "failed";

export default function TvGetStartedPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const { t, locale, serverText } = useI18n();
  const g = t.tv.getStarted;

  const [phase, setPhase] = useState<Phase>("claiming");
  const [userName, setUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const { rearm } = useHandInput();

  const storedRef = useRef<StoredTvSession | null>(null);
  // React 19 mounts effects twice in dev; claiming twice would mint a second
  // auth session for the same TV, so gate on a ref rather than state.
  const claimedRef = useRef(false);

  useEffect(() => {
    if (claimedRef.current) return;
    claimedRef.current = true;

    const stored = readStoredTvSession();
    storedRef.current = stored;

    // No pairing on this device (fresh browser, cleared storage, someone typed
    // the URL) — there is nothing to welcome. Start setup over.
    if (!stored) {
      router.replace("/tvsetup");
      return;
    }

    // NOTE: deliberately no `cancelled` flag / cleanup here. Strict Mode mounts
    // effects twice in development, and `claimedRef` already guarantees exactly
    // one claim per page instance — so a cancel-on-unmount guard would discard
    // the only in-flight result and leave this screen spinning forever.
    void (async () => {
      try {
        const response = await fetch(
          `/api/tv/session/${encodeURIComponent(stored.pairingCode)}/claim`,
          { method: "POST", headers: { "x-tv-secret": stored.tvSecret }, cache: "no-store" },
        );

        const body = (await response.json().catch(() => ({}))) as {
          user?: { name?: string };
          error?: string;
        };

        if (!response.ok) {
          // 409/410 mean the pairing went away underneath us (expired, ended,
          // account removed). Sending the TV back to /tvsetup gets it a fresh
          // QR rather than stranding it here.
          if (response.status === 409 || response.status === 410) {
            clearStoredTvSession();
            router.replace("/tvsetup");
            return;
          }
          setError(body.error ? serverText(body.error) : g.claimFailed);
          setPhase("failed");
          return;
        }

        setUserName(body.user?.name ?? null);
        setPhase("ready");
        // The cookie was just set on this response; tell the app about it so
        // the player home renders as the paired user.
        await refresh();
        router.refresh();
      } catch {
        setError(g.unreachable);
        setPhase("failed");
      }
    })();
  }, [router, refresh, serverText, g]);

  const handleDisconnect = useCallback(async () => {
    const stored = storedRef.current ?? readStoredTvSession();
    setLeaving(true);
    if (stored) {
      // Ends the pairing and revokes only the session minted for this TV — the
      // user stays signed in on their phone.
      await fetch(`/api/tv/session/${encodeURIComponent(stored.pairingCode)}/leave`, {
        method: "POST",
        headers: { "x-tv-secret": stored.tvSecret },
        cache: "no-store",
      }).catch(() => {});
    }
    clearStoredTvSession();
    await refresh().catch(() => {});
    router.replace("/tvsetup");
  }, [router, refresh]);

  // The confirm buttons appear right where the hand already is, so dwell is
  // disarmed again each time the choice changes.
  const askDisconnect = useCallback(() => {
    setConfirmingDisconnect(true);
    rearm();
  }, [rearm]);

  const cancelDisconnect = useCallback(() => {
    setConfirmingDisconnect(false);
    rearm();
  }, [rearm]);

  if (phase === "claiming") {
    return (
      <div className="flex flex-col items-center gap-8 text-center" role="status">
        <LoaderCircle className="h-20 w-20 animate-spin text-primary" />
        <p className="text-3xl text-white/60">{g.claiming}</p>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="flex flex-col items-center gap-10 text-center" role="alert">
        <h1 className="text-5xl font-black tracking-tight">{t.common.error.title}</h1>
        <p className="max-w-2xl text-2xl text-white/60">{error}</p>
        <Button
          size="lg"
          onClick={handleDisconnect}
          disabled={leaving}
          className="h-20 px-14 text-3xl!"
        >
          {g.startOver}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-12 text-center">
      <LanguagePicker variant="tv" tone="dark" className="fixed right-10 top-10 z-20 [&_button]:min-w-0 [&_button]:px-8 [&_button]:py-4 [&_button]:text-2xl" />
      <Image src="/logo.png" alt="KinetoFun" width={180} height={52} priority />

      <div className="flex flex-col items-center gap-6">
        <PartyPopper className="h-20 w-20 text-accent" />
        <h1 className="text-6xl font-black tracking-tight sm:text-7xl">
          {g.welcome((userName ?? g.player).toLocaleUpperCase(locale))}
        </h1>
        <p className="text-3xl font-medium text-white/70">{g.ready}</p>
        <p className="text-2xl text-white/50">{g.hold}</p>
      </div>

      <ButtonLink href="/tvsetup/games" size="lg" className="h-24 px-20 text-4xl!">
        {g.getStarted}
      </ButtonLink>

      {/* Two steps, because a hand resting in the wrong place for a second
          would otherwise sign the TV out and send the family back to the QR
          code. */}
      {confirmingDisconnect ? (
        <div className="flex flex-col items-center gap-6" role="alertdialog" aria-label={g.disconnectAria}>
          <p className="text-2xl text-white/70">
            {g.disconnectPrompt}
          </p>
          <div className="flex items-center gap-6">
            <Button
              variant="secondary"
              size="lg"
              onClick={cancelDisconnect}
              disabled={leaving}
              className="h-16 px-10 text-2xl! text-white!"
            >
              {g.keep}
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleDisconnect}
              disabled={leaving}
              className="h-16 px-10 text-2xl!"
            >
              {leaving ? g.disconnecting : g.disconnect}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          data-focusable
          onClick={askDisconnect}
          className="rounded-xl px-8 py-4 text-2xl text-white/40 transition hover:text-white/80"
        >
          {g.notYou}
        </button>
      )}
    </div>
  );
}
