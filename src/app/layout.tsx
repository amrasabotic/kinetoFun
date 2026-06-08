import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/features/auth/session-context";
import { SpatialNavigation } from "@/components/navigation/SpatialNavigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg font-sans text-zinc-100">
        <SessionProvider>
          <SpatialNavigation>{children}</SpatialNavigation>
        </SessionProvider>
      </body>
    </html>
  );
}
