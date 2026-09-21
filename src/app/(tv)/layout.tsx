import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KinetoFun TV",
  description: "Set up your KinetoFun TV.",
};

/**
 * Chrome-free shell for the screens the Raspberry Pi renders on a television.
 * No TopBar, no Footer, no site navigation — the TV has no pointer and is read
 * from several metres away, so everything here is deliberately oversized and
 * centred. Uses the app's existing theme tokens; nothing about the rest of the
 * site changes.
 */
export default function TvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050a1a] px-10 py-12 text-white">
      {/* Soft brand glows, so a mostly-empty TV screen isn't a flat rectangle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full bg-primary/25 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/3 right-0 h-[55vh] w-[55vh] rounded-full bg-accent/15 blur-[140px]"
      />
      <main className="relative z-10 w-full max-w-6xl">{children}</main>
    </div>
  );
}
