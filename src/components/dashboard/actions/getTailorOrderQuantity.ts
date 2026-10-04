'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export async function getTailorOrderQuantity(): Promise<number> {
  const scope = await getShopScope()
  return prisma.tbl_tailor_order.count({
    where: { status: { not: 'cancelled' }, ...scopeWhere(scope) },
  })
}
