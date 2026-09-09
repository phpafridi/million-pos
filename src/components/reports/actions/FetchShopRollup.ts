'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

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
    where: scope.isSuperAdmin ? {} : { shop_id: scope.shopId ?? -1 },
    orderBy: { shop_id: 'asc' },
  })

  const rows: ShopRollupRow[] = []

  for (const shop of shops) {
    const [salesAgg, purchaseAgg] = await Promise.all([
      prisma.tbl_order.aggregate({
        where: {
          shop_id: shop.shop_id,
          order_status: { in: [2, 4] }, // confirmed + exchanged only — matches every other revenue report (excludes pending/unpaid and refunded)
          order_date: { gte: start, lte: end },
        },
        _sum: { grand_total: true },
        _count: { order_id: true },
      }),
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
      sales_total: Number(salesAgg._sum.grand_total || 0),
      sales_count: salesAgg._count.order_id,
      purchase_total: Number(purchaseAgg._sum.grand_total || 0),
      purchase_count: purchaseAgg._count.purchase_id,
    })
  }

  return { isSuperAdmin: scope.isSuperAdmin, rows }
}
