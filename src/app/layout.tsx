import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/features/auth/session-context";
import { SpatialNavigation } from "@/components/navigation/SpatialNavigation";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DottedSurface } from "@/components/ui/dotted-surface";

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
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" disableTransitionOnChange>
          <DottedSurface />
          <SessionProvider>
            <SpatialNavigation>{children}</SpatialNavigation>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
