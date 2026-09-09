import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type ShopScope = {
  shopId: number | null; // null = super admin, sees every shop
  isSuperAdmin: boolean;
  isShopAdmin: boolean; // flag === '1': franchise admin, full access within their own shop
  isWarehouse: boolean; // this shop is flagged as a warehouse — can send stock transfers, independent of Head Office
};

/**
 * Resolves the current session's shop scope for use in API routes.
 *
 * Usage:
 *   const scope = await getShopScope();
 *   const where = scopeWhere(scope); // {} for super admin, { shop_id } otherwise
 *   const rows = await prisma.tbl_order.findMany({ where });
 */
export async function getShopScope(): Promise<ShopScope> {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { shop_id?: number | null; is_super_admin?: boolean; flag?: string | null; is_warehouse?: boolean }
    | undefined;

  return {
    shopId: user?.shop_id ?? null,
    isSuperAdmin: Boolean(user?.is_super_admin),
    isShopAdmin: user?.flag === '1',
    isWarehouse: Boolean(user?.is_warehouse),
  };
}

/**
 * True for Head Office (super admin) or a franchise admin (flag === '1')
 * managing their own shop. False for regular staff — staff should never
 * be able to create, edit, or delete other user accounts, even within
 * their own shop.
 */
export function canManageUsers(scope: ShopScope): boolean {
  return scope.isSuperAdmin || scope.isShopAdmin;
}

/**
 * Builds a `{ shop_id }` where-clause fragment for a scoped query.
 * Super admins (or requests with no session yet, e.g. during setup)
 * get an empty filter, meaning "all shops". Use this for list-style
 * reports (orders, purchases, customers, etc.) where a CEO seeing
 * every shop's rows combined is the correct behavior.
 */
export function scopeWhere(scope: ShopScope): { shop_id?: number } {
  if (scope.isSuperAdmin || scope.shopId === null) return {};
  return { shop_id: scope.shopId };
}

/**
 * Builds a `{ shop_id }` filter that ALWAYS resolves to exactly one shop,
 * even for a super admin. Use this for includes/queries that expect a
 * single row per product — inventory quantity, product price — such as
 * the POS product list or a purchase entry screen. Returning every
 * shop's inventory row there would make `inventories[0]` pick an
 * arbitrary shop's stock/price rather than a real number.
 */
export function scopeWhereSingleShop(scope: ShopScope, fallback = 1): { shop_id: number } {
  return { shop_id: scope.shopId ?? fallback };
}

/**
 * The shop_id to stamp onto newly created rows. Falls back to the Head
 * Office (1) for super admins creating data with no shop context, since
 * every transactional row must belong to some shop.
 */
export function scopeShopIdForWrite(scope: ShopScope, fallback = 1): number {
  return scope.shopId ?? fallback;
}
