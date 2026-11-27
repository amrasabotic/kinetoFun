import Link from "next/link";
import { getRequestMessages } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getRequestMessages();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
      <div>
        <p className="font-mono text-sm font-semibold uppercase tracking-widest text-primary/60">
          404
        </p>
        <h1 className="mt-2 text-4xl font-black text-foreground sm:text-5xl">
          {t.common.notFound.title}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {t.common.notFound.body}
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 hover:scale-[1.02] active:scale-100"
        >
          {t.common.actions.goHome}
        </Link>
        <Link
          href="/library"
          className="inline-flex h-11 items-center rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold text-foreground backdrop-blur-md transition hover:bg-white/10 hover:scale-[1.02] active:scale-100"
        >
          {t.common.actions.browseGames}
        </Link>
      </div>
    </div>
  );
}
