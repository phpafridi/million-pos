'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export async function getProfit() {
  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  // Status 2 = confirmed, Status 4 = exchanged (revenue kept)
  // Status 3 = refunded — excluded
  const posResult: any[] = allShops
    ? await prisma.$queryRaw`
        SELECT
          COALESCE(SUM(CAST(grand_total      AS DOUBLE)), 0) AS total,
          COALESCE(SUM(CAST(total_tax        AS DOUBLE)), 0) AS tax,
          COALESCE(SUM(CAST(discount_amount  AS DOUBLE)), 0) AS discount
        FROM tbl_order
        WHERE order_status IN (2, 4)
      `
    : await prisma.$queryRaw`
        SELECT
          COALESCE(SUM(CAST(grand_total      AS DOUBLE)), 0) AS total,
          COALESCE(SUM(CAST(total_tax        AS DOUBLE)), 0) AS tax,
          COALESCE(SUM(CAST(discount_amount  AS DOUBLE)), 0) AS discount
        FROM tbl_order
        WHERE order_status IN (2, 4) AND shop_id = ${scope.shopId}
      `
  const row = posResult[0] || {}
  const posProfit = Number(row.total || 0) - Number(row.tax || 0) - Number(row.discount || 0)

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
