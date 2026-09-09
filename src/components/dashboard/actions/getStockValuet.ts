'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export async function getStockValue() {
  try {
    const scope = await getShopScope()
    const allShops = scope.isSuperAdmin || scope.shopId === null

    // Join each inventory row to the price row for the SAME shop (not an
    // arbitrary "most recent" price row, which could belong to a different
    // franchise entirely).
    const result: any[] = allShops
      ? await prisma.$queryRaw`
          SELECT
            SUM(i.product_quantity * COALESCE(pp.buying_price, 0)) as total_value
          FROM tbl_inventory i
          LEFT JOIN tbl_product_price pp
            ON pp.product_id = i.product_id AND pp.shop_id = i.shop_id
        `
      : await prisma.$queryRaw`
          SELECT
            SUM(i.product_quantity * COALESCE(pp.buying_price, 0)) as total_value
          FROM tbl_inventory i
          LEFT JOIN tbl_product_price pp
            ON pp.product_id = i.product_id AND pp.shop_id = i.shop_id
          WHERE i.shop_id = ${scope.shopId}
        `

    const totalValue = Number(result[0]?.total_value || 0)
    
    return {
      success: true,
      totalValue: totalValue,
      formattedValue: totalValue.toFixed(2)
    }
  } catch (error: any) {
    console.error('Error calculating stock value:', error)
    return {
      success: false,
      totalValue: 0,
      formattedValue: '0.00',
      error: error.message
    }
  }
}
