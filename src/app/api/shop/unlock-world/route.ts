// POST /api/shop/unlock-world  { gameId } → { balance }

import { NextRequest } from "next/server";
import { z } from "zod";
import { unlockWorld } from "@/lib/rewards/shop-service";
import { handleShopPost } from "@/lib/rewards/shop-route";

export const dynamic = "force-dynamic";

const schema = z.object({ gameId: z.string().min(1).max(200) });

export function POST(request: NextRequest) {
  return handleShopPost(request, schema, "POST /api/shop/unlock-world", (user, body) =>
    unlockWorld(user.id, body.gameId),
  );
}
