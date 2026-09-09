'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhereSingleShop } from '@/lib/getShopScope'
import { sharedOrOwnWhere } from '@/lib/syncSettings'

export async function ProductById(id: string) {
    const pid = Number(id);
    const scope = await getShopScope()
    const shopFilter = scopeWhereSingleShop(scope)

  const product = await prisma.tbl_product.findFirst({
    where: { product_id: pid, ...sharedOrOwnWhere(scope) },
    include: {
      inventories: { where: shopFilter },
      prices: { where: shopFilter },
      tier_prices: { where: shopFilter },
      special_offers: { where: shopFilter },
      attributes: true,
      tags: true,
      tax: true,
      subcategory: { include: { category: true } },
      // ADDED: Include product images if you have them
      images: true
    }
  })

  // Return the product with all the expiration fields
  // These will be available once you update your Prisma schema
  return product
}