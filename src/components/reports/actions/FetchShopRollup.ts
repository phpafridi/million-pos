'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { NET_ORDERS } from '@/lib/netOrdersSql'

export interface ShopRollupRow {
  shop_id: number
  shop_code: string
  shop_name: string
  is_active: boolean
  sales_total: number
  sales_count: number
  purchase_total: number
  purchase_count: number
}

/**
 * Per-franchise sales + purchase totals for a date range.
 * Only meaningful for a super admin (CEO) — a regular shop user will only
 * ever get their own single shop back, since getShopScope() restricts them.
 */
export default async function FetchShopRollup(startDate: string, endDate: string): Promise<{
  isSuperAdmin: boolean
  rows: ShopRollupRow[]
}> {
  const scope = await getShopScope()

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  const shops = await prisma.tbl_shop.findMany({
    where: scope.isSuperAdmin ? { is_head_office: false } : { shop_id: scope.shopId ?? -1 },
    orderBy: { shop_id: 'asc' },
  })

  const rows: ShopRollupRow[] = []

  for (const shop of shops) {
    const [salesAgg, purchaseAgg] = await Promise.all([
      // Confirmed + exchanged, plus partially refunded orders at what's left
      // after the refund (see netOrdersSql.ts). Fully refunded orders drop out.
      prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(CAST(grand_total AS DOUBLE)), 0) AS total, COUNT(*) AS cnt
        FROM ${NET_ORDERS} AS tbl_order
        WHERE shop_id = ${shop.shop_id} AND order_status IN (2, 4)
          AND order_date >= ${start} AND order_date <= ${end}`,
      prisma.tbl_purchase.aggregate({
        where: {
          shop_id: shop.shop_id,
          datetime: { gte: start, lte: end },
        },
        _sum: { grand_total: true },
        _count: { purchase_id: true },
      }),
    ])

    rows.push({
      shop_id: shop.shop_id,
      shop_code: shop.shop_code,
      shop_name: shop.shop_name,
      is_active: shop.is_active,
      sales_total: Number(salesAgg[0]?.total || 0),
      sales_count: Number(salesAgg[0]?.cnt || 0),
      purchase_total: Number(purchaseAgg._sum.grand_total || 0),
      purchase_count: purchaseAgg._count.purchase_id,
    })
  }

  return { isSuperAdmin: scope.isSuperAdmin, rows }
}
