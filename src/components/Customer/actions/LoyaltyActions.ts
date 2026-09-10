'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'
import { sharedOrOwnWhere } from '@/lib/syncSettings'
import { generateCardNumber } from '@/lib/loyalty'
import { logActivity } from '@/lib/auditLog'
import { revalidatePath } from 'next/cache'

async function assertCanAccessCustomer(customer_id: number) {
  const scope = await getShopScope()
  const customer = await prisma.tbl_customer.findFirst({
    where: { customer_id, ...sharedOrOwnWhere(scope) },
  })
  if (!customer) throw new Error('Customer not found or not accessible')
  return { scope, customer }
}

/** Card and membership management is Head Office only, deliberately — not
 * a per-employee permission a franchise could be granted. Franchises can
 * still view a customer's membership status and points; they just can't
 * change any of it. This keeps who controls loyalty simple and absolute
 * rather than another configurable permission to reason about. */
async function assertHeadOffice() {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) {
    throw new Error('Only Head Office can manage loyalty cards and membership')
  }
  return scope
}

/** Turns membership on (auto-assigning a card number if one isn't already set) or off. Turning off does NOT clear existing points — a lapsed member's balance is preserved in case they rejoin. */
export async function SetGoldMemberStatus(customer_id: number, isGoldMember: boolean) {
  await assertHeadOffice()
  const { customer } = await assertCanAccessCustomer(customer_id)

  let cardNumber = customer.card_number
  if (isGoldMember && !cardNumber) {
    cardNumber = await generateCardNumber()
  }

  await prisma.tbl_customer.update({
    where: { customer_id },
    data: { is_gold_member: isGoldMember, card_number: cardNumber },
  })

  await logActivity({
    action: isGoldMember ? 'customer.gold_member_enabled' : 'customer.gold_member_disabled',
    entityType: 'customer',
    entityId: customer_id,
    description: `${isGoldMember ? 'Enabled' : 'Disabled'} gold membership for customer #${customer_id}`,
  })

  revalidatePath('/dashboard/customer/manage-customer')
  return { success: true, card_number: cardNumber }
}

/** Manually set a specific card number — for a customer who already has a physical pre-printed card with a number on it, instead of using the auto-generated one. */
export async function SetCardNumber(customer_id: number, cardNumber: string) {
  await assertHeadOffice()
  await assertCanAccessCustomer(customer_id)

  const trimmed = cardNumber.trim()
  if (!trimmed) throw new Error('Card number cannot be empty')

  const existing = await prisma.tbl_customer.findUnique({ where: { card_number: trimmed } })
  if (existing && existing.customer_id !== customer_id) {
    throw new Error('This card number is already assigned to another customer')
  }

  await prisma.tbl_customer.update({
    where: { customer_id },
    data: { card_number: trimmed },
  })

  revalidatePath('/dashboard/customer/manage-customer')
  return { success: true }
}

/** Manual point adjustment — for corrections, goodwill bonuses, or promotional awards outside the normal per-purchase earning. */
export async function AdjustLoyaltyPoints(customer_id: number, delta: number, reason: string) {
  await assertHeadOffice()
  const { customer } = await assertCanAccessCustomer(customer_id)

  const current = await prisma.tbl_customer.findUnique({ where: { customer_id }, select: { loyalty_points: true } })
  const newBalance = Math.max(0, (current?.loyalty_points || 0) + delta)

  await prisma.tbl_customer.update({
    where: { customer_id },
    data: { loyalty_points: newBalance },
  })

  await logActivity({
    action: 'customer.loyalty_adjusted',
    entityType: 'customer',
    entityId: customer_id,
    description: `Loyalty points ${delta >= 0 ? 'added' : 'removed'}: ${Math.abs(delta)} (${reason || 'no reason given'}) — new balance ${newBalance}`,
  })

  revalidatePath('/dashboard/customer/manage-customer')
  return { success: true, new_balance: newBalance }
}

/** Looks up a customer by scanned/typed card number — used by the POS to instantly select a member at checkout. Rate limited per IP to stop automated card-number guessing. */
export async function FindCustomerByCardNumber(cardNumber: string) {
  const { checkCardScanRateLimit, recordCardScanAttempt, getRequestIp } = await import('@/lib/cardScanRateLimit')
  const ip = await getRequestIp()

  const rateLimit = await checkCardScanRateLimit(ip)
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.reason)
  }

  const scope = await getShopScope()
  const trimmed = cardNumber.trim()
  if (!trimmed) return null

  const customer = await prisma.tbl_customer.findFirst({
    where: { card_number: trimmed, ...sharedOrOwnWhere(scope) },
  })

  if (!customer) {
    await recordCardScanAttempt(ip, false)
    return null
  }
  if (!customer.card_active) {
    await recordCardScanAttempt(ip, false)
    throw new Error(`This card has been deactivated. If ${customer.customer_name} needs a new card, deactivate isn't the same as removing membership — check their profile.`)
  }

  await recordCardScanAttempt(ip, true)
  return customer
}

/** Searches all customers network-wide who aren't already gold members — for Head Office to find and enroll someone new from the Loyalty Settings page. */
export async function SearchNonMemberCustomers(search: string) {
  await assertHeadOffice()
  if (!search.trim()) return []

  const customers = await prisma.tbl_customer.findMany({
    where: {
      is_gold_member: false,
      OR: [
        { customer_name: { contains: search.trim() } },
        { phone: { contains: search.trim() } },
        { email: { contains: search.trim() } },
      ],
    },
    select: {
      customer_id: true,
      customer_name: true,
      phone: true,
      email: true,
      shop: { select: { shop_name: true } },
    },
    take: 20,
  })

  return customers.map((c) => ({
    customer_id: c.customer_id,
    customer_name: c.customer_name,
    phone: c.phone,
    email: c.email,
    shop_name: c.shop?.shop_name || 'Shared',
  }))
}

/** Every gold member, network-wide — for Head Office's overview list on the Loyalty Settings page. Franchise-only accounts never call this (the page itself is Head-Office-only). */
export async function FetchAllMembers(search?: string) {
  await assertHeadOffice()

  const where: any = { is_gold_member: true }
  if (search && search.trim()) {
    where.OR = [
      { customer_name: { contains: search.trim() } },
      { phone: { contains: search.trim() } },
      { card_number: { contains: search.trim() } },
    ]
  }

  const members = await prisma.tbl_customer.findMany({
    where,
    select: {
      customer_id: true,
      customer_name: true,
      phone: true,
      card_number: true,
      card_active: true,
      loyalty_points: true,
      shop_id: true,
      shop: { select: { shop_name: true } },
    },
    orderBy: { customer_id: 'desc' },
  })

  return members.map((m) => ({
    customer_id: m.customer_id,
    customer_name: m.customer_name,
    phone: m.phone,
    card_number: m.card_number,
    card_active: m.card_active,
    loyalty_points: m.loyalty_points,
    shop_name: m.shop?.shop_name || 'Shared',
  }))
}
export async function SetCardActiveStatus(customer_id: number, isActive: boolean) {
  await assertHeadOffice()
  const scope = await getShopScope()
  const customer = await prisma.tbl_customer.findFirst({
    where: { customer_id, ...sharedOrOwnWhere(scope) },
  })
  if (!customer) throw new Error('Customer not found or not accessible')

  await prisma.tbl_customer.update({
    where: { customer_id },
    data: { card_active: isActive },
  })

  await logActivity({
    action: isActive ? 'customer.card_activated' : 'customer.card_deactivated',
    entityType: 'customer',
    entityId: customer_id,
    description: `Card ${isActive ? 'activated' : 'deactivated'} for customer #${customer_id}`,
  })

  revalidatePath('/dashboard/customer/manage-customer')
  return { success: true }
}
