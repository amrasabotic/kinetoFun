// POST /api/shop/buy  { itemId } → { item, balance }

import { NextRequest } from "next/server";
import { z } from "zod";
import { buyItem } from "@/lib/rewards/shop-service";
import { handleShopPost } from "@/lib/rewards/shop-route";

export const dynamic = "force-dynamic";

const schema = z.object({ itemId: z.string().min(1).max(100) });

export function POST(request: NextRequest) {
  return handleShopPost(request, schema, "POST /api/shop/buy", (user, body) =>
    buyItem(user.id, body.itemId),
  );
}
