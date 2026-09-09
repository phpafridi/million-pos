'use server'

import { prisma } from '@/lib/prisma';
import { getShopScope } from '@/lib/getShopScope';
import { assertCanModifyRecord } from '@/lib/syncSettings';

export async function EditTaxRules(id: number, title: string, rate: number, taxType: number) {
  try {
    const tax = await prisma.tbl_tax.findUnique({ where: { tax_id: id } })
    if (!tax) return { success: false, error: 'Tax rule not found' }

    const scope = await getShopScope()
    assertCanModifyRecord(scope, tax.shop_id)

    await prisma.tbl_tax.update({
      where: { tax_id: id },
      data: {
        tax_title: title,
        tax_rate: rate,
        tax_type: taxType,
      },
    })
    return { success: true }
  } catch (error: any) {
    console.error(error)
    return { success: false, error: `Failed to update tax rule: ${error?.message || error}` }
  }
}
