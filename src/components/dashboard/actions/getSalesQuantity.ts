'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export async function getSalesQuantity() {
  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  // Count confirmed + exchanged orders (both represent completed sales)
  const result: any[] = allShops
    ? await prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM tbl_order WHERE order_status IN (2, 4)`
    : await prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM tbl_order WHERE order_status IN (2, 4) AND shop_id = ${scope.shopId}`
  return Number(result[0]?.cnt || 0)
}
