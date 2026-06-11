// SuperAdmin route group. The root layout already provides SessionProvider etc.
// This layout enforces the authoritative superadmin check server-side (defence
// in depth alongside the proxy's optimistic JWT check) and renders the premium
// admin shell. Non-superadmins are redirected to / by `requireSuperAdmin`.

import { requireSuperAdmin } from "@/lib/auth/dal";
import { SuperAdminShell } from "@/components/superadmin/SuperAdminShell";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireSuperAdmin(); // redirects non-superadmins to /

  return (
    <SuperAdminShell
      user={{ name: admin.name, email: admin.email, role: admin.role }}
    >
      {children}
    </SuperAdminShell>
  );
}
