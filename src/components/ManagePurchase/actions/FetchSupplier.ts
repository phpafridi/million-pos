'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhereSingleShop } from '@/lib/getShopScope'
import { supplierVisibilityWhere } from '@/lib/syncSettings'

export async function FetchSuppliers(overrideShopId?: number) {
  const scope = await getShopScope()
  const effectiveScope = scope.isSuperAdmin && overrideShopId
    ? { ...scope, shopId: overrideShopId }
    : scope
  return await prisma.tbl_supplier.findMany({
    where: supplierVisibilityWhere(effectiveScope),
    orderBy: {  supplier_id: 'desc' }, // latest first
  })
}
