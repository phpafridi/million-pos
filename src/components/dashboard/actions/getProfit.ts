'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { posProfitByShop } from '@/lib/posProfit'

export async function getProfit() {
  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  // Real profit — selling − cost − discount, after refunds (same formula as
  // the Sales Report). The old version used grand_total − tax − discount,
  // which never subtracted the cost of goods and took the discount off twice.
  const byShop = await posProfitByShop()
  const posProfit = allShops
    ? [...byShop.values()].reduce((s, v) => s + v, 0)
    : (byShop.get(scope.shopId ?? -1) ?? 0)

  // Tailor payments have no separate tax/discount tracked — cash received
  // (advance_paid) is treated as profit directly, same cash-basis logic
  // as getRevenue().
  const tailorResult: any[] = allShops
    ? await prisma.$queryRaw`
        SELECT COALESCE(SUM(CAST(advance_paid AS DOUBLE)), 0) AS total
        FROM tbl_tailor_order
        WHERE status != 'cancelled'
      `
    : await prisma.$queryRaw`
        SELECT COALESCE(SUM(CAST(advance_paid AS DOUBLE)), 0) AS total
        FROM tbl_tailor_order
        WHERE status != 'cancelled' AND shop_id = ${scope.shopId}
      `
  const tailorProfit = Number(tailorResult[0]?.total || 0)

  return posProfit + tailorProfit
}
