"use client";

// /tv/join/[code] — where the QR code lands. Mobile-first.
//
// This page adds NO authentication of its own. If the visitor isn't signed in
// it sends them to the existing /login or /signup with `?next=` pointing back
// here, and the existing flow returns them with a normal session cookie. The
// only new thing it does is one authenticated POST that attaches that account
// to the TV's pairing session.
//
// The phone does not need to stay open afterwards — the TV polls for itself.

import { Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { CircleCheckBig, LoaderCircle, Tv, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useSession } from "@/features/auth/session-context";
import type { TvSessionView } from "@/lib/tv/pairing";

type Phase =
  | "checking"
  | "joinable"
  | "connecting"
  | "connected"
  | "expired"
  | "taken"
  | "error";

const EXPIRED_MESSAGE =
  "This TV connection has expired. Please scan the new QR code shown on the TV.";

/** Shared card chrome, matching the existing auth screens. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-7 shadow-2xl backdrop-blur-2xl">
      {children}
    </div>
  );
}

function JoinContent() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? "").toUpperCase();

  const { user, isAuthenticated, isLoading } = useSession();

  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState<string | null>(null);

  // Check the code is still usable before offering to connect. This call is
  // deliberately unauthenticated and returns the status only — never who, if
  // anyone, is already paired with this TV.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/tv/session/${encodeURIComponent(code)}`, {
          cache: "no-store",
        });
        if (cancelled) return;

        const body = (await response.json().catch(() => ({}))) as { status?: TvSessionView };
        const status = response.status === 404 ? "not_found" : body.status;

        if (status === "waiting") {
          setPhase("joinable");
        } else if (status === "authenticated" || status === "ready") {
          setPhase("taken");
        } else {
          setPhase("expired");
        }
      } catch {
        if (cancelled) return;
        setPhase("error");
        setMessage("Couldn't reach KinetoFun. Check your connection and try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleConnect = useCallback(async () => {
    setPhase("connecting");
    setMessage(null);
    try {
      const response = await fetch(`/api/tv/session/${encodeURIComponent(code)}/join`, {
        method: "POST",
        cache: "no-store",
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (response.ok) {
        setPhase("connected");
        return;
      }
      if (response.status === 410 || response.status === 404) {
        setPhase("expired");
        return;
      }
      if (response.status === 409) {
        setPhase("taken");
        return;
      }
      setPhase("error");
      setMessage(body.error ?? "Couldn't connect to the TV. Please try again.");
    } catch {
      setPhase("error");
      setMessage("Couldn't reach KinetoFun. Check your connection and try again.");
    }
  }, [code]);

  const nextParam = `?next=${encodeURIComponent(`/tv/join/${code}`)}`;

  if (phase === "checking" || isLoading) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-8" role="status">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-white/60">Checking this TV…</p>
        </div>
      </Card>
    );
  }

  if (phase === "connected") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 text-center">
          <CircleCheckBig className="h-14 w-14 text-primary" />
          <h1 className="text-2xl font-black tracking-tight">You&apos;re connected!</h1>
          <p className="text-white/70">You can continue on your TV.</p>
          <p className="pt-2 text-sm text-white/40">
            It&apos;s safe to close this page — your TV takes it from here.
          </p>
        </div>
      </Card>
    );
  }

  if (phase === "expired") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 text-center" role="alert">
          <TriangleAlert className="h-12 w-12 text-accent" />
          <h1 className="text-xl font-black tracking-tight">Connection expired</h1>
          <p className="text-white/70">{EXPIRED_MESSAGE}</p>
        </div>
      </Card>
    );
  }

  if (phase === "taken") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 text-center" role="alert">
          <Tv className="h-12 w-12 text-accent" />
          <h1 className="text-xl font-black tracking-tight">TV already connected</h1>
          <p className="text-white/70">
            This TV is already connected to an account. Disconnect it on the TV first,
            then scan the new QR code.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-center gap-4 text-center">
        <Image src="/logo.png" alt="KinetoFun" width={150} height={44} priority />
        <h1 className="text-2xl font-black tracking-tight">Join KinetoFun</h1>
        <p className="text-white/70">You are connecting to a TV.</p>
        <p className="font-mono text-lg tracking-[0.3em] text-accent">{code}</p>
      </header>

      <Card>
        {isAuthenticated ? (
          <div className="space-y-5">
            <p className="text-center text-white/70">
              Connect{" "}
              <span className="font-semibold text-white">
                {user?.displayName ?? "your account"}
              </span>{" "}
              to this TV?
            </p>
            <Button
              fullWidth
              size="lg"
              onClick={handleConnect}
              disabled={phase === "connecting"}
              className={phase === "connecting" ? "pointer-events-none opacity-60" : undefined}
            >
              {phase === "connecting" ? "Connecting…" : "Connect to TV"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-white/70">
              Sign in to connect this TV to your KinetoFun account.
            </p>
            <ButtonLink href={`/login${nextParam}`} fullWidth size="lg">
              Log in
            </ButtonLink>
            <p className="text-center text-sm text-white/50">Don&apos;t have an account?</p>
            <ButtonLink href={`/signup${nextParam}`} fullWidth size="lg" variant="secondary">
              Create Account
            </ButtonLink>
          </div>
        )}

        {message && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {message}
          </p>
        )}
      </Card>

      <p className="text-center text-xs text-white/35">
        Connecting links your account to this TV. Your password is never shared with it.
      </p>
    </div>
  );
}

export default function TvJoinPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <JoinContent />
    </Suspense>
  );
}
