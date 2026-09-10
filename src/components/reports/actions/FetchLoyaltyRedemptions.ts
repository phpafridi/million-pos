'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export type LoyaltyRedemptionRow = {
  order_id: number
  order_number: string | null
  order_date: string
  customer_name: string
  phone: string
  points_redeemed: number
  discount_amount: number
  grand_total: number
  shop_name: string
  sales_person: string
}

export async function FetchLoyaltyRedemptions(startDate: string, endDate: string): Promise<{
  redemptions: LoyaltyRedemptionRow[]
  totalPointsRedeemed: number
  totalDiscountGiven: number
  byShop: { shop_name: string; redemption_count: number; points_redeemed: number; discount_given: number }[]
}> {
  const scope = await getShopScope()

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  const where = scope.isSuperAdmin ? {} : scopeWhere(scope)

  const orders = await prisma.tbl_order.findMany({
    where: {
      ...where,
      order_date: { gte: start, lte: end },
      loyalty_points_redeemed: { gt: 0 },
    },
    select: {
      order_id: true,
      order_number: true,
      order_date: true,
      customer_name: true,
      customer_phone: true,
      loyalty_points_redeemed: true,
      loyalty_discount_amount: true,
      grand_total: true,
      sales_person: true,
      shop: { select: { shop_name: true } },
    },
    orderBy: { order_date: 'desc' },
  })

  const redemptions: LoyaltyRedemptionRow[] = orders.map((o) => ({
    order_id: o.order_id,
    order_number: o.order_number,
    order_date: o.order_date.toISOString(),
    customer_name: o.customer_name,
    phone: o.customer_phone,
    points_redeemed: o.loyalty_points_redeemed,
    discount_amount: Number(o.loyalty_discount_amount),
    grand_total: Number(o.grand_total),
    shop_name: o.shop?.shop_name || 'Unknown',
    sales_person: o.sales_person,
  }))

  const totalPointsRedeemed = redemptions.reduce((s, r) => s + r.points_redeemed, 0)
  const totalDiscountGiven = redemptions.reduce((s, r) => s + r.discount_amount, 0)

  const shopMap = new Map<string, { redemption_count: number; points_redeemed: number; discount_given: number }>()
  for (const r of redemptions) {
    const existing = shopMap.get(r.shop_name)
    if (existing) {
      existing.redemption_count += 1
      existing.points_redeemed += r.points_redeemed
      existing.discount_given += r.discount_amount
    } else {
      shopMap.set(r.shop_name, { redemption_count: 1, points_redeemed: r.points_redeemed, discount_given: r.discount_amount })
    }
  }
  const byShop = Array.from(shopMap.entries()).map(([shop_name, v]) => ({ shop_name, ...v }))

  return { redemptions, totalPointsRedeemed, totalDiscountGiven, byShop }
}
