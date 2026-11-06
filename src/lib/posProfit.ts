import { prisma } from '@/lib/prisma'
import { NET_ORDERS } from '@/lib/netOrdersSql'

/**
 * Real POS profit per shop — the same formula as the Sales Report:
 *   (selling − buying) × qty for every item sold
 *   − the margin on items that were refunded
 *   − order discounts (reduced in proportion when part of an order was refunded)
 * Optional date range on order_date.
 */
export async function posProfitByShop(range?: { start: Date; end: Date }): Promise<Map<number, number>> {
  const start = range?.start ?? new Date('1970-01-01T00:00:00Z')
  const end = range?.end ?? new Date('9999-12-31T00:00:00Z')

  const lines: any[] = await prisma.$queryRaw`
    SELECT o.shop_id, COALESCE(SUM((CAST(d.selling_price AS DOUBLE) - CAST(d.buying_price AS DOUBLE)) * CAST(d.product_quantity AS DOUBLE)), 0) AS m
    FROM tbl_order_details d
    JOIN ${NET_ORDERS} o ON o.order_id = d.order_id
    WHERE o.order_status IN (2, 4) AND o.order_date >= ${start} AND o.order_date < ${end}
    GROUP BY o.shop_id`

  const refunded: any[] = await prisma.$queryRaw`
    SELECT o.shop_id, COALESCE(SUM(CAST(ri.qty AS DOUBLE) * (CAST(ri.unit_price AS DOUBLE) - COALESCE(bp.buying_price, 0))), 0) AS m
    FROM tbl_return r
    JOIN tbl_return_item ri ON ri.return_id = r.return_id
    JOIN ${NET_ORDERS} o ON o.order_id = r.order_id
    LEFT JOIN (
      SELECT order_id, product_id, MAX(CAST(buying_price AS DOUBLE)) AS buying_price
      FROM tbl_order_details GROUP BY order_id, product_id
    ) bp ON bp.order_id = r.order_id AND bp.product_id = ri.product_id
    WHERE r.return_type = 'payment' AND ri.item_type = 'returned'
      AND o.order_status IN (2, 4) AND o.order_date >= ${start} AND o.order_date < ${end}
    GROUP BY o.shop_id`

  const discounts: any[] = await prisma.$queryRaw`
    SELECT o.shop_id, COALESCE(SUM(CAST(o.discount_amount AS DOUBLE)), 0) AS m
    FROM ${NET_ORDERS} o
    WHERE o.order_status IN (2, 4) AND o.order_date >= ${start} AND o.order_date < ${end}
    GROUP BY o.shop_id`

  const out = new Map<number, number>()
  const add = (rows: any[], sign: number) => {
    for (const r of rows) out.set(Number(r.shop_id), (out.get(Number(r.shop_id)) ?? 0) + sign * Number(r.m || 0))
  }
  add(lines, 1); add(refunded, -1); add(discounts, -1)
  return out
}
