// Server-only platform settings data access (Supabase).
// The platform_settings table enforces a single row via CHECK (id = 1).

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementActive: boolean;
  announcementText: string;
  announcementType: "info" | "warning" | "success";
  registrationOpen: boolean;
  featuredSectionTitle: string;
  maxLeaderboardEntries: number;
  defaultDifficultyFilter: "all" | "easy" | "medium" | "hard";
  updatedAt: string;
  updatedBy: string | null;
}

export type SettingsUpdate = Partial<Omit<PlatformSettings, "updatedAt" | "updatedBy">>;

interface SettingsRow {
  id: number;
  maintenance_mode: boolean;
  maintenance_message: string;
  announcement_active: boolean;
  announcement_text: string;
  announcement_type: "info" | "warning" | "success";
  registration_open: boolean;
  featured_section_title: string;
  max_leaderboard_entries: number;
  default_difficulty_filter: "all" | "easy" | "medium" | "hard";
  updated_at: string;
  updated_by: string | null;
}

function toSettings(row: SettingsRow): PlatformSettings {
  return {
    maintenanceMode: row.maintenance_mode,
    maintenanceMessage: row.maintenance_message,
    announcementActive: row.announcement_active,
    announcementText: row.announcement_text,
    announcementType: row.announcement_type,
    registrationOpen: row.registration_open,
    featuredSectionTitle: row.featured_section_title,
    maxLeaderboardEntries: row.max_leaderboard_entries,
    defaultDifficultyFilter: row.default_difficulty_filter,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export async function getSettings(): Promise<PlatformSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error(`[supabase] getSettings: ${error.message}`);
  return toSettings(data as SettingsRow);
}

export async function updateSettings(
  patch: SettingsUpdate,
  updatedBy: string,
): Promise<PlatformSettings> {
  const dbPatch: Partial<Omit<SettingsRow, "id">> = {};

  if (patch.maintenanceMode !== undefined) dbPatch.maintenance_mode = patch.maintenanceMode;
  if (patch.maintenanceMessage !== undefined) dbPatch.maintenance_message = patch.maintenanceMessage;
  if (patch.announcementActive !== undefined) dbPatch.announcement_active = patch.announcementActive;
  if (patch.announcementText !== undefined) dbPatch.announcement_text = patch.announcementText;
  if (patch.announcementType !== undefined) dbPatch.announcement_type = patch.announcementType;
  if (patch.registrationOpen !== undefined) dbPatch.registration_open = patch.registrationOpen;
  if (patch.featuredSectionTitle !== undefined) dbPatch.featured_section_title = patch.featuredSectionTitle;
  if (patch.maxLeaderboardEntries !== undefined) dbPatch.max_leaderboard_entries = patch.maxLeaderboardEntries;
  if (patch.defaultDifficultyFilter !== undefined) dbPatch.default_difficulty_filter = patch.defaultDifficultyFilter;

  dbPatch.updated_at = new Date().toISOString();
  dbPatch.updated_by = updatedBy;

  const { data, error } = await getSupabaseAdmin()
    .from("platform_settings")
    .update(dbPatch)
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw new Error(`[supabase] updateSettings: ${error.message}`);
  return toSettings(data as SettingsRow);
}
