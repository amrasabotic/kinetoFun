// Server-only platform settings data access (Postgres via pg).

import { queryOne } from "@/lib/db/server";

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

export type SettingsUpdate = Partial<
  Omit<PlatformSettings, "updatedAt" | "updatedBy">
>;

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

const DEFAULT_SETTINGS: PlatformSettings = {
  maintenanceMode: false,
  maintenanceMessage:
    "We're performing scheduled maintenance. We'll be back shortly.",
  announcementActive: false,
  announcementText: "",
  announcementType: "info",
  registrationOpen: true,
  featuredSectionTitle: "Featured Games",
  maxLeaderboardEntries: 10,
  defaultDifficultyFilter: "all",
  updatedAt: new Date(0).toISOString(),
  updatedBy: null,
};

export async function getSettings(): Promise<PlatformSettings> {
  const row = await queryOne<SettingsRow>(
    `SELECT * FROM public.platform_settings WHERE id = 1`,
  );
  if (!row) return DEFAULT_SETTINGS;
  return toSettings(row);
}

export async function updateSettings(
  patch: SettingsUpdate,
  updatedBy: string,
): Promise<PlatformSettings> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const map: [keyof SettingsUpdate, string][] = [
    ["maintenanceMode", "maintenance_mode"],
    ["maintenanceMessage", "maintenance_message"],
    ["announcementActive", "announcement_active"],
    ["announcementText", "announcement_text"],
    ["announcementType", "announcement_type"],
    ["registrationOpen", "registration_open"],
    ["featuredSectionTitle", "featured_section_title"],
    ["maxLeaderboardEntries", "max_leaderboard_entries"],
    ["defaultDifficultyFilter", "default_difficulty_filter"],
  ];

  for (const [key, col] of map) {
    if (patch[key] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(patch[key]);
    }
  }

  fields.push(`updated_at = $${i++}`);
  values.push(new Date().toISOString());
  fields.push(`updated_by = $${i++}`);
  values.push(updatedBy);

  const row = await queryOne<SettingsRow>(
    `UPDATE public.platform_settings SET ${fields.join(", ")} WHERE id = 1 RETURNING *`,
    values,
  );
  if (!row) throw new Error("[db] updateSettings: not found");
  return toSettings(row);
}
