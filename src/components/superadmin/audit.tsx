"use client";

// Shared helpers for rendering audit-log actions consistently across the
// dashboard activity feed and the audit-logs page.

import type { ReactNode } from "react";
import {
  FolderPlus,
  FolderCog,
  FolderX,
  Eye,
  EyeOff,
  ArrowUpDown,
  Gamepad2,
  Plus,
  Pencil,
  Trash2,
  Send,
  Archive,
  Layers,
  UserCog,
  UserX,
  Activity,
  CreditCard,
  RotateCcw,
  Settings,
} from "lucide-react";
import type { AuditLog } from "@/types";

type Tint = "violet" | "emerald" | "amber" | "rose" | "sky" | "slate";

export interface AuditMeta {
  icon: ReactNode;
  tint: Tint;
  /** Short human label, e.g. "Created category". */
  label: string;
}

const ICON = "h-4 w-4";

const MAP: Record<string, AuditMeta> = {
  "category.created": { icon: <FolderPlus className={ICON} />, tint: "emerald", label: "Created category" },
  "category.updated": { icon: <FolderCog className={ICON} />, tint: "violet", label: "Updated category" },
  "category.deleted": { icon: <FolderX className={ICON} />, tint: "rose", label: "Deleted category" },
  "category.enabled": { icon: <Eye className={ICON} />, tint: "emerald", label: "Enabled category" },
  "category.disabled": { icon: <EyeOff className={ICON} />, tint: "amber", label: "Disabled category" },
  "category.reordered": { icon: <ArrowUpDown className={ICON} />, tint: "slate", label: "Reordered categories" },
  "game.created": { icon: <Plus className={ICON} />, tint: "emerald", label: "Created game" },
  "game.updated": { icon: <Pencil className={ICON} />, tint: "violet", label: "Updated game" },
  "game.published": { icon: <Send className={ICON} />, tint: "emerald", label: "Published game" },
  "game.archived": { icon: <Archive className={ICON} />, tint: "amber", label: "Archived game" },
  "game.deleted": { icon: <Trash2 className={ICON} />, tint: "rose", label: "Deleted game" },
  "game.bulk_publish": { icon: <Send className={ICON} />, tint: "emerald", label: "Bulk published games" },
  "game.bulk_archive": { icon: <Archive className={ICON} />, tint: "amber", label: "Bulk archived games" },
  "game.bulk_draft": { icon: <Layers className={ICON} />, tint: "slate", label: "Bulk drafted games" },
  "game.bulk_delete": { icon: <Trash2 className={ICON} />, tint: "rose", label: "Bulk deleted games" },
  "game.bulk_category": { icon: <Layers className={ICON} />, tint: "violet", label: "Bulk recategorized games" },
  "user.role_updated": { icon: <UserCog className={ICON} />, tint: "sky", label: "Updated user role" },
  "user.deleted": { icon: <UserX className={ICON} />, tint: "rose", label: "Deleted user" },
  "user.registered": { icon: <Gamepad2 className={ICON} />, tint: "sky", label: "Registered" },
  "leaderboard.score_deleted": { icon: <Trash2 className={ICON} />, tint: "rose", label: "Deleted score" },
  "leaderboard.reset": { icon: <RotateCcw className={ICON} />, tint: "rose", label: "Reset leaderboard" },
  "subscription.granted": { icon: <CreditCard className={ICON} />, tint: "emerald", label: "Granted pro subscription" },
  "subscription.revoked": { icon: <CreditCard className={ICON} />, tint: "amber", label: "Revoked subscription" },
  "settings.updated": { icon: <Settings className={ICON} />, tint: "violet", label: "Updated platform settings" },
};

export function auditMeta(action: string): AuditMeta {
  return MAP[action] ?? { icon: <Activity className={ICON} />, tint: "slate", label: action };
}

/** Build a readable sentence describing the log's details. */
export function auditSentence(log: Pick<AuditLog, "action" | "details" | "entityType">): string {
  const d = log.details ?? {};
  const name = (d.name as string) || (d.title as string) || (d.email as string);
  const count = d.count as number | undefined;
  switch (log.action) {
    case "category.created":
      return `Created category${name ? ` “${name}”` : ""}`;
    case "category.updated":
      return `Updated category${name ? ` “${name}”` : ""}`;
    case "category.deleted":
      return `Deleted category${name ? ` “${name}”` : ""}`;
    case "category.enabled":
      return `Enabled category${name ? ` “${name}”` : ""}`;
    case "category.disabled":
      return `Disabled category${name ? ` “${name}”` : ""}`;
    case "category.reordered":
      return `Reordered ${count ?? ""} categories`.trim();
    case "game.created":
      return `Created game${name ? ` “${name}”` : ""}`;
    case "game.updated":
      return `Updated game${name ? ` “${name}”` : ""}`;
    case "game.published":
      return `Published game${name ? ` “${name}”` : ""}`;
    case "game.archived":
      return `Archived game${name ? ` “${name}”` : ""}`;
    case "game.deleted":
      return `Deleted a game`;
    case "game.bulk_publish":
      return `Published ${count ?? "multiple"} games`;
    case "game.bulk_archive":
      return `Archived ${count ?? "multiple"} games`;
    case "game.bulk_delete":
      return `Deleted ${count ?? "multiple"} games`;
    case "game.bulk_category":
      return `Recategorized ${count ?? "multiple"} games`;
    case "user.role_updated":
      return `Set ${name ?? "a user"} to ${(d.role as string) ?? "a new role"}`;
    case "user.deleted":
      return `Deleted a user account`;
    case "user.registered":
      return `${name ?? "A new user"} registered an account`;
    case "leaderboard.score_deleted":
      return `Deleted a score from leaderboard`;
    case "leaderboard.reset":
      return `Reset leaderboard for a game`;
    case "subscription.granted":
      return `Granted pro subscription to ${name ?? "a user"}`;
    case "subscription.revoked":
      return `Revoked subscription for ${name ?? "a user"}`;
    case "settings.updated":
      return `Updated platform settings`;
    default:
      return auditMeta(log.action).label;
  }
}
