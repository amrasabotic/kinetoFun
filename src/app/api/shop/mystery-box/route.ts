// POST /api/shop/mystery-box  {} → { item, balance }

import { NextRequest } from "next/server";
import { z } from "zod";
import { openMysteryBox } from "@/lib/rewards/shop-service";
import { handleShopPost } from "@/lib/rewards/shop-route";

export const dynamic = "force-dynamic";

const schema = z.object({});

export function POST(request: NextRequest) {
  return handleShopPost(request, schema, "POST /api/shop/mystery-box", (user) =>
    openMysteryBox(user.id),
  );
}
