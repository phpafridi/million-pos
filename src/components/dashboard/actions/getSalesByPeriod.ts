'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

async function sumSince(since: Date, allShops: boolean, shopId: number | null): Promise<number> {
  const result: any[] = allShops
    ? await prisma.$queryRaw`SELECT COALESCE(SUM(CAST(grand_total AS DOUBLE)),0) AS v FROM tbl_order WHERE order_status IN (2,4) AND order_date >= ${since}`
    : await prisma.$queryRaw`SELECT COALESCE(SUM(CAST(grand_total AS DOUBLE)),0) AS v FROM tbl_order WHERE order_status IN (2,4) AND order_date >= ${since} AND shop_id = ${shopId}`
  return Number(result[0]?.v || 0)
}

export async function getSalesByPeriod() {
  const now = new Date()
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek  = new Date(startOfDay)
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear  = new Date(now.getFullYear(), 0, 1)

  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  // Status 2 = confirmed, Status 4 = exchanged (money kept)
  const [daily, weekly, monthly, yearly] = await Promise.all([
    sumSince(startOfDay, allShops, scope.shopId),
    sumSince(startOfWeek, allShops, scope.shopId),
    sumSince(startOfMonth, allShops, scope.shopId),
    sumSince(startOfYear, allShops, scope.shopId),
  ])

  return {
    dailySales:   daily,
    weeklySales:  weekly,
    monthlySales: monthly,
    yearlySales:  yearly,
  }
}
