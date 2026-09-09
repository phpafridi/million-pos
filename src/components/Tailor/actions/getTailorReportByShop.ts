'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export type TailorShopBreakdown = {
  shop_id: number
  shop_name: string
  shop_code: string
  order_count: number
  total_price: number
  total_advance: number
  total_balance: number
  status_counts: Record<string, number>
}

/** Tailor performance per franchise — Head Office oversight only. */
export async function getTailorReportByShop(): Promise<TailorShopBreakdown[]> {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) return []

  const shops = await prisma.tbl_shop.findMany({
    where: { is_active: true },
    select: { shop_id: true, shop_name: true, shop_code: true },
    orderBy: { shop_id: 'asc' },
  })

  const orders = await prisma.tbl_tailor_order.findMany({
    where: { status: { not: 'cancelled' } },
    select: { shop_id: true, price: true, advance_paid: true, status: true },
  })

  return shops
    .map((s) => {
      const shopOrders = orders.filter((o) => o.shop_id === s.shop_id)
      const total_price = shopOrders.reduce((sum, o) => sum + Number(o.price), 0)
      const total_advance = shopOrders.reduce((sum, o) => sum + Number(o.advance_paid), 0)
      const status_counts: Record<string, number> = {}
      shopOrders.forEach((o) => { status_counts[o.status] = (status_counts[o.status] || 0) + 1 })

      return {
        shop_id: s.shop_id,
        shop_name: s.shop_name,
        shop_code: s.shop_code,
        order_count: shopOrders.length,
        total_price,
        total_advance,
        total_balance: total_price - total_advance,
        status_counts,
      }
    })
    .filter((s) => s.order_count > 0)
}
