'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'

export interface SalesReportRow {
  id: number
  invoiceDate: Date
  invoiceNo: number | null
  buyingCost: number
  sellingCost: number
  tax: number
  discount: number
  grandTotal: number
  profit: number
}

export default async function FetchSalesReport(
  startDate: string,
  endDate: string
): Promise<SalesReportRow[]> {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  const scope = await getShopScope()
  const allShops = scope.isSuperAdmin || scope.shopId === null

  // Raw SQL — reliably excludes returned (3) and exchanged (4) orders
  // and voided invoices (invoice_no IS NULL)
  const invoices: any[] = allShops
    ? await prisma.$queryRaw`
        SELECT
          i.invoice_id,
          i.invoice_date,
          i.invoice_no,
          o.order_id,
          CAST(o.grand_total     AS DOUBLE) AS grand_total,
          CAST(o.discount_amount AS DOUBLE) AS discount_amount,
          o.order_status
        FROM tbl_invoice i
        JOIN tbl_order o ON o.order_id = i.order_id
        WHERE
          i.invoice_date >= ${start}
          AND i.invoice_date <= ${end}
          AND i.invoice_no IS NOT NULL
          AND o.order_status IN (2, 4)         -- confirmed + exchanged only, matches every other revenue report
        ORDER BY i.invoice_date ASC
      `
    : await prisma.$queryRaw`
        SELECT
          i.invoice_id,
          i.invoice_date,
          i.invoice_no,
          o.order_id,
          CAST(o.grand_total     AS DOUBLE) AS grand_total,
          CAST(o.discount_amount AS DOUBLE) AS discount_amount,
          o.order_status
        FROM tbl_invoice i
        JOIN tbl_order o ON o.order_id = i.order_id
        WHERE
          i.invoice_date >= ${start}
          AND i.invoice_date <= ${end}
          AND i.invoice_no IS NOT NULL
          AND o.order_status IN (2, 4)         -- confirmed + exchanged only, matches every other revenue report
          AND o.shop_id = ${scope.shopId}
        ORDER BY i.invoice_date ASC
      `

  if (invoices.length === 0) return []

  // Fetch details for each order individually to avoid Prisma.join complexity
  const rows: SalesReportRow[] = []

  for (const inv of invoices) {
    const orderId = Number(inv.order_id)

    const details: any[] = await prisma.$queryRaw`
      SELECT
        CAST(buying_price      AS DOUBLE) AS buying_price,
        CAST(selling_price     AS DOUBLE) AS selling_price,
        CAST(product_quantity  AS DOUBLE) AS product_quantity,
        CAST(product_tax       AS DOUBLE) AS product_tax
      FROM tbl_order_details
      WHERE order_id = ${orderId}
    `

    const buyingCost  = details.reduce((s, d) => s + d.buying_price  * d.product_quantity, 0)
    const sellingCost = details.reduce((s, d) => s + d.selling_price * d.product_quantity, 0)
    const tax         = details.reduce((s, d) => s + d.product_tax, 0)
    const discount    = Number(inv.discount_amount) || 0
    const grandTotal  = Number(inv.grand_total)
    const profit      = sellingCost - buyingCost - discount

    rows.push({
      id:          Number(inv.invoice_id),
      invoiceDate: new Date(inv.invoice_date),
      invoiceNo:   inv.invoice_no != null ? Number(inv.invoice_no) : null,
      buyingCost,
      sellingCost,
      tax,
      discount,
      grandTotal,
      profit,
    })
  }

  return rows
}
