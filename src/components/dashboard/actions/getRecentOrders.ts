'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export async function getRecentOrders(limit: number = 10) {
  const scope = await getShopScope()
  const orders = await prisma.tbl_order.findMany({
    where: { order_status: 2, ...scopeWhere(scope) },
    orderBy: { order_date: 'desc' },
    take: limit,
    select: {
      order_id: true,
      order_date: true,
      grand_total: true,
      customer: { select: { customer_name: true } },
      order_status: true
    }
  })

  // Prisma's Decimal and Date types can't cross the server/client boundary
  // as-is — Next.js only allows plain serializable objects through.
  return orders.map((o) => ({
    ...o,
    order_date: o.order_date.toISOString(),
    grand_total: Number(o.grand_total),
  }))
}
