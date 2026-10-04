'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export type MonthlyRevenuePoint = { month: string; pos: number; tailor: number; total: number }

export async function getMonthlyRevenue(monthsBack: number = 12): Promise<MonthlyRevenuePoint[]> {
  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1))

  // DATE_FORMAT forces MySQL to hand back a plain "YYYY-MM" string, so
  // there's no ambiguity about which timezone it should be read in once
  // it reaches JS — the same reasoning getRevenueTrend.ts uses for days.
  const posRows: any[] = allShops
    ? await prisma.$queryRaw`
        SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COALESCE(SUM(CAST(grand_total AS DOUBLE)), 0) AS total
        FROM tbl_order
        WHERE order_status IN (2, 4) AND order_date >= ${start}
        GROUP BY DATE_FORMAT(order_date, '%Y-%m')
      `
    : await prisma.$queryRaw`
        SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COALESCE(SUM(CAST(grand_total AS DOUBLE)), 0) AS total
        FROM tbl_order
        WHERE order_status IN (2, 4) AND order_date >= ${start} AND shop_id = ${scope.shopId}
        GROUP BY DATE_FORMAT(order_date, '%Y-%m')
      `

  // Cash-basis, same as getRevenue.ts and getSalesByPeriod.ts — sums
  // what's actually been paid on tailor orders, not their full value.
  const tailorRows: any[] = allShops
    ? await prisma.$queryRaw`
        SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COALESCE(SUM(CAST(advance_paid AS DOUBLE)), 0) AS total
        FROM tbl_tailor_order
        WHERE status != 'cancelled' AND order_date >= ${start}
        GROUP BY DATE_FORMAT(order_date, '%Y-%m')
      `
    : await prisma.$queryRaw`
        SELECT DATE_FORMAT(order_date, '%Y-%m') AS ym, COALESCE(SUM(CAST(advance_paid AS DOUBLE)), 0) AS total
        FROM tbl_tailor_order
        WHERE status != 'cancelled' AND order_date >= ${start} AND shop_id = ${scope.shopId}
        GROUP BY DATE_FORMAT(order_date, '%Y-%m')
      `

  const posByMonth = new Map<string, number>(posRows.map((r) => [String(r.ym), Number(r.total)]))
  const tailorByMonth = new Map<string, number>(tailorRows.map((r) => [String(r.ym), Number(r.total)]))

  const points: MonthlyRevenuePoint[] = []
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    const pos = posByMonth.get(ym) || 0
    const tailor = tailorByMonth.get(ym) || 0
    points.push({ month: label, pos, tailor, total: pos + tailor })
  }

  return points
}
