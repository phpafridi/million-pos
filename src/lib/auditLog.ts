import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getShopScope, scopeWhere, type ShopScope } from "@/lib/getShopScope";

type LogActivityInput = {
  action: string;        // e.g. 'sale.create', 'refund.process', 'order.cancel'
  entityType: string;    // e.g. 'order', 'return', 'ledger', 'product', 'user'
  entityId: string | number;
  description: string;   // human-readable summary shown in the Head Office log
  shopIdOverride?: number; // for platform-level actions or when acting-as another shop
};

/**
 * Records an entry in the activity log for Head Office to review.
 * Never throws — logging failures must not break the operation they're
 * attached to. Call this AFTER the underlying action succeeds.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { email?: string; name?: string; shop_id?: number | null } | undefined;

    const shop_id = input.shopIdOverride ?? user?.shop_id ?? null;

    await prisma.tbl_activity_log.create({
      data: {
        shop_id,
        user_email: user?.email || "unknown",
        user_name: user?.name || user?.email || "Unknown",
        action: input.action,
        entity_type: input.entityType,
        entity_id: String(input.entityId),
        description: input.description,
      },
    });
  } catch (err) {
    console.error("Failed to write activity log (non-fatal):", err);
  }
}

export type ActivityLogRow = {
  log_id: number;
  shop_id: number | null;
  shop_name?: string | null;
  user_email: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  created_at: Date;
};

/**
 * Fetch activity log entries for the Head Office review screen.
 * Non-super-admins are restricted to their own shop, same as every other
 * report — the log itself is also a shop-scoped resource.
 */
export async function fetchActivityLog(filters: {
  shopId?: number;
  action?: string;
  userEmail?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<ActivityLogRow[]> {
  const scope = await getShopScope();
  const baseWhere = scopeWhere(scope);

  const where: any = { ...baseWhere };
  if (filters.shopId) where.shop_id = filters.shopId; // super admin narrowing to one shop
  if (filters.action) where.action = filters.action;
  if (filters.userEmail) where.user_email = { contains: filters.userEmail };
  if (filters.startDate || filters.endDate) {
    where.created_at = {};
    if (filters.startDate) where.created_at.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at.lte = end;
    }
  }

  const rows = await prisma.tbl_activity_log.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: filters.limit ?? 200,
    include: { shop: { select: { shop_name: true } } },
  });

  return rows.map((r) => ({
    log_id: r.log_id,
    shop_id: r.shop_id,
    shop_name: r.shop?.shop_name ?? null,
    user_email: r.user_email,
    user_name: r.user_name,
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    description: r.description,
    created_at: r.created_at,
  }));
}
