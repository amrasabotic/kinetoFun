import { TopBar } from "@/components/layout/TopBar";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <AnnouncementBanner />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8 sm:px-10">
        {children}
      </main>
    </div>
  );
}
