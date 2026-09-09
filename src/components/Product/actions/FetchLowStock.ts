'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhereSingleShop } from '@/lib/getShopScope'

export async function fetchLowStock() {
  try {
    const scope = await getShopScope()
    const shopFilter = scopeWhereSingleShop(scope)

    const products = await prisma.tbl_product.findMany({
      where: {
        status: 1,
      },
      include: {
        inventories: {
          where: shopFilter,
          select: {
            product_quantity: true,
            notify_quantity: true,
          },
        },
      },
    })

    return products
      .map((product) => {
        // Convert Decimal to number at the source
        const productQty = product.inventories?.[0]?.product_quantity 
          ? Number(product.inventories[0].product_quantity) 
          : 0
        const notifyQty = product.inventories?.[0]?.notify_quantity 
          ? Number(product.inventories[0].notify_quantity) 
          : null
        
        const isLowStock = notifyQty !== null && productQty <= notifyQty

        return {
          id: product.product_id,
          name: product.product_name,
          qty: productQty, // Already converted to number
          unit: product.measurement_units || 'pcs',
          notifyQty: notifyQty, // Already converted to number or null
          isLowStock,
        }
      })
      .filter((product) => product.isLowStock)
  } catch (error) {
    console.error('Error fetching low stock products:', error)
    return []
  }
}