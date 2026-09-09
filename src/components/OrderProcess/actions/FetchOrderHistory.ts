'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export default async function FetchOrderHistory() {
  try {
    const scope = await getShopScope()
    const orders = await prisma.tbl_order.findMany({
      where: scopeWhere(scope),
      orderBy: {
        order_no: 'desc', // latest orders first
      },
      include: {
        customer: true,      // include customer info
        details: true,       // include line items
        invoices: true,      // include related invoices
      },
    })

    return orders
  } catch (err) {
    console.error('❌ FetchOrderHistory error:', err)
    throw new Error('Failed to fetch order history')
  }
}
