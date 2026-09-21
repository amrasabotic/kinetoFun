import Link from "next/link";

const LINK_COLOR = { blue: "#2F80FF", green: "#5BD97B", yellow: "#FFD84D" };

export function Footer() {
  return (
    <footer className="w-full border-t border-white/5 py-12" style={{ background: "#091440" }}>
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-1 font-display text-xl font-extrabold text-white">KinetoFun</p>
            <p className="text-sm text-white/45">Where kids level up through play.</p>
          </div>

          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest" style={{ color: LINK_COLOR.blue }}>Learn</p>
            {[
              { label: "Browse Games", href: "/library" },
              { label: "Featured", href: "/library" },
              { label: "New Worlds", href: "/library" },
              { label: "Leaderboard", href: "/leaderboard" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>

          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest" style={{ color: LINK_COLOR.green }}>Platform</p>
            {[
              { label: "Profile", href: "/profile" },
              { label: "Settings", href: "/settings" },
              { label: "Contact", href: "/contact" },
              { label: "How It Works", href: "/" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>

          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest" style={{ color: LINK_COLOR.yellow }}>Legal</p>
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Cookie Policy", href: "/cookies" },
              { label: "Contact", href: "/contact" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-white/25 sm:flex-row">
          <p>© {new Date().getFullYear()} KinetoFun. All rights reserved.</p>
          <p>Made with ❤️ for curious kids</p>
        </div>
      </div>
    </footer>
  );
}
