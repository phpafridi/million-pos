'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export type TailorReportData = {
  dueSoon: {
    tailor_order_id: number
    order_number: string
    customer_name: string
    phone: string
    garment_type: string
    promised_date: string | null
    status: string
    status_label: string
  }[]
  overdue: {
    tailor_order_id: number
    order_number: string
    customer_name: string
    phone: string
    garment_type: string
    promised_date: string | null
    status: string
    status_label: string
    days_overdue: number
  }[]
  statusCounts: Record<string, number>
  revenue: {
    total_orders: number
    total_price: number
    total_advance_collected: number
    total_balance_due: number
    average_order_value: number
  }
  garmentBreakdown: { garment_type: string; count: number; total_price: number }[]
  topCustomers: { customer_id: number; customer_name: string; phone: string; order_count: number; total_spent: number }[]
}

const STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  in_process: 'In Process',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export async function FetchTailorReport(startDate: string, endDate: string): Promise<TailorReportData> {
  const scope = await getShopScope()
  const where = scopeWhere(scope)

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  // Orders promised within the next 7 days that aren't finished yet —
  // the "what needs attention" list for the shop.
  const soon = new Date()
  soon.setDate(soon.getDate() + 7)

  const [dueSoonRaw, overdueRaw, statusGroups, revenueOrders, garmentGroups, customerOrders] = await Promise.all([
    prisma.tbl_tailor_order.findMany({
      where: {
        ...where,
        status: { in: ['received', 'in_process', 'ready'] },
        promised_date: { not: null, lte: soon },
      },
      include: { customer: { select: { customer_name: true, phone: true } } },
      orderBy: { promised_date: 'asc' },
      take: 50,
    }),
    prisma.tbl_tailor_order.findMany({
      where: {
        ...where,
        status: { in: ['received', 'in_process', 'ready'] },
        promised_date: { not: null, lt: new Date() },
      },
      include: { customer: { select: { customer_name: true, phone: true } } },
      orderBy: { promised_date: 'asc' },
      take: 50,
    }),
    prisma.tbl_tailor_order.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    }),
    prisma.tbl_tailor_order.findMany({
      where: { ...where, order_date: { gte: start, lte: end }, status: { not: 'cancelled' } },
      select: { price: true, advance_paid: true, garment_type: true },
    }),
    prisma.tbl_tailor_order.groupBy({
      by: ['garment_type'],
      where: { ...where, order_date: { gte: start, lte: end }, status: { not: 'cancelled' } },
      _count: { garment_type: true },
      _sum: { price: true },
    }),
    prisma.tbl_tailor_order.findMany({
      where: { ...where, order_date: { gte: start, lte: end }, status: { not: 'cancelled' } },
      select: { customer_id: true, price: true, customer: { select: { customer_name: true, phone: true } } },
    }),
  ])

  const statusCounts: Record<string, number> = {}
  for (const g of statusGroups) statusCounts[g.status] = g._count.status

  const total_price = revenueOrders.reduce((s, o) => s + Number(o.price), 0)
  const total_advance_collected = revenueOrders.reduce((s, o) => s + Number(o.advance_paid), 0)

  const garmentBreakdown = garmentGroups
    .map((g) => ({
      garment_type: g.garment_type,
      count: g._count.garment_type,
      total_price: Number(g._sum.price || 0),
    }))
    .sort((a, b) => b.total_price - a.total_price)

  const customerTotals = new Map<number, { customer_name: string; phone: string; order_count: number; total_spent: number }>()
  for (const o of customerOrders) {
    const existing = customerTotals.get(o.customer_id)
    if (existing) {
      existing.order_count += 1
      existing.total_spent += Number(o.price)
    } else {
      customerTotals.set(o.customer_id, {
        customer_name: o.customer.customer_name,
        phone: o.customer.phone,
        order_count: 1,
        total_spent: Number(o.price),
      })
    }
  }
  const topCustomers = Array.from(customerTotals.entries())
    .map(([customer_id, v]) => ({ customer_id, ...v }))
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 10)

  const now = Date.now()

  return {
    dueSoon: dueSoonRaw.map((o) => ({
      tailor_order_id: o.tailor_order_id,
      order_number: o.order_number,
      customer_name: o.customer.customer_name,
      phone: o.customer.phone,
      garment_type: o.garment_type,
      promised_date: o.promised_date ? o.promised_date.toISOString() : null,
      status: o.status,
      status_label: STATUS_LABELS[o.status] || o.status,
    })),
    overdue: overdueRaw.map((o) => ({
      tailor_order_id: o.tailor_order_id,
      order_number: o.order_number,
      customer_name: o.customer.customer_name,
      phone: o.customer.phone,
      garment_type: o.garment_type,
      promised_date: o.promised_date ? o.promised_date.toISOString() : null,
      status: o.status,
      status_label: STATUS_LABELS[o.status] || o.status,
      days_overdue: o.promised_date ? Math.floor((now - o.promised_date.getTime()) / 86400000) : 0,
    })),
    statusCounts,
    revenue: {
      total_orders: revenueOrders.length,
      total_price,
      total_advance_collected,
      total_balance_due: total_price - total_advance_collected,
      average_order_value: revenueOrders.length > 0 ? total_price / revenueOrders.length : 0,
    },
    garmentBreakdown,
    topCustomers,
  }
}
