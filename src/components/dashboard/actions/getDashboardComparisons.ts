'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export type KpiComparison = {
  current: number
  previous: number
  percentChange: number // positive = up, negative = down
}

async function revenueBetween(start: Date, end: Date, allShops: boolean, shopId: number | null): Promise<number> {
  const result: any[] = allShops
    ? await prisma.$queryRaw`
        SELECT COALESCE(SUM(CAST(grand_total AS DOUBLE)), 0) AS total
        FROM tbl_order
        WHERE order_status IN (2, 4) AND order_date >= ${start} AND order_date < ${end}
      `
    : await prisma.$queryRaw`
        SELECT COALESCE(SUM(CAST(grand_total AS DOUBLE)), 0) AS total
        FROM tbl_order
        WHERE order_status IN (2, 4) AND order_date >= ${start} AND order_date < ${end} AND shop_id = ${shopId}
      `
  return Number(result[0]?.total || 0)
}

async function purchasesBetween(start: Date, end: Date, allShops: boolean, shopId: number | null): Promise<number> {
  const result: any[] = allShops
    ? await prisma.$queryRaw`
        SELECT COALESCE(SUM(CAST(grand_total AS DOUBLE)), 0) AS total
        FROM tbl_purchase
        WHERE datetime >= ${start} AND datetime < ${end}
      `
    : await prisma.$queryRaw`
        SELECT COALESCE(SUM(CAST(grand_total AS DOUBLE)), 0) AS total
        FROM tbl_purchase
        WHERE datetime >= ${start} AND datetime < ${end} AND shop_id = ${shopId}
      `
  return Number(result[0]?.total || 0)
}

async function orderCountBetween(start: Date, end: Date, allShops: boolean, shopId: number | null): Promise<number> {
  const result: any[] = allShops
    ? await prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM tbl_order WHERE order_status IN (2, 4) AND order_date >= ${start} AND order_date < ${end}`
    : await prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM tbl_order WHERE order_status IN (2, 4) AND order_date >= ${start} AND order_date < ${end} AND shop_id = ${shopId}`
  return Number(result[0]?.cnt || 0)
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export type DashboardComparisons = {
  revenue: KpiComparison
  purchases: KpiComparison
  orders: KpiComparison
}

/** This month vs last month, for the percentage-change badges on the Head Office dashboard. */
export async function getDashboardComparisons(): Promise<DashboardComparisons> {
  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    revThis, revLast,
    purThis, purLast,
    ordThis, ordLast,
  ] = await Promise.all([
    revenueBetween(startOfThisMonth, startOfNextMonth, allShops, scope.shopId),
    revenueBetween(startOfLastMonth, startOfThisMonth, allShops, scope.shopId),
    purchasesBetween(startOfThisMonth, startOfNextMonth, allShops, scope.shopId),
    purchasesBetween(startOfLastMonth, startOfThisMonth, allShops, scope.shopId),
    orderCountBetween(startOfThisMonth, startOfNextMonth, allShops, scope.shopId),
    orderCountBetween(startOfLastMonth, startOfThisMonth, allShops, scope.shopId),
  ])

  return {
    revenue: { current: revThis, previous: revLast, percentChange: pctChange(revThis, revLast) },
    purchases: { current: purThis, previous: purLast, percentChange: pctChange(purThis, purLast) },
    orders: { current: ordThis, previous: ordLast, percentChange: pctChange(ordThis, ordLast) },
  }
}
