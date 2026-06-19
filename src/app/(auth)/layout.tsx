import Link from "next/link";
import Image from "next/image";

/** Minimal, focused chrome for the login / signup screens. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">

      {/* ── Wave background — same bezier shape as homepage WaveDivider, two layers ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 leading-[0]" aria-hidden>
        {/* Back layer — soft purple */}
        <svg
          className="block w-full"
          style={{ height: "160px" }}
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
        >
          <path
            fill="rgba(138,92,255,0.09)"
            d="M0,76 C160,160 320,160 480,107 C680,40 760,14 960,68 C1120,110 1280,148 1440,85 L1440,160 L0,160 Z"
          />
        </svg>
        {/* Front layer — soft pink */}
        <svg
          className="absolute bottom-0 block w-full"
          style={{ height: "110px" }}
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
        >
          <path
            fill="rgba(255,95,162,0.11)"
            d="M0,52 C160,110 320,110 480,74 C680,28 760,9 960,47 C1120,76 1280,102 1440,59 L1440,110 L0,110 Z"
          />
        </svg>
      </div>

      <Link
        href="/"
        data-focusable
        className="relative z-10 mb-10 flex items-center rounded-lg focus:outline-none"
      >
        <Image
          src="/logo.png"
          alt="KinetoFun"
          width={480}
          height={160}
          className="h-40 w-auto object-contain"
          priority
        />
      </Link>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
