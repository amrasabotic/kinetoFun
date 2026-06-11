"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar, type AdminIdentity } from "./Sidebar";
import { Topbar } from "./Topbar";

const COLLAPSE_KEY = "kf_admin_sidebar_collapsed";

export function SuperAdminShell({
  user,
  children,
}: {
  user: AdminIdentity;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore collapse preference.
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapse() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="relative z-10 min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Desktop sidebar (fixed, floating) */}
      <div className="fixed inset-y-0 left-0 z-30 hidden p-3 lg:block">
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} user={user} />
      </div>

      {/* Mobile slide-over drawer */}
      <div
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 p-3 transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-[110%]",
        )}
      >
        <Sidebar
          collapsed={false}
          user={user}
          mobile
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      {/* Main column — left padding matches the desktop sidebar width */}
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[100px]" : "lg:pl-[280px]",
        )}
      >
        <Topbar user={user} onOpenMobile={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
