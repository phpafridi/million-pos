'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export async function FetchGrnList(filters?: { sourceType?: string; startDate?: string; endDate?: string }) {
  const scope = await getShopScope()

  const where: any = {}
  if (!scope.isSuperAdmin) {
    if (!scope.shopId) return []
    where.shop_id = scope.shopId
  }
  if (filters?.sourceType) where.source_type = filters.sourceType
  if (filters?.startDate || filters?.endDate) {
    where.created_at = {}
    if (filters.startDate) where.created_at.gte = new Date(filters.startDate)
    if (filters.endDate) {
      const end = new Date(filters.endDate)
      end.setHours(23, 59, 59, 999)
      where.created_at.lte = end
    }
  }

  const grns = await prisma.tbl_grn.findMany({
    where,
    include: {
      shop: { select: { shop_name: true } },
      items: { select: { quantity: true } },
    },
    orderBy: { grn_id: 'desc' },
    take: 200,
  })

  return grns.map((g) => ({
    grn_id: g.grn_id,
    grn_number: g.grn_number,
    shop_name: g.shop.shop_name,
    source_type: g.source_type,
    source_description: g.source_description,
    received_by: g.received_by,
    item_count: g.items.length,
    total_quantity: g.items.reduce((s, i) => s + Number(i.quantity), 0),
    created_at: g.created_at.toISOString(),
  }))
}
