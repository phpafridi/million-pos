'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'
import { sharedOrOwnWhere } from '@/lib/syncSettings'

export type CustomerReportRow = {
  customer_id: number
  customer_name: string
  phone: string
  email: string
  is_gold_member: boolean
  loyalty_points: number
  pos_order_count: number
  pos_total_spent: number
  tailor_order_count: number
  tailor_total_spent: number
  total_spent: number
  last_activity: string | null
  shops: string
}

export type CustomerReportData = {
  customers: CustomerReportRow[]
  totalCustomers: number
  goldMembers: number
  totalRevenue: number
  byShop: { shop_id: number; shop_name: string; shop_code: string; customer_count: number; total_revenue: number }[]
}

export async function FetchCustomerReport(startDate: string, endDate: string): Promise<CustomerReportData> {
  const scope = await getShopScope()

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  const customers = await prisma.tbl_customer.findMany({
    where: sharedOrOwnWhere(scope),
    select: {
      customer_id: true,
      customer_name: true,
      phone: true,
      email: true,
      is_gold_member: true,
      loyalty_points: true,
    },
  })

  const orderWhere = scope.isSuperAdmin ? {} : scopeWhere(scope)

  const [posOrders, tailorOrders] = await Promise.all([
    prisma.tbl_order.findMany({
      where: { ...orderWhere, order_date: { gte: start, lte: end }, order_status: { in: [2, 4] } },
      select: { customer_id: true, grand_total: true, order_date: true, shop_id: true },
    }),
    prisma.tbl_tailor_order.findMany({
      where: { ...orderWhere, order_date: { gte: start, lte: end }, status: { not: 'cancelled' } },
      select: { customer_id: true, price: true, order_date: true, shop_id: true },
    }),
  ])

  const posMap = new Map<number, { count: number; total: number; last: Date }>()
  const customerShopIds = new Map<number, Set<number>>()
  for (const o of posOrders) {
    const existing = posMap.get(o.customer_id)
    if (existing) {
      existing.count++
      existing.total += Number(o.grand_total)
      if (o.order_date > existing.last) existing.last = o.order_date
    } else {
      posMap.set(o.customer_id, { count: 1, total: Number(o.grand_total), last: o.order_date })
    }
    if (!customerShopIds.has(o.customer_id)) customerShopIds.set(o.customer_id, new Set())
    customerShopIds.get(o.customer_id)!.add(o.shop_id)
  }

  const tailorMap = new Map<number, { count: number; total: number; last: Date }>()
  for (const o of tailorOrders) {
    const existing = tailorMap.get(o.customer_id)
    if (existing) {
      existing.count++
      existing.total += Number(o.price)
      if (o.order_date > existing.last) existing.last = o.order_date
    } else {
      tailorMap.set(o.customer_id, { count: 1, total: Number(o.price), last: o.order_date })
    }
    if (!customerShopIds.has(o.customer_id)) customerShopIds.set(o.customer_id, new Set())
    customerShopIds.get(o.customer_id)!.add(o.shop_id)
  }

  // Cheap lookup for turning the tracked shop_ids into display names —
  // fetched regardless of admin level since even a single-shop account
  // benefits from consistent typing, though the column itself is only
  // shown to Head Office in the UI.
  const allShopsForNames = await prisma.tbl_shop.findMany({ select: { shop_id: true, shop_name: true } })
  const shopNameById = new Map(allShopsForNames.map((s) => [s.shop_id, s.shop_name]))

  const rows: CustomerReportRow[] = customers
    .map((c) => {
      const pos = posMap.get(c.customer_id)
      const tailor = tailorMap.get(c.customer_id)
      const lastDates = [pos?.last, tailor?.last].filter(Boolean) as Date[]
      const last_activity = lastDates.length > 0
        ? new Date(Math.max(...lastDates.map((d) => d.getTime()))).toISOString()
        : null

      return {
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        phone: c.phone,
        email: c.email,
        is_gold_member: c.is_gold_member,
        loyalty_points: c.loyalty_points,
        pos_order_count: pos?.count || 0,
        pos_total_spent: pos?.total || 0,
        tailor_order_count: tailor?.count || 0,
        tailor_total_spent: tailor?.total || 0,
        total_spent: (pos?.total || 0) + (tailor?.total || 0),
        last_activity,
        shops: Array.from(customerShopIds.get(c.customer_id) || [])
          .map((id) => shopNameById.get(id) || `Shop #${id}`)
          .join(', '),
      }
    })
    .filter((r) => r.pos_order_count > 0 || r.tailor_order_count > 0)
    .sort((a, b) => b.total_spent - a.total_spent)

  const totalRevenue = rows.reduce((s, r) => s + r.total_spent, 0)
  const goldMembers = customers.filter((c) => c.is_gold_member).length

  let byShop: CustomerReportData['byShop'] = []
  if (scope.isSuperAdmin) {
    const shops = await prisma.tbl_shop.findMany({
      where: { is_active: true },
      select: { shop_id: true, shop_name: true, shop_code: true },
      orderBy: { shop_id: 'asc' },
    })
    const posByShop = await prisma.tbl_order.groupBy({
      by: ['shop_id'],
      where: { order_date: { gte: start, lte: end }, order_status: { in: [2, 4] } },
      _sum: { grand_total: true },
      _count: { customer_id: true },
    })
    const tailorByShop = await prisma.tbl_tailor_order.groupBy({
      by: ['shop_id'],
      where: { order_date: { gte: start, lte: end }, status: { not: 'cancelled' } },
      _sum: { price: true },
    })
    const posShopMap = new Map(posByShop.map((r) => [r.shop_id, r]))
    const tailorShopMap = new Map(tailorByShop.map((r) => [r.shop_id, r]))

    // Distinct customers per shop, based on who actually had POS or
    // tailor activity there in this date range — not who privately owns
    // the customer record. Ownership-based counting showed 0 almost
    // everywhere, since a shared customer isn't privately owned by any
    // one franchise even though they clearly shopped there.
    const customersByShop = new Map<number, Set<number>>()
    for (const o of posOrders) {
      if (!customersByShop.has(o.shop_id)) customersByShop.set(o.shop_id, new Set())
      customersByShop.get(o.shop_id)!.add(o.customer_id)
    }
    for (const o of tailorOrders) {
      if (!customersByShop.has(o.shop_id)) customersByShop.set(o.shop_id, new Set())
      customersByShop.get(o.shop_id)!.add(o.customer_id)
    }

    byShop = shops.map((s) => ({
      shop_id: s.shop_id,
      shop_name: s.shop_name,
      shop_code: s.shop_code,
      customer_count: customersByShop.get(s.shop_id)?.size || 0,
      total_revenue: Number(posShopMap.get(s.shop_id)?._sum.grand_total || 0) + Number(tailorShopMap.get(s.shop_id)?._sum.price || 0),
    }))
  }

  return {
    customers: rows,
    totalCustomers: rows.length,
    goldMembers,
    totalRevenue,
    byShop,
  }
}
