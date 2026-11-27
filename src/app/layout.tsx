import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/features/auth/session-context";
import { SpatialNavigation } from "@/components/navigation/SpatialNavigation";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DisplaySettingsSync } from "@/features/settings/DisplaySettingsSync";
import { TvModeSync } from "@/features/tv/TvModeSync";
import { I18nProvider } from "@/features/i18n/I18nProvider";
import { getRequestLocale, getRequestMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestMessages();
  return {
    title: t.common.meta.title,
    description: t.common.meta.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale} className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
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
          <I18nProvider initialLocale={locale}>
            <SessionProvider>
              <DisplaySettingsSync />
              <TvModeSync />
              <SpatialNavigation>{children}</SpatialNavigation>
            </SessionProvider>
          </I18nProvider>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
