'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

// One point per day; each active shop gets its own key (by shop_name) so
// the chart can draw one line per franchise, clearly labeled.
export type DailyRevenuePoint = { date: string; [shopName: string]: number | string }

// Builds a "YYYY-MM-DD" string for (today - offsetDays), using pure UTC
// arithmetic throughout — never a local-timezone Date method, and never a
// round-trip through `new Date(dateString)` + `.toISOString()`, which is
// exactly the combination that silently shifts a day backward or forward
// depending on the server's local timezone. Every date in this file is
// built and compared this same way, so there is only one source of truth
// for "what day is this," not two conversions that can disagree.
function utcDateString(offsetDaysFromToday: number): string {
  const now = new Date()
  const utcMidnightToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const target = new Date(utcMidnightToday + offsetDaysFromToday * 24 * 60 * 60 * 1000)
  const y = target.getUTCFullYear()
  const m = String(target.getUTCMonth() + 1).padStart(2, '0')
  const d = String(target.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function displayLabel(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export async function getRevenueTrend(days: number = 14): Promise<{ points: DailyRevenuePoint[]; shopNames: string[] }> {
  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  const startDateString = utcDateString(-(days - 1))
  const start = new Date(`${startDateString}T00:00:00.000Z`)

  const shops = await prisma.tbl_shop.findMany({
    where: allShops ? { is_active: true, is_head_office: false } : { shop_id: scope.shopId ?? -1 },
    select: { shop_id: true, shop_name: true },
    orderBy: { shop_id: 'asc' },
  })
  const shopNames = shops.map(s => s.shop_name)

  // DATE_FORMAT forces MySQL to hand back a plain "YYYY-MM-DD" string —
  // no Date object, no ambiguity about which timezone it should be
  // interpreted in when JS receives it.
  const rows: any[] = allShops
    ? await prisma.$queryRaw`
        SELECT DATE_FORMAT(o.order_date, '%Y-%m-%d') AS day, s.shop_name AS shop_name, COALESCE(SUM(CAST(o.grand_total AS DOUBLE)), 0) AS total
        FROM tbl_order o
        JOIN tbl_shop s ON s.shop_id = o.shop_id
        WHERE o.order_status IN (2, 4) AND o.order_date >= ${start}
        GROUP BY DATE_FORMAT(o.order_date, '%Y-%m-%d'), s.shop_name
      `
    : await prisma.$queryRaw`
        SELECT DATE_FORMAT(o.order_date, '%Y-%m-%d') AS day, s.shop_name AS shop_name, COALESCE(SUM(CAST(o.grand_total AS DOUBLE)), 0) AS total
        FROM tbl_order o
        JOIN tbl_shop s ON s.shop_id = o.shop_id
        WHERE o.order_status IN (2, 4) AND o.order_date >= ${start} AND o.shop_id = ${scope.shopId}
        GROUP BY DATE_FORMAT(o.order_date, '%Y-%m-%d'), s.shop_name
      `

  // key: "YYYY-MM-DD|shopName" -> revenue — pure string keys throughout,
  // built directly from the plain string the database returned.
  const byDayShop = new Map<string, number>()
  for (const r of rows) {
    byDayShop.set(`${String(r.day)}|${String(r.shop_name)}`, Number(r.total))
  }

  const points: DailyRevenuePoint[] = []
  for (let i = 0; i < days; i++) {
    const dateString = utcDateString(-(days - 1) + i)
    const point: DailyRevenuePoint = { date: displayLabel(dateString) }
    for (const name of shopNames) {
      point[name] = byDayShop.get(`${dateString}|${name}`) || 0
    }
    points.push(point)
  }

  return { points, shopNames }
}
