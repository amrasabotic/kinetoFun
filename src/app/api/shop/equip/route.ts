// POST /api/shop/equip  { slot: "avatar" | "frame" | "banner", itemId: string | null } → { ok }

import { NextRequest } from "next/server";
import { z } from "zod";
import { equipItem } from "@/lib/rewards/shop-service";
import { handleShopPost } from "@/lib/rewards/shop-route";

export const dynamic = "force-dynamic";

const schema = z.object({
  slot: z.enum(["avatar", "frame", "banner"]),
  itemId: z.string().min(1).max(100).nullable(),
});

export function POST(request: NextRequest) {
  return handleShopPost(request, schema, "POST /api/shop/equip", async (user, body) => {
    await equipItem(user.id, body.slot, body.itemId);
    return { ok: true };
  });
}
