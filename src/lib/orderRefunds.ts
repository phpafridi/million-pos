import { prisma } from '@/lib/prisma'
import { paidShare } from '@/lib/refundMath'

export { paidShare }

// Money refunded to customers (payment returns only — an exchange moves no
// money) per order, plus how many units of each product came back.
//
// A payment refund marks the whole order as returned (status 3) even when only
// SOME items came back. Screens and reports use this to show what the sale is
// really worth now: order total − refunded.
//
// Returned items are recorded at their full selling price. If the order had a
// discount, the customer never paid that full price, so the money value of a
// refund is scaled by (what was paid ÷ price before discount). Example from
// live data: 2600 item, 2500 discount, customer paid 100 → refund worth 100.
export type OrderRefund = { amount: number; qtyByProduct: Map<number, number> }

export async function getRefundsByOrder(orderIds: number[]): Promise<Map<number, OrderRefund>> {
  const map = new Map<number, OrderRefund>()
  const ids = Array.from(new Set(orderIds.filter(n => Number.isFinite(n))))
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = ids.slice(i, i + 1000)
    const returns = await prisma.tbl_return.findMany({
      where: { order_id: { in: chunk }, return_type: 'payment' },
      select: {
        order_id: true,
        order: { select: { grand_total: true, sub_total: true } },
        items: { where: { item_type: 'returned' }, select: { product_id: true, qty: true, sub_total: true } },
      },
    })
    for (const r of returns) {
      const cur = map.get(r.order_id) ?? { amount: 0, qtyByProduct: new Map<number, number>() }
      const share = paidShare(Number(r.order.grand_total), Number(r.order.sub_total))
      for (const it of r.items) {
        cur.amount += Number(it.sub_total) * share
        cur.qtyByProduct.set(it.product_id, (cur.qtyByProduct.get(it.product_id) ?? 0) + Number(it.qty))
      }
      map.set(r.order_id, cur)
    }
  }
  for (const v of map.values()) v.amount = Math.round(v.amount * 100) / 100
  return map
}

export type SaleLine = {
  product_id: number
  buying_price: number
  selling_price: number
  product_quantity: number
  product_tax: number
}

/**
 * Cost / selling / tax of an order's lines AFTER taking out refunded units.
 * Refunded qty of a product is taken off that product's lines in order, so a
 * product sold on two lines (e.g. two batches) is handled correctly.
 */
export function netOfRefund(lines: SaleLine[], refund?: OrderRefund) {
  const left = new Map(refund?.qtyByProduct ?? [])
  let buying = 0, selling = 0, tax = 0, grossSelling = 0
  for (const l of lines) {
    const qty = Number(l.product_quantity) || 0
    const back = Math.min(qty, left.get(l.product_id) ?? 0)
    if (back > 0) left.set(l.product_id, (left.get(l.product_id) ?? 0) - back)
    const keep = qty - back
    grossSelling += l.selling_price * qty
    buying += l.buying_price * keep
    selling += l.selling_price * keep
    tax += qty > 0 ? (Number(l.product_tax) || 0) * (keep / qty) : 0
  }
  return { buying, selling, tax, grossSelling }
}
