'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhereSingleShop } from '@/lib/getShopScope'

export type ProductBatch = {
  batch_id: number
  batch_number: string
  qty_remaining: number
  selling_price: number
  buying_price: number
  expiry_date: string | null
  manufacture_date: string | null
  purchase_date: string
  is_expired: boolean
  is_expiring_soon: boolean   // within 90 days
  days_until_expiry: number | null
}

export async function FetchProductBatches(product_id: number, overrideShopId?: number): Promise<ProductBatch[]> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const scope = await getShopScope()
    const effectiveScope = scope.isSuperAdmin && overrideShopId
      ? { ...scope, shopId: overrideShopId }
      : scope
    const shopId = scopeWhereSingleShop(effectiveScope).shop_id

    const batches: any[] = await prisma.$queryRaw`
      SELECT
        batch_id, batch_number,
        CAST(qty_remaining AS DOUBLE)  AS qty_remaining,
        CAST(selling_price AS DOUBLE)  AS selling_price,
        CAST(buying_price  AS DOUBLE)  AS buying_price,
        expiry_date, manufacture_date, purchase_date
      FROM tbl_purchase_batch
      WHERE product_id = ${product_id}
        AND shop_id = ${shopId}
        AND is_active = true
        AND qty_remaining > 0
      ORDER BY expiry_date ASC, purchase_date ASC
    `

    return batches.map((b): ProductBatch => {
      const expDate = b.expiry_date ? new Date(b.expiry_date) : null
      const soonDate = new Date(today)
      soonDate.setDate(soonDate.getDate() + 90)

      const isExpired      = expDate ? expDate < today : false
      const isExpiringSoon = expDate ? (!isExpired && expDate <= soonDate) : false
      const daysUntil      = expDate
        ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null

      return {
        batch_id:          Number(b.batch_id),
        batch_number:      b.batch_number,
        qty_remaining:     Number(b.qty_remaining),
        selling_price:     Number(b.selling_price),
        buying_price:      Number(b.buying_price),
        expiry_date:       b.expiry_date   ? new Date(b.expiry_date).toISOString().slice(0, 10)   : null,
        manufacture_date:  b.manufacture_date ? new Date(b.manufacture_date).toISOString().slice(0, 10) : null,
        purchase_date:     new Date(b.purchase_date).toISOString(),
        is_expired:        isExpired,
        is_expiring_soon:  isExpiringSoon,
        days_until_expiry: daysUntil,
      }
    })
  } catch (err) {
    console.error('FetchProductBatches error:', err)
    return []
  }
}
