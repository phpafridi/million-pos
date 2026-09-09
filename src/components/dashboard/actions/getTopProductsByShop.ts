'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

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
    where: allShops ? { is_active: true } : { shop_id: scope.shopId ?? -1 },
    select: { shop_id: true, shop_name: true },
    orderBy: { shop_id: 'asc' },
  })
  const shopNames = shops.map(s => s.shop_name)
  const shopIdToName = new Map(shops.map(s => [s.shop_id, s.shop_name]))

  // Find the network-wide top 5 products by quantity sold.
  // order_status 2 = confirmed, 4 = exchanged (still counts — the item
  // stayed sold, just swapped). 3 = refunded is excluded, same rule
  // used everywhere else revenue/sales get calculated — an order that
  // was refunded shouldn't count toward "top selling" either.
  const topGroups = await prisma.tbl_order_details.groupBy({
    by: ['product_id'],
    where: allShops
      ? { order: { order_status: { in: [2, 4] } } }
      : { order: { shop_id: scope.shopId ?? -1, order_status: { in: [2, 4] } } },
    _sum: { product_quantity: true },
    orderBy: { _sum: { product_quantity: 'desc' } },
    take: 5,
  })
  const productIds = topGroups.map(g => g.product_id)
  if (productIds.length === 0) return { rows: [], shopNames }

  const products = await prisma.tbl_product.findMany({
    where: { product_id: { in: productIds } },
    select: { product_id: true, product_name: true },
  })
  const productNameMap = new Map(products.map(p => [p.product_id, p.product_name]))

  // Now get the per-shop breakdown for just these products
  const details = await prisma.tbl_order_details.findMany({
    where: {
      product_id: { in: productIds },
      order: allShops
        ? { order_status: { in: [2, 4] } }
        : { shop_id: scope.shopId ?? -1, order_status: { in: [2, 4] } },
    },
    select: { product_id: true, product_quantity: true, order: { select: { shop_id: true } } },
  })

  const byProductShop = new Map<string, number>()
  for (const d of details) {
    const shopName = shopIdToName.get(d.order.shop_id)
    if (!shopName) continue
    const key = `${d.product_id}|${shopName}`
    byProductShop.set(key, (byProductShop.get(key) || 0) + Number(d.product_quantity))
  }

  const rows: ProductByShopRow[] = topGroups.map(g => {
    const row: ProductByShopRow = { product: productNameMap.get(g.product_id) || 'Unknown' }
    for (const name of shopNames) {
      row[name] = byProductShop.get(`${g.product_id}|${name}`) || 0
    }
    return row
  })

  return { rows, shopNames }
}
