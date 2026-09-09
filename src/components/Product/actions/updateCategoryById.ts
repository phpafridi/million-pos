'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { assertCanModifyRecord } from '@/lib/syncSettings'

export async function updateCategoryById(id: number, category_name: string) {
  if (!category_name.trim()) {
    throw new Error('Category name is required')
  }

  const category = await prisma.tbl_category.findUnique({
    where: { category_id: id },
  })

  if (!category) {
    throw new Error('Category not found')
  }

  const scope = await getShopScope()
  assertCanModifyRecord(scope, category.shop_id)

  try {
    await prisma.tbl_category.update({
      where: { category_id: id },
      data: { category_name },
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating category:', error)
    throw new Error('Failed to update category')
  }
}
