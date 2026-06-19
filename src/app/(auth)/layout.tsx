import Link from "next/link";
import Image from "next/image";

/** Minimal, focused chrome for the mock login / signup screens. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
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
