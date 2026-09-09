'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getShopScope } from '@/lib/getShopScope'
import { supplierVisibilityWhere, assertCanModifyRecord } from '@/lib/syncSettings'

export async function DeleteSupplier(id: number) {
  const scope = await getShopScope()
  const supplier = await prisma.tbl_supplier.findFirst({
    where: { supplier_id: id, ...supplierVisibilityWhere(scope) },
  })
  if (!supplier) {
    throw new Error('Supplier not found or belongs to another franchise')
  }
  assertCanModifyRecord(scope, supplier.shop_id)

  await prisma.tbl_supplier.delete({
    where: { supplier_id: id },
  })

  // ✅ Refresh the supplier list page after delete
  revalidatePath('/dashboard/manage-purchase/supplier/manage-supplier')
}
