import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect to your TV — KinetoFun",
  description: "Connect your KinetoFun account to a TV.",
};

/**
 * Mobile-first shell for /tv/join/[code]. This is the phone side of pairing, so
 * unlike the (tv) layout it is small-screen first and carries no TV framing —
 * it mirrors the centred single-card feel of the existing (auth) pages.
 */
export default function TvJoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050a1a] px-5 py-10 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
      />
      <main className="relative z-10 w-full max-w-md">{children}</main>
    </div>
  );
}
