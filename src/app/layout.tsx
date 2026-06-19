import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/features/auth/session-context";
import { SpatialNavigation } from "@/components/navigation/SpatialNavigation";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: "KinetoFun — Play with a wave",
  description:
    "A gesture-ready, TV-first gaming platform. Browse, launch, and compete from your couch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full font-sans">
        {/* Rounded, friendly fonts for the playful landing page (scoped via
            .landing-root / .font-display in globals.css). Loaded at runtime so the
            build never depends on reaching Google Fonts. React 19 hoists these to <head>. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          precedence="default"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;500;600;700;800;900&display=swap"
        />
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <SessionProvider>
            <SpatialNavigation>{children}</SpatialNavigation>
          </SessionProvider>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
