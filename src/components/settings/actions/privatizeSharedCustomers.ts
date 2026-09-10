'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { revalidatePath } from 'next/cache'

export type PrivatizeResult = {
  privatized: number
  skippedNoOrders: number
  skippedMultipleShops: number
  totalSharedBefore: number
}

/**
 * Turning the "customers" sync setting off only stops NEW customers from
 * being shared going forward — it can't know what to do with customers
 * that were already shared (shop_id = NULL) before the switch was
 * flipped, since a shared record has no single owner recorded anywhere.
 * This walks every currently-shared customer, looks at which franchise
 * actually has orders for them, and assigns ownership if there's exactly
 * one unambiguous answer. Customers with no orders at all, or with orders
 * from more than one franchise (genuinely shared usage), are left shared
 * since there's no safe single owner to assign them to — those need a
 * human decision, not an automatic one.
 */
export async function privatizeSharedCustomers(): Promise<PrivatizeResult> {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) {
    throw new Error('Only Head Office can run this')
  }

  const sharedCustomers = await prisma.tbl_customer.findMany({
    where: { shop_id: null, NOT: { customer_name: 'walkin', email: 'nil@gmail.com' } },
    select: { customer_id: true },
  })

  let privatized = 0
  let skippedNoOrders = 0
  let skippedMultipleShops = 0

  for (const c of sharedCustomers) {
    const [posShops, tailorShops] = await Promise.all([
      prisma.tbl_order.findMany({
        where: { customer_id: c.customer_id },
        select: { shop_id: true },
        distinct: ['shop_id'],
      }),
      prisma.tbl_tailor_order.findMany({
        where: { customer_id: c.customer_id },
        select: { shop_id: true },
        distinct: ['shop_id'],
      }),
    ])

    const shopIds = new Set<number>([
      ...posShops.map((o) => o.shop_id),
      ...tailorShops.map((o) => o.shop_id),
    ])

    if (shopIds.size === 0) {
      skippedNoOrders++
      continue
    }
    if (shopIds.size > 1) {
      skippedMultipleShops++
      continue
    }

    const [onlyShopId] = shopIds
    await prisma.tbl_customer.update({
      where: { customer_id: c.customer_id },
      data: { shop_id: onlyShopId },
    })
    privatized++
  }

  revalidatePath('/dashboard/settings/sync-settings')

  return {
    privatized,
    skippedNoOrders,
    skippedMultipleShops,
    totalSharedBefore: sharedCustomers.length,
  }
}

/** How many customers are currently private (shop_id is set, not shared) — shown so Head Office knows the scale before re-sharing. */
export async function countPrivateCustomers(): Promise<number> {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) return 0
  return prisma.tbl_customer.count({ where: { shop_id: { not: null } } })
}

/**
 * The reverse of privatizeSharedCustomers: makes every customer shared
 * again (shop_id = NULL), regardless of which franchise they currently
 * belong to. This is a separate, explicit action rather than something
 * that happens automatically when flipping the "Customers" sync setting
 * back on — turning sync back on only affects customers created from
 * that point forward. Auto-reversing it would also undo privacy for
 * customers a franchise deliberately created while sync was off, which
 * would be a worse surprise than the one this is fixing.
 */
export async function shareAllCustomers(): Promise<{ shared: number }> {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) {
    throw new Error('Only Head Office can run this')
  }

  // Exclude the generic per-shop "walkin" placeholder customers — every
  // franchise has its own (customer_code = 900000000 + shop_id, seeded
  // automatically). Sharing these would make every franchise's "walkin"
  // show up in every other franchise's customer list as if they were
  // the same person, which is meaningless — walkin isn't a real
  // customer identity to share, it's a per-shop placeholder.
  const result = await prisma.tbl_customer.updateMany({
    where: { shop_id: { not: null }, customer_code: { lt: 900000000 } },
    data: { shop_id: null },
  })

  revalidatePath('/dashboard/settings/sync-settings')

  return { shared: result.count }
}

/** How many customers are currently shared (shop_id = NULL) — shown before running the privatization so Head Office knows the scale first. */
export async function countSharedCustomers(): Promise<number> {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) return 0
  return prisma.tbl_customer.count({ where: { shop_id: null } })
}
