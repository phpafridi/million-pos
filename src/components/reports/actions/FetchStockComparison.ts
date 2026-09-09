'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export type StockComparisonRow = {
  product_id: number
  product_code: string
  product_name: string
  measurement_units: string
  shop_stock: { shop_id: number; shop_name: string; qty: number; low_stock: boolean }[]
  total_qty: number
}

/**
 * Shows every product's stock level across every franchise, side by side —
 * a CEO-only view. Non-super-admins get an empty result; the UI shows a
 * permission notice instead of calling this.
 */
export async function FetchStockComparison(search?: string): Promise<StockComparisonRow[]> {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) return []

  const shops = await prisma.tbl_shop.findMany({
    where: { is_active: true },
    orderBy: { shop_id: 'asc' },
    select: { shop_id: true, shop_name: true },
  })

  const products = await prisma.tbl_product.findMany({
    where: search
      ? {
          OR: [
            { product_name: { contains: search } },
            { product_code: { contains: search } },
          ],
        }
      : undefined,
    select: {
      product_id: true,
      product_code: true,
      product_name: true,
      measurement_units: true,
      inventories: { select: { shop_id: true, product_quantity: true, notify_quantity: true } },
    },
    take: 300, // guard against an unbounded table on the comparison view
    orderBy: { product_name: 'asc' },
  })

  return products.map((p) => {
    const invMap = new Map(p.inventories.map((i) => [i.shop_id, i]))
    const shop_stock = shops.map((s) => {
      const inv = invMap.get(s.shop_id)
      const qty = inv ? Number(inv.product_quantity) : 0
      const notify = inv?.notify_quantity != null ? Number(inv.notify_quantity) : null
      return {
        shop_id: s.shop_id,
        shop_name: s.shop_name,
        qty,
        low_stock: notify != null && qty <= notify,
      }
    })

    return {
      product_id: p.product_id,
      product_code: p.product_code,
      product_name: p.product_name,
      measurement_units: p.measurement_units,
      shop_stock,
      total_qty: shop_stock.reduce((sum, s) => sum + s.qty, 0),
    }
  })
}
