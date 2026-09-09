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
}

export default async function FetchProduct(): Promise<ProductSummary[]> {
  const scope = await getShopScope()
  const shopFilter = scopeWhere(scope)
  const products = await prisma.tbl_product.findMany({
    include: {
      inventories: {
        where: shopFilter,
        select: { product_quantity: true },
      },
      prices: {
        where: shopFilter,
        select: { buying_price: true },
      },
    },
  })

  return products.map((p) => {
    const qty = Number(p.inventories?.[0]?.product_quantity) ?? 0  // Convert to number
    const cost = Number(p.prices?.[0]?.buying_price) ?? 0         // Convert to number
    const measurement_units = p.measurement_units ?? 'N/A'
    const packet_size = p.packet_size === null ? 0 : Number(p.packet_size) ?? 0  // Convert to number

    return {
      id: p.product_id,
      sku: p.product_code,
      name: p.product_name,
      cost,  // Now this is a number
      qty,   // Now this is a number
      measurement_units,
      stockValue: cost * qty,  // This works with numbers
      packet_size,  // Now this is a number
    }
  })
}