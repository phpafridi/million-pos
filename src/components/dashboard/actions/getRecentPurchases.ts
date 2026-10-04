'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export async function getRecentPurchases(limit: number = 10) {
  const scope = await getShopScope()
  const purchases = await prisma.tbl_purchase.findMany({
    where: scopeWhere(scope),
    orderBy: { datetime: 'desc' },
    take: limit,
    select: {
      purchase_id: true,
      purchase_order_number: true,
      supplier_name: true,
      grand_total: true,
      datetime: true,
    },
  })

  // Prisma's Decimal and Date types can't cross the server/client boundary
  // as-is — Next.js only allows plain serializable objects through.
  return purchases.map((p) => ({
    id: p.purchase_id,
    purchase_order_number: p.purchase_order_number,
    supplier_name: p.supplier_name,
    grand_total: Number(p.grand_total),
    datetime: p.datetime.toISOString(),
  }))
}
