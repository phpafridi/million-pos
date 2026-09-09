import type { PrismaClient } from '../generated/prisma/client'

/**
 * Creates the same starter records every shop needs: a global "No Tax"
 * rule and "nil" category (shared platform-wide — part of the common
 * catalog, not per-shop), plus a shop-specific walk-in customer and
 * wholesale supplier (NOT shared — every shop gets its own, never another
 * franchise's).
 *
 * The walk-in customer in particular fixes a real bug: sales made to
 * "Walking Client" referenced a customer_id that never existed as an
 * actual row, which threw a foreign key error at checkout.
 *
 * Accepts the caller's own PrismaClient instance rather than importing
 * one itself, so this same function works both from the standalone seed
 * script (run via `tsx`, outside Next.js's module resolution) and from
 * inside the app (franchise registration).
 */
export async function seedShopDefaults(prisma: PrismaClient, shop_id: number) {
  // Global defaults — create once, shared across every shop
  let noTax = await prisma.tbl_tax.findFirst({ where: { tax_title: 'No Tax' } })
  if (!noTax) {
    noTax = await prisma.tbl_tax.create({
      data: { tax_title: 'No Tax', tax_rate: 0, tax_type: 0 },
    })
  }

  let nilCategory = await prisma.tbl_category.findFirst({ where: { category_name: 'nil' } })
  if (!nilCategory) {
    nilCategory = await prisma.tbl_category.create({ data: { category_name: 'nil' } })
  }

  const nilSubcategory = await prisma.tbl_subcategory.findFirst({
    where: { subcategory_name: 'nil', category_id: nilCategory.category_id },
  })
  if (!nilSubcategory) {
    await prisma.tbl_subcategory.create({
      data: { subcategory_name: 'nil', category_id: nilCategory.category_id },
    })
  }

  // Per-shop defaults — every franchise gets its own, never shared
  const existingWalkin = await prisma.tbl_customer.findFirst({
    where: { shop_id, email: 'nil@gmail.com' },
  })
  if (!existingWalkin) {
    await prisma.tbl_customer.create({
      data: {
        shop_id,
        customer_code: Math.floor(Math.random() * 100000000),
        customer_name: 'walkin',
        email: 'nil@gmail.com',
        address: 'nil',
        phone: '0',
        discount: '0',
      },
    })
  }

  const existingSupplier = await prisma.tbl_supplier.findFirst({
    where: { shop_id, supplier_name: 'wholesale' },
  })
  if (!existingSupplier) {
    await prisma.tbl_supplier.create({
      data: {
        shop_id,
        company_name: 'wholesale',
        supplier_name: 'wholesale',
        email: 'nil@gmail.com',
        phone: '0',
        address: 'nil',
      },
    })
  }
}
