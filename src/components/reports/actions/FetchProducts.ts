'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export type ProductSummary = {
  id: number
  sku: string
  name: string
  cost: number
  qty: number
  measurement_units: string
  stockValue: number
  packet_size: number
  byShop?: { shop_name: string; qty: number }[]
}

export default async function FetchProduct(): Promise<ProductSummary[]> {
  const scope = await getShopScope()
  const shopFilter = scopeWhere(scope)
  const products = await prisma.tbl_product.findMany({
    include: {
      inventories: {
        where: shopFilter,
        select: { product_quantity: true, shop: { select: { shop_name: true } } },
      },
      prices: {
        where: shopFilter,
        select: { buying_price: true },
      },
    },
  })

  return products.map((p) => {
    // Sum across every shop's inventory row — taking just the first row
    // (as this used to do) silently discarded every other franchise's
    // stock of this product when Head Office viewed this network-wide,
    // making the total look complete while actually being wrong.
    const qty = p.inventories.reduce((sum, inv) => sum + Number(inv.product_quantity), 0)
    const cost = Number(p.prices?.[0]?.buying_price) ?? 0
    const measurement_units = p.measurement_units ?? 'N/A'
    const packet_size = p.packet_size === null ? 0 : Number(p.packet_size) ?? 0

    const byShop = scope.isSuperAdmin
      ? p.inventories
          .filter((inv) => Number(inv.product_quantity) > 0)
          .map((inv) => ({ shop_name: inv.shop.shop_name, qty: Number(inv.product_quantity) }))
      : undefined

    return {
      id: p.product_id,
      sku: p.product_code,
      name: p.product_name,
      cost,
      qty,
      measurement_units,
      stockValue: cost * qty,
      packet_size,
      byShop,
    }
  })
}