// GET /api/settings — public endpoint for platform-wide settings the app needs.
// Returns only the fields required by the user-facing app (no admin-only data).

import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data/settings-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getSettings();
    return NextResponse.json({
      maintenanceMode: s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage,
      announcementActive: s.announcementActive,
      announcementText: s.announcementText,
      announcementType: s.announcementType,
      registrationOpen: s.registrationOpen,
    });
  } catch (err) {
    console.error("[api] GET /api/settings:", err);
    // Return safe defaults on error so the app keeps working
    return NextResponse.json({
      maintenanceMode: false,
      maintenanceMessage: "",
      announcementActive: false,
      announcementText: "",
      announcementType: "info",
      registrationOpen: true,
    });
  }
}
