'use server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { getShopScope } from '@/lib/getShopScope'

export type WarehouseReportRow = {
  shop_id: number
  shop_name: string
  shop_code: string
  purchase_count: number
  purchase_total: number
  stock_value: number
  transfers_sent: number
  transfers_sent_value: number
}

/** Purchasing, stock, and outbound-transfer activity for every warehouse — Head Office oversight only. */
export async function getWarehouseReport(): Promise<WarehouseReportRow[]> {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) return []

  const warehouses = await prisma.tbl_shop.findMany({
    where: { is_warehouse: true, is_active: true },
    select: { shop_id: true, shop_name: true, shop_code: true },
    orderBy: { shop_id: 'asc' },
  })
  if (warehouses.length === 0) return []

  const shopIds = warehouses.map((w) => w.shop_id)

  const purchaseRows = await prisma.tbl_purchase.groupBy({
    by: ['shop_id'],
    where: { shop_id: { in: shopIds } },
    _count: { purchase_id: true },
    _sum: { grand_total: true },
  })

  const stockRows: any[] = await prisma.$queryRaw`
    SELECT i.shop_id, SUM(i.product_quantity * COALESCE(pp.buying_price, 0)) AS stock_value
    FROM tbl_inventory i
    LEFT JOIN tbl_product_price pp ON pp.product_id = i.product_id AND pp.shop_id = i.shop_id
    WHERE i.shop_id IN (${Prisma.join(shopIds)})
    GROUP BY i.shop_id
  `

  const transferRows = await prisma.tbl_stock_transfer.groupBy({
    by: ['from_shop_id'],
    where: { from_shop_id: { in: shopIds }, status: { not: 'cancelled' } },
    _count: { transfer_id: true },
    _sum: { total_amount: true },
  })

  const purchaseMap = new Map(purchaseRows.map((r) => [r.shop_id, r]))
  const stockMap = new Map(stockRows.map((r) => [Number(r.shop_id), Number(r.stock_value || 0)]))
  const transferMap = new Map(transferRows.map((r) => [r.from_shop_id, r]))

  return warehouses.map((w) => {
    const purchase = purchaseMap.get(w.shop_id)
    const transfer = transferMap.get(w.shop_id)
    return {
      shop_id: w.shop_id,
      shop_name: w.shop_name,
      shop_code: w.shop_code,
      purchase_count: Number(purchase?._count?.purchase_id || 0),
      purchase_total: Number(purchase?._sum?.grand_total || 0),
      stock_value: stockMap.get(w.shop_id) || 0,
      transfers_sent: Number(transfer?._count?.transfer_id || 0),
      transfers_sent_value: Number(transfer?._sum?.total_amount || 0),
    }
  })
}
