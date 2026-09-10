import { prisma } from '@/lib/prisma'
import { nextGrnNumber } from '@/lib/documentNumbers'

export type GrnSourceType = 'supplier_purchase' | 'transfer' | 'manual_adjustment'

/**
 * Records a Goods Receive Note — called from all three places stock can
 * arrive at a warehouse (a supplier purchase, an incoming transfer, or a
 * manual correction), so every arrival gets the same document trail
 * regardless of source. Never throws on its own failure — a GRN record
 * is a paper trail, not something that should block the actual stock
 * movement it's documenting if something goes wrong writing the log.
 */
export async function createGrn(data: {
  shop_id: number
  source_type: GrnSourceType
  source_reference?: number
  source_description: string
  received_by: string
  notes?: string
  items: { product_id: number; quantity: number; unit_cost?: number }[]
}) {
  try {
    const grn_number = await nextGrnNumber(data.shop_id)

    const grn = await prisma.tbl_grn.create({
      data: {
        grn_number,
        shop_id: data.shop_id,
        source_type: data.source_type,
        source_reference: data.source_reference,
        source_description: data.source_description,
        received_by: data.received_by,
        notes: data.notes,
        items: {
          create: data.items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            unit_cost: i.unit_cost,
          })),
        },
      },
    })

    return grn
  } catch (err) {
    console.error('Failed to create GRN record:', err)
    return null
  }
}
