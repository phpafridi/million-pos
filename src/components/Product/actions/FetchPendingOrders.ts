'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export async function fetchPendingOrders() {
  try {
    const scope = await getShopScope()
    const orders = await prisma.tbl_order.findMany({
      where: {
        order_status: 0, // ✅ pending = 0
        ...scopeWhere(scope),
      },
      select: {
        order_id: true,
        customer_name: true,
        order_date: true,
      },
      orderBy: {
        order_date: 'desc',
      },
    })

    return orders.map(o => ({
      id: o.order_id,
      customer_name: o.customer_name,
      order_date: o.order_date?.toISOString().split('T')[0] ?? '',
    }))
  } catch (error) {
    console.error('❌ Error fetching pending orders:', error)
    return []
  }
}
