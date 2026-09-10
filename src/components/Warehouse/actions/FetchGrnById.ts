'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export async function FetchGrnById(grn_id: number) {
  const scope = await getShopScope()

  const grn = await prisma.tbl_grn.findUnique({
    where: { grn_id },
    include: {
      shop: { select: { shop_name: true, shop_code: true } },
      items: { include: { product: { select: { product_name: true, product_code: true, measurement_units: true } } } },
    },
  })
  if (!grn) return null

  if (!scope.isSuperAdmin && grn.shop_id !== scope.shopId) {
    throw new Error('Not accessible from this account')
  }

  return {
    grn_id: grn.grn_id,
    grn_number: grn.grn_number,
    shop_name: grn.shop.shop_name,
    shop_code: grn.shop.shop_code,
    source_type: grn.source_type,
    source_description: grn.source_description,
    received_by: grn.received_by,
    notes: grn.notes,
    created_at: grn.created_at.toISOString(),
    items: grn.items.map((i) => ({
      product_name: i.product.product_name,
      product_code: i.product.product_code,
      unit: i.product.measurement_units,
      quantity: Number(i.quantity),
      unit_cost: i.unit_cost ? Number(i.unit_cost) : null,
    })),
  }
}
