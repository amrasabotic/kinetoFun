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
  Ticket,
  Lock,
  Tv,
} from "lucide-react";
import type { AuditLog } from "@/types";
import { getMessages, type Locale } from "@/lib/i18n";

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
  "game.secret_world_updated": { icon: <Lock className={ICON} />, tint: "amber", label: "Updated secret world" },
  "game.tv_ready_updated": { icon: <Tv className={ICON} />, tint: "sky", label: "Changed TV listing" },
  "user.role_updated": { icon: <UserCog className={ICON} />, tint: "sky", label: "Updated user role" },
  "user.deleted": { icon: <UserX className={ICON} />, tint: "rose", label: "Deleted user" },
  "user.tickets_adjusted": { icon: <Ticket className={ICON} />, tint: "amber", label: "Adjusted tickets" },
  "user.registered": { icon: <Gamepad2 className={ICON} />, tint: "sky", label: "Registered" },
  "leaderboard.score_deleted": { icon: <Trash2 className={ICON} />, tint: "rose", label: "Deleted score" },
  "leaderboard.reset": { icon: <RotateCcw className={ICON} />, tint: "rose", label: "Reset leaderboard" },
  "subscription.granted": { icon: <CreditCard className={ICON} />, tint: "emerald", label: "Granted pro subscription" },
  "subscription.revoked": { icon: <CreditCard className={ICON} />, tint: "amber", label: "Revoked subscription" },
  "settings.updated": { icon: <Settings className={ICON} />, tint: "violet", label: "Updated platform settings" },
};

export function auditMeta(action: string, locale: Locale = "en"): AuditMeta {
  const meta = MAP[action] ?? { icon: <Activity className={ICON} />, tint: "slate", label: action };
  return { ...meta, label: getMessages(locale).admin.audit.labels[action] ?? meta.label };
}

/** Build a readable sentence describing the log's details. */
export function auditSentence(
  log: Pick<AuditLog, "action" | "details" | "entityType">,
  locale: Locale = "en",
): string {
  const d = log.details ?? {};
  const name = (d.name as string) || (d.title as string) || (d.email as string);
  const sentence = getMessages(locale).admin.audit.sentence(log.action, {
    name: name || undefined,
    count: d.count as number | undefined,
    unlockCost: d.unlockCost as number | undefined,
    tvReady: Boolean(d.tvReady),
    role: d.role as string | undefined,
    delta: Number(d.delta ?? 0),
  });
  return sentence ?? auditMeta(log.action, locale).label;
}
