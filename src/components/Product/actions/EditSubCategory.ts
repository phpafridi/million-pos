'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { assertCanModifyRecord } from '@/lib/syncSettings'

export async function EditSubCategory(id: number, subcategory_name: string, category_id: number) {
  try {
    const subcategory = await prisma.tbl_subcategory.findUnique({
      where: { subcategory_id: id }
    })

    if (!subcategory) {
      throw new Error('Subcategory not found')
    }

    const scope = await getShopScope()
    assertCanModifyRecord(scope, subcategory.shop_id)

    const updated = await prisma.tbl_subcategory.update({
      where: { subcategory_id: id },
      data: {
        subcategory_name,
        category_id
      }
    })

    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Error updating subcategory:', error)
    return { success: false, error: error.message }
  }
}
