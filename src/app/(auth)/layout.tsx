import Link from "next/link";
import Image from "next/image";

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
        className="mb-10 flex items-center rounded-lg focus:outline-none"
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

      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
