import Link from "next/link";

/** Minimal, focused chrome for the mock login / signup screens. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-accent-2/10 blur-[140px]" />

      <Link
        href="/"
        data-focusable
        className="mb-10 flex items-center gap-2 rounded-lg text-3xl font-black tracking-tight text-white focus:outline-none"
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-xl">
          K
        </span>
        Kineto<span className="text-accent">Fun</span>
      </Link>

      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
