'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export interface PurchaseReportRow {
  id: number
  ref: number
  supplier: string
  date: string
  items: {
    code: string
    name: string
    unit: string
    price: number
    qty: number
    total: number
  }[]
  grandTotal: number
}

export default async function FetchPurchaseReport(
  startDate: string,
  endDate: string
): Promise<PurchaseReportRow[]> {
  try {
    // Parse dates and include full end day
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const scope = await getShopScope()
    const purchases = await prisma.tbl_purchase.findMany({
      where: {
        datetime: {
          gte: start,
          lte: end,
        },
        ...scopeWhere(scope),
      },
      include: {
        supplier: true,
        details: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        purchase_id: 'desc',
      },
    })

    return purchases.map<PurchaseReportRow>((p) => ({
      id: p.purchase_id,
      ref: p.purchase_order_number,
      supplier: p.supplier.supplier_name,
      date: p.datetime.toISOString().split('T')[0],
      items: p.details.map((d) => {
        const packetSize = Number(d.product.packet_size) ?? 0  // Convert to number
        const qtyAsNumber = Number(d.qty)                     // Convert to number
        
        // Check if quantity is multiple of packet size (whole packets)
        const isWholePackets = packetSize > 0 && qtyAsNumber % packetSize === 0
        const displayQty = isWholePackets ? (qtyAsNumber / packetSize) : qtyAsNumber
        const displayUnit = isWholePackets ? 'packet' : d.product.measurement_units
        
        const price = Number(d.unit_price)  // Convert to number
        const total = Number(d.sub_total)   // Convert to number
        
        return {
          code: d.product.product_code,
          name: d.product.product_name,
          unit: displayUnit,
          price: price,
          qty: displayQty,
          total: total,
        }
      }),
      grandTotal: Number(p.grand_total),  // Convert to number
    }))
  } catch (error) {
    console.error('Error fetching purchase report:', error)
    return []
  }
}