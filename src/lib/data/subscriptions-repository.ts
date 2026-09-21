// Server-only subscription data access (Postgres via pg).

import { execute, query, queryCount, queryOne } from "@/lib/db/server";

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

interface SubscriptionJoinRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

function toAdminSubscription(row: SubscriptionJoinRow): AdminSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? "Unknown",
    userEmail: row.user_email ?? "",
    plan: row.plan,
    status: row.status,
    provider: row.provider,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
  };
}

const SELECT_JOIN = `
  SELECT s.id, s.user_id, s.plan, s.status, s.provider,
         s.provider_customer_id, s.provider_subscription_id,
         s.current_period_end, s.created_at,
         u.name AS user_name, u.email AS user_email
  FROM public.subscriptions s
  LEFT JOIN public.users u ON u.id = s.user_id
`;

export async function listAllSubscriptions(): Promise<AdminSubscription[]> {
  const rows = await query<SubscriptionJoinRow>(
    `${SELECT_JOIN} ORDER BY s.created_at DESC`,
  );
  return rows.map(toAdminSubscription);
}

export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const [totalPro, activeSubscriptions, manualGrants, providerManaged] =
    await Promise.all([
      queryCount(
        `SELECT COUNT(*)::int AS count FROM public.subscriptions WHERE plan = 'pro'`,
      ),
      queryCount(
        `SELECT COUNT(*)::int AS count FROM public.subscriptions WHERE status = 'active'`,
      ),
      queryCount(
        `SELECT COUNT(*)::int AS count FROM public.subscriptions WHERE provider = 'manual'`,
      ),
      queryCount(
        `SELECT COUNT(*)::int AS count FROM public.subscriptions
         WHERE provider IS NOT NULL AND provider <> 'manual'`,
      ),
    ]);
  return { totalPro, activeSubscriptions, manualGrants, providerManaged };
}

export async function grantProSubscription(
  userId: string,
): Promise<AdminSubscription> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM public.subscriptions WHERE user_id = $1 LIMIT 1`,
    [userId],
  );

  let row: SubscriptionJoinRow | null;
  if (existing) {
    await execute(
      `UPDATE public.subscriptions
       SET plan = 'pro', status = 'active', provider = 'manual'
       WHERE id = $1`,
      [existing.id],
    );
    row = await queryOne<SubscriptionJoinRow>(
      `${SELECT_JOIN} WHERE s.id = $1`,
      [existing.id],
    );
  } else {
    const inserted = await queryOne<{ id: string }>(
      `INSERT INTO public.subscriptions (user_id, plan, status, provider)
       VALUES ($1, 'pro', 'active', 'manual')
       RETURNING id`,
      [userId],
    );
    if (!inserted) throw new Error("[db] grantProSubscription: insert failed");
    row = await queryOne<SubscriptionJoinRow>(
      `${SELECT_JOIN} WHERE s.id = $1`,
      [inserted.id],
    );
  }

  if (!row) throw new Error("[db] grantProSubscription: no row returned");
  return toAdminSubscription(row);
}

export async function revokeSubscription(
  id: string,
): Promise<AdminSubscription> {
  await execute(
    `UPDATE public.subscriptions SET status = 'inactive' WHERE id = $1`,
    [id],
  );
  const row = await queryOne<SubscriptionJoinRow>(
    `${SELECT_JOIN} WHERE s.id = $1`,
    [id],
  );
  if (!row) throw new Error("[db] revokeSubscription: not found");
  return toAdminSubscription(row);
}
