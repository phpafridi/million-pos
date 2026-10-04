'use server'
import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'
import { STATUS_LABELS } from '@/lib/tailorStatusLabels'

export async function getRecentOrders(limit: number = 10) {
  const scope = await getShopScope()
  const [orders, tailorOrders] = await Promise.all([
    prisma.tbl_order.findMany({
      where: { order_status: 2, ...scopeWhere(scope) },
      orderBy: { order_date: 'desc' },
      take: limit,
      select: {
        order_id: true,
        order_number: true,
        order_date: true,
        grand_total: true,
        customer: { select: { customer_name: true } },
        order_status: true
      }
    }),
    prisma.tbl_tailor_order.findMany({
      where: { status: { not: 'cancelled' }, ...scopeWhere(scope) },
      orderBy: { order_date: 'desc' },
      take: limit,
      select: {
        tailor_order_id: true,
        order_number: true,
        order_date: true,
        price: true,
        advance_paid: true,
        status: true,
        customer: { select: { customer_name: true } },
      }
    }),
  ])

  // Prisma's Decimal and Date types can't cross the server/client boundary
  // as-is — Next.js only allows plain serializable objects through.
  const posStatusLabels: Record<number, string> = { 0: 'Pending', 1: 'Cancelled', 2: 'Completed' }

  const posRows = orders.map((o) => ({
    id: o.order_id,
    order_number: o.order_number || `#${o.order_id}`,
    order_date: o.order_date.toISOString(),
    grand_total: Number(o.grand_total),
    customer: o.customer,
    status_label: posStatusLabels[o.order_status] ?? 'Unknown',
    type: 'pos' as const,
  }))

  const tailorRows = tailorOrders.map((t) => ({
    id: t.tailor_order_id,
    order_number: t.order_number || `#${t.tailor_order_id}`,
    order_date: t.order_date.toISOString(),
    grand_total: Number(t.price), // full order value, not just what's been collected — matches what POS "Order Total" shows
    customer: t.customer,
    status_label: STATUS_LABELS[t.status] || t.status, // real tailor stage (Received/In Process/Ready/Delivered), not a faked POS status
    type: 'tailor' as const,
  }))

  // Merge both lists, sort by date, then trim to the requested limit —
  // without this, a shop with heavy tailor activity could show nothing
  // but POS sales, or vice versa, instead of a true mix of what's
  // actually most recent.
  return [...posRows, ...tailorRows]
    .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
    .slice(0, limit)
}
