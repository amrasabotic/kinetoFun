"use client";

import Link from "next/link";
import { useI18n } from "@/features/i18n/I18nProvider";

const LINK_COLOR = { blue: "#2F80FF", green: "#5BD97B", yellow: "#FFD84D" };

export function Footer() {
  const f = useI18n().t.common.footer;
  return (
    <footer className="w-full border-t border-white/5 py-12" style={{ background: "#091440" }}>
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-1 font-display text-xl font-extrabold text-white">KinetoFun</p>
            <p className="text-sm text-white/45">{f.tagline}</p>
          </div>

          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest" style={{ color: LINK_COLOR.blue }}>{f.learn}</p>
            {[
              { label: f.browseGames, href: "/library" },
              { label: f.featured, href: "/library" },
              { label: f.newWorlds, href: "/library" },
              { label: f.leaderboard, href: "/leaderboard" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>

          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest" style={{ color: LINK_COLOR.green }}>{f.platform}</p>
            {[
              { label: f.profile, href: "/profile" },
              { label: f.settings, href: "/settings" },
              { label: f.contact, href: "/contact" },
              { label: f.howItWorks, href: "/" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>

          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest" style={{ color: LINK_COLOR.yellow }}>{f.legal}</p>
            {[
              { label: f.privacy, href: "/privacy" },
              { label: f.terms, href: "/terms" },
              { label: f.cookies, href: "/cookies" },
              { label: f.contact, href: "/contact" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-white/25 sm:flex-row">
          <p>{f.rights(new Date().getFullYear())}</p>
          <p>{f.madeWith}</p>
        </div>
      </div>
    </footer>
  );
}
