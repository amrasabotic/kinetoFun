"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { Footer } from "@/components/layout/Footer";
import { WaveDivider } from "@/components/layout/WaveDivider";
import { useSession } from "@/features/auth/session-context";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAuthenticated } = useSession();
  // The logged-out marketing landing page (this exact route + auth state —
  // it renders at the same "/" URL as the signed-in dashboard) already ends
  // its own CTA section in a WaveDivider bleeding into the footer's color;
  // adding a second one here would show the page background poking back
  // through between the two. Every other page/state gets the shared one.
  const hasOwnWave = pathname === "/" && !isAuthenticated;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <AnnouncementBanner />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8 sm:px-10">
        {children}
      </main>
      {!hasOwnWave && (
        // Dedicated strip (sized to the wave's own height) rather than
        // overlaying it on <main>'s padding, so it can never clip real page
        // content — it bleeds the footer's color up into the page background
        // the same way the homepage's section waves do.
        <div className="relative h-[44px] sm:h-[72px]">
          <WaveDivider color="#091440" />
        </div>
      )}
      <Footer />
    </div>
  );
}
