// Deliberately no 'use server' here — these functions (especially
// awardLoyaltyPoints, which takes a raw point amount with no built-in
// proof it corresponds to a real sale) must only ever be reachable from
// other server-side code, never directly callable from the browser.
// Read-only config that's safe to expose to the client lives in the
// separate loyaltyConfig.ts instead.
import { prisma } from '@/lib/prisma'
import { getLoyaltyConfig } from '@/lib/loyaltyConfig'

/**
 * Awards loyalty points for a completed purchase — only to customers who
 * are actual gold members (walk-in and non-member customers don't earn
 * points, matching how the membership toggle is meant to gate this), and
 * only when Head Office has the whole system turned on.
 * Called after a POS sale completes.
 */
export async function awardLoyaltyPoints(customerId: number, orderTotal: number) {
  const config = await getLoyaltyConfig()
  if (!config.enabled) return { awarded: 0 }

  const customer = await prisma.tbl_customer.findUnique({
    where: { customer_id: customerId },
    select: { is_gold_member: true },
  })
  if (!customer?.is_gold_member) return { awarded: 0 }

  const earned = Math.floor((orderTotal / 100) * config.pointsPer100Spent)
  if (earned <= 0) return { awarded: 0 }

  await prisma.tbl_customer.update({
    where: { customer_id: customerId },
    data: { loyalty_points: { increment: earned } },
  })

  return { awarded: earned }
}

/** Generates a short, unique, human-typeable card number if the caller doesn't want to enter one manually (e.g. from a pre-printed physical card). */
export async function generateCardNumber(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `MLN-${Math.floor(100000 + Math.random() * 900000)}`
    const existing = await prisma.tbl_customer.findUnique({ where: { card_number: candidate } })
    if (!existing) return candidate
  }
  // Astronomically unlikely to ever reach this, but fall back to a
  // timestamp-based value that's guaranteed unique rather than looping forever.
  return `MLN-${Date.now()}`
}
