'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export async function getRevenue() {
  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  // Status 2 = confirmed, Status 4 = exchanged (money stays, products swapped)
  // Status 3 = refunded (money returned to customer) — excluded
  const posResult: any[] = allShops
    ? await prisma.$queryRaw`
        SELECT COALESCE(SUM(CAST(grand_total AS DOUBLE)), 0) AS total
        FROM tbl_order
        WHERE order_status IN (2, 4)
      `
    : await prisma.$queryRaw`
        SELECT COALESCE(SUM(CAST(grand_total AS DOUBLE)), 0) AS total
        FROM tbl_order
        WHERE order_status IN (2, 4) AND shop_id = ${scope.shopId}
      `

  // Tailor income is cash-basis, not order-total-basis: a tailor order's
  // full price isn't "revenue" the moment it's placed, since a customer
  // might only ever pay the advance. advance_paid is updated every time a
  // payment is actually recorded (RecordTailorPayment), so summing it
  // directly reflects money that's actually come in, the same way a POS
  // sale's grand_total reflects money collected at checkout.
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

  return Number(posResult[0]?.total || 0) + Number(tailorResult[0]?.total || 0)
}
