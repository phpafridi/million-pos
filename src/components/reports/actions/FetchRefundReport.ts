'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'
import { paidShare } from '@/lib/refundMath'

export interface RefundRow {
  returnId: number
  returnNo: string
  returnDate: string
  orderId: number
  orderNumber: string
  invoiceNo: string | null
  shopName: string
  method: string
  amount: number          // money value: what the customer had actually paid for these items
  listedAmount: number    // same items at full selling price (before any order discount)
  orderTotal: number
  items: string
  processedBy: string
  note: string
}

export interface RefundReport {
  rows: RefundRow[]
  total: number
  byMethod: { method: string; count: number; total: number }[]
  byShop: { shopName: string; count: number; total: number }[]
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer',
  easypaisa: 'Easypaisa', jazzcash: 'JazzCash', store_credit: 'Store Credit',
}

/** Payment refunds (money given back) in a date range — own franchise, or every franchise for Head Office. */
export default async function FetchRefundReport(startDate: string, endDate: string): Promise<RefundReport> {
  const empty: RefundReport = { rows: [], total: 0, byMethod: [], byShop: [] }
  try {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0)
    const end = new Date(endDate); end.setHours(23, 59, 59, 999)
    const scope = await getShopScope()

    const returns = await prisma.tbl_return.findMany({
      where: { ...scopeWhere(scope), return_type: 'payment', return_date: { gte: start, lte: end } },
      include: {
        shop: { select: { shop_name: true } },
        order: {
          select: {
            order_id: true, order_no: true, order_number: true, grand_total: true, sub_total: true,
            invoices: { select: { invoice_number: true } },
          },
        },
        items: { where: { item_type: 'returned' }, select: { product_name: true, qty: true, sub_total: true } },
      },
      orderBy: { return_date: 'asc' },
    })

    const rows: RefundRow[] = returns.map(r => {
      const listed = r.items.reduce((s, i) => s + Number(i.sub_total), 0)
      const share = paidShare(Number(r.order.grand_total), Number(r.order.sub_total))
      const amount = Math.round(listed * share * 100) / 100
      return {
        returnId: r.return_id,
        returnNo: `RET-${r.return_no}`,
        returnDate: r.return_date.toISOString(),
        orderId: r.order.order_id,
        orderNumber: r.order.order_number || String(r.order.order_no),
        invoiceNo: r.order.invoices[0]?.invoice_number ?? null,
        shopName: r.shop?.shop_name ?? '—',
        method: METHOD_LABEL[r.refund_method || 'cash'] || (r.refund_method ?? 'Cash'),
        amount,
        listedAmount: Math.round(listed * 100) / 100,
        orderTotal: Number(r.order.grand_total),
        items: r.items.map(i => `${i.product_name} × ${Number(i.qty)}`).join(', '),
        processedBy: r.processed_by,
        note: r.note || '',
      }
    })

    const group = <K extends string>(key: (r: RefundRow) => string, name: K) => {
      const m = new Map<string, { count: number; total: number }>()
      for (const r of rows) {
        const g = m.get(key(r)) ?? { count: 0, total: 0 }
        g.count++; g.total += r.amount
        m.set(key(r), g)
      }
      return [...m.entries()]
        .map(([k, v]) => ({ [name]: k, count: v.count, total: Math.round(v.total * 100) / 100 }))
        .sort((a, b) => b.total - a.total) as any[]
    }

    return {
      rows,
      total: Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100,
      byMethod: group(r => r.method, 'method'),
      byShop: group(r => r.shopName, 'shopName'),
    }
  } catch (err) {
    console.error('FetchRefundReport error:', err)
    return empty
  }
}
