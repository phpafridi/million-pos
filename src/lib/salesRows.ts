import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { getRefundsByOrder, netOfRefund, SaleLine } from '@/lib/orderRefunds'

export interface SalesRow {
  id: number
  invoiceDate: Date
  invoiceNo: string | null
  buyingCost: number
  sellingCost: number
  tax: number
  discount: number
  grandTotal: number   // NET: order total − refunded
  refunded: number     // money refunded on this invoice (0 if none)
  profit: number
  shopName?: string
}

/**
 * Rows for the Sales Report and Sales Summary.
 * Included: confirmed (2) and exchanged (4) orders, plus PARTIALLY refunded
 * orders (status 3 with something left after the refund). Amounts are net of
 * refunds. A fully refunded order nets to zero and is left out.
 */
export async function buildSalesRows(startDate: string, endDate: string): Promise<SalesRow[]> {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0)
  const end = new Date(endDate); end.setHours(23, 59, 59, 999)

  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  const invoices: any[] = allShops
    ? await prisma.$queryRaw`
        SELECT i.invoice_id, i.invoice_date, i.invoice_number, o.order_id,
               CAST(o.grand_total AS DOUBLE) AS grand_total,
               CAST(o.discount_amount AS DOUBLE) AS discount_amount,
               o.order_status, s.shop_name
        FROM tbl_invoice i
        JOIN tbl_order o ON o.order_id = i.order_id
        JOIN tbl_shop s ON s.shop_id = o.shop_id
        WHERE i.invoice_date >= ${start} AND i.invoice_date <= ${end}
          AND ((o.order_status IN (2, 4) AND i.invoice_no IS NOT NULL) OR o.order_status = 3)
        ORDER BY i.invoice_date ASC`
    : await prisma.$queryRaw`
        SELECT i.invoice_id, i.invoice_date, i.invoice_number, o.order_id,
               CAST(o.grand_total AS DOUBLE) AS grand_total,
               CAST(o.discount_amount AS DOUBLE) AS discount_amount,
               o.order_status, s.shop_name
        FROM tbl_invoice i
        JOIN tbl_order o ON o.order_id = i.order_id
        JOIN tbl_shop s ON s.shop_id = o.shop_id
        WHERE i.invoice_date >= ${start} AND i.invoice_date <= ${end}
          AND ((o.order_status IN (2, 4) AND i.invoice_no IS NOT NULL) OR o.order_status = 3)
          AND o.shop_id = ${scope.shopId}
        ORDER BY i.invoice_date ASC`

  if (invoices.length === 0) return []
  const refunds = await getRefundsByOrder(invoices.map(i => Number(i.order_id)))

  const rows: SalesRow[] = []
  for (const inv of invoices) {
    const orderId = Number(inv.order_id)
    const refund = refunds.get(orderId)
    const refunded = refund?.amount ?? 0
    const gross = Number(inv.grand_total) || 0
    const net = Math.max(0, Math.round((gross - refunded) * 100) / 100)

    // Status 3 = refunded. Only keep it if part of the sale is still standing.
    if (Number(inv.order_status) === 3 && (refunded <= 0 || net <= 0.005)) continue

    const lines: SaleLine[] = (await prisma.$queryRaw<any[]>`
      SELECT product_id,
             CAST(buying_price AS DOUBLE) AS buying_price,
             CAST(selling_price AS DOUBLE) AS selling_price,
             CAST(product_quantity AS DOUBLE) AS product_quantity,
             CAST(product_tax AS DOUBLE) AS product_tax
      FROM tbl_order_details WHERE order_id = ${orderId}`).map(d => ({
        product_id: Number(d.product_id),
        buying_price: Number(d.buying_price) || 0,
        selling_price: Number(d.selling_price) || 0,
        product_quantity: Number(d.product_quantity) || 0,
        product_tax: Number(d.product_tax) || 0,
      }))

    const n = netOfRefund(lines, refund)
    const discountFull = Number(inv.discount_amount) || 0
    // Order-level discount shrinks in proportion to what was kept.
    const discount = n.grossSelling > 0 ? discountFull * (n.selling / n.grossSelling) : discountFull

    rows.push({
      id: Number(inv.invoice_id),
      invoiceDate: new Date(inv.invoice_date),
      invoiceNo: inv.invoice_number ?? null,
      buyingCost: n.buying,
      sellingCost: n.selling,
      tax: n.tax,
      discount,
      grandTotal: net,
      refunded,
      profit: n.selling - n.buying - discount,
      shopName: inv.shop_name,
    })
  }
  return rows
}
