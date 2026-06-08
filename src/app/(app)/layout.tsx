import { TopBar } from "@/components/layout/TopBar";

/**
 * Portal chrome: every main app page renders inside the persistent top bar.
 * Auth pages live in the (auth) group and skip this layout.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8 sm:px-10">
        {children}
      </main>
    </div>
  );
}
