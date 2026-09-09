'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export type TopProduct = {
  sl: number
  barcode: string
  name: string
  qty: number
}

export async function getTopProducts(): Promise<TopProduct[]> {
  try {
    const scope = await getShopScope()

    // Group by product_id and sum quantities from tbl_order_details,
    // scoped to this shop's orders (order_details has no shop_id of its
    // own, so filter via the parent order relation).
    const products = await prisma.tbl_order_details.groupBy({
      by: ['product_id'],
      where: { order: scopeWhere(scope) },
      _sum: { product_quantity: true },
      orderBy: { _sum: { product_quantity: 'desc' } },
      take: 5,
    })

    // Fetch product details for each product_id
    const result: TopProduct[] = await Promise.all(
      products.map(async (p, index) => {
        const product = await prisma.tbl_product.findUnique({
          where: { product_id: p.product_id },
          select: { barcode: true, product_name: true },
        })

        // Convert Decimal to number
        const quantity = p._sum.product_quantity 
          ? Number(p._sum.product_quantity) 
          : 0

        return {
          sl: index + 1,
          barcode: product?.barcode ?? 'N/A',
          name: product?.product_name ?? 'Unknown',
          qty: quantity, // Now it's a number, not Decimal
        }
      })
    )

    return result
  } catch (error) {
    console.error('Error fetching top products:', error)
    return []
  }
}