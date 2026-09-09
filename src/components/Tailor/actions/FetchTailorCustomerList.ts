'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { sharedOrOwnWhere } from '@/lib/syncSettings'

export async function FetchTailorCustomerList(search?: string) {
  const scope = await getShopScope()

  const where: any = {
    AND: [
      sharedOrOwnWhere(scope),
      {
        OR: [
          { tailor_orders: { some: {} } },
          { measurement_length: { not: null } },
          { measurement_chest: { not: null } },
        ],
      },
    ],
  }
  if (search) {
    where.AND.push({
      OR: [
        { customer_name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ],
    })
  }

  const customers = await prisma.tbl_customer.findMany({
    where,
    select: {
      customer_id: true,
      customer_name: true,
      phone: true,
      email: true,
      is_gold_member: true,
      _count: { select: { tailor_orders: true } },
    },
    orderBy: { customer_id: 'desc' },
  })

  return customers.map((c) => ({
    customer_id: c.customer_id,
    customer_name: c.customer_name,
    phone: c.phone,
    email: c.email,
    is_gold_member: c.is_gold_member,
    tailor_order_count: c._count.tailor_orders,
  }))
}
