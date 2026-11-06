'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { Prisma } from '@/generated/prisma/client'
import { NET_ORDERS } from '@/lib/netOrdersSql'

export type ProductByShopRow = { product: string; [shopName: string]: number | string }

/**
 * Top 5 products network-wide, broken down by how much each franchise
 * sold of each — for a grouped/stacked bar chart labeled by franchise,
 * instead of one blended total.
 */
export async function getTopProductsByShop(): Promise<{ rows: ProductByShopRow[]; shopNames: string[] }> {
  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  const shops = await prisma.tbl_shop.findMany({
    where: allShops ? { is_active: true, is_head_office: false } : { shop_id: scope.shopId ?? -1 },
    select: { shop_id: true, shop_name: true },
    orderBy: { shop_id: 'asc' },
  })
  const shopNames = shops.map(s => s.shop_name)
  const shopIdToName = new Map(shops.map(s => [s.shop_id, s.shop_name]))

  // Quantity sold per product per shop, minus what customers brought back
  // for a refund. Confirmed + exchanged orders plus partially refunded ones
  // (see netOrdersSql.ts); fully refunded orders don't count as sold.
  const shopFilter = allShops ? Prisma.sql`` : Prisma.sql`AND o.shop_id = ${scope.shopId ?? -1}`
  const soldRows: any[] = await prisma.$queryRaw`
    SELECT d.product_id, o.shop_id, COALESCE(SUM(CAST(d.product_quantity AS DOUBLE)), 0) AS qty
    FROM tbl_order_details d
    JOIN ${NET_ORDERS} o ON o.order_id = d.order_id
    WHERE o.order_status IN (2, 4) ${shopFilter}
    GROUP BY d.product_id, o.shop_id`
  const backRows: any[] = await prisma.$queryRaw`
    SELECT ri.product_id, o.shop_id, COALESCE(SUM(CAST(ri.qty AS DOUBLE)), 0) AS qty
    FROM tbl_return r
    JOIN tbl_return_item ri ON ri.return_id = r.return_id
    JOIN ${NET_ORDERS} o ON o.order_id = r.order_id
    WHERE r.return_type = 'payment' AND ri.item_type = 'returned' AND o.order_status IN (2, 4) ${shopFilter}
    GROUP BY ri.product_id, o.shop_id`

  const byProductShop = new Map<string, number>()
  const byProduct = new Map<number, number>()
  const addQty = (rows: any[], sign: number) => {
    for (const r of rows) {
      const shopName = shopIdToName.get(Number(r.shop_id))
      if (!shopName) continue
      const key = `${Number(r.product_id)}|${shopName}`
      byProductShop.set(key, (byProductShop.get(key) || 0) + sign * Number(r.qty))
      byProduct.set(Number(r.product_id), (byProduct.get(Number(r.product_id)) || 0) + sign * Number(r.qty))
    }
  }
  addQty(soldRows, 1)
  addQty(backRows, -1)

  const topGroups = [...byProduct.entries()]
    .filter(([, q]) => q > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([product_id]) => ({ product_id }))
  const productIds = topGroups.map(g => g.product_id)
  if (productIds.length === 0) return { rows: [], shopNames }

  const products = await prisma.tbl_product.findMany({
    where: { product_id: { in: productIds } },
    select: { product_id: true, product_name: true },
  })
  const productNameMap = new Map(products.map(p => [p.product_id, p.product_name]))

  const rows: ProductByShopRow[] = topGroups.map(g => {
    const row: ProductByShopRow = { product: productNameMap.get(g.product_id) || 'Unknown' }
    for (const name of shopNames) {
      row[name] = byProductShop.get(`${g.product_id}|${name}`) || 0
    }
    return row
  })

  return { rows, shopNames }
}
