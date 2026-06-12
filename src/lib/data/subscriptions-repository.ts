// Server-only subscription data access (Supabase).
// Guarded by getSuperAdminUser() in route handlers.

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface AdminSubscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  status: string;
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

export interface SubscriptionSummary {
  totalPro: number;
  activeSubscriptions: number;
  manualGrants: number;
  providerManaged: number;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  // Supabase FK-join returns an array (or null) for related rows
  users: { name: string; email: string }[] | { name: string; email: string } | null;
}

function toAdminSubscription(row: SubscriptionRow): AdminSubscription {
  const user = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id: row.id,
    userId: row.user_id,
    userName: user?.name ?? "Unknown",
    userEmail: user?.email ?? "",
    plan: row.plan,
    status: row.status,
    provider: row.provider,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
  };
}

export async function listAllSubscriptions(): Promise<AdminSubscription[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("subscriptions")
    .select(
      `id, user_id, plan, status, provider,
       provider_customer_id, provider_subscription_id,
       current_period_end, created_at,
       users ( name, email )`,
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`[supabase] listAllSubscriptions: ${error.message}`);
  return (data as SubscriptionRow[]).map(toAdminSubscription);
}

export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const db = getSupabaseAdmin();
  const head = { count: "exact" as const, head: true };
  const [totalPro, activeSubscriptions, manualGrants, providerManaged] =
    await Promise.all([
      db.from("subscriptions").select("*", head).eq("plan", "pro"),
      db.from("subscriptions").select("*", head).eq("status", "active"),
      db.from("subscriptions").select("*", head).eq("provider", "manual"),
      db
        .from("subscriptions")
        .select("*", head)
        .not("provider", "is", null)
        .neq("provider", "manual"),
    ]);
  return {
    totalPro: totalPro.count ?? 0,
    activeSubscriptions: activeSubscriptions.count ?? 0,
    manualGrants: manualGrants.count ?? 0,
    providerManaged: providerManaged.count ?? 0,
  };
}

export async function grantProSubscription(
  userId: string,
): Promise<AdminSubscription> {
  const db = getSupabaseAdmin();

  // Check for an existing row for this user
  const { data: existing } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  let result;
  if (existing) {
    result = await db
      .from("subscriptions")
      .update({ plan: "pro", status: "active", provider: "manual" })
      .eq("id", existing.id)
      .select(
        `id, user_id, plan, status, provider,
         provider_customer_id, provider_subscription_id,
         current_period_end, created_at,
         users ( name, email )`,
      )
      .single();
  } else {
    result = await db
      .from("subscriptions")
      .insert({ user_id: userId, plan: "pro", status: "active", provider: "manual" })
      .select(
        `id, user_id, plan, status, provider,
         provider_customer_id, provider_subscription_id,
         current_period_end, created_at,
         users ( name, email )`,
      )
      .single();
  }

  if (result.error) throw new Error(`[supabase] grantProSubscription: ${result.error.message}`);
  return toAdminSubscription(result.data as SubscriptionRow);
}

export async function revokeSubscription(id: string): Promise<AdminSubscription> {
  const { data, error } = await getSupabaseAdmin()
    .from("subscriptions")
    .update({ status: "inactive" })
    .eq("id", id)
    .select(
      `id, user_id, plan, status, provider,
       provider_customer_id, provider_subscription_id,
       current_period_end, created_at,
       users ( name, email )`,
    )
    .single();
  if (error) throw new Error(`[supabase] revokeSubscription: ${error.message}`);
  return toAdminSubscription(data as SubscriptionRow);
}
