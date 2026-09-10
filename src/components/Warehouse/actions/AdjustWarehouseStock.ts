'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeShopIdForWrite } from '@/lib/getShopScope'
import { logActivity } from '@/lib/auditLog'

/**
 * Directly adds (or removes) stock in the Head Office warehouse without
 * going through a full supplier purchase — for initial stocking, manual
 * corrections, etc. Head Office only; a real factory/supplier purchase
 * should still go through New Purchase so it's properly costed and
 * batch-tracked.
 */
export async function AdjustWarehouseStock(data: {
  product_id: number
  quantity: number // positive to add, negative to remove
  reason?: string
  adjusted_by: string
}) {
  const scope = await getShopScope()
  if (!scope.isWarehouse) {
    throw new Error('Only a warehouse-flagged shop can directly adjust stock — Head Office is reports-only')
  }
  const shop_id = scopeShopIdForWrite(scope) // the warehouse's own shop

  if (!data.quantity || data.quantity === 0) {
    throw new Error('Enter a non-zero quantity')
  }

  const product = await prisma.tbl_product.findUnique({ where: { product_id: data.product_id } })
  if (!product) throw new Error('Product not found')

  const existing = await prisma.tbl_inventory.findFirst({ where: { product_id: data.product_id, shop_id } })

  if (existing) {
    const newQty = Number(existing.product_quantity) + data.quantity
    if (newQty < 0) throw new Error(`Not enough stock to remove — currently ${existing.product_quantity}`)
    await prisma.tbl_inventory.update({
      where: { inventory_id: existing.inventory_id },
      data: { product_quantity: newQty },
    })
  } else {
    if (data.quantity < 0) throw new Error('No existing stock to remove from')
    await prisma.tbl_inventory.create({
      data: { product_id: data.product_id, shop_id, product_quantity: data.quantity },
    })
  }

  await logActivity({
    action: 'warehouse.stock_adjust',
    entityType: 'product',
    entityId: data.product_id,
    description: `Warehouse stock ${data.quantity > 0 ? 'added' : 'removed'} for "${product.product_name}": ${data.quantity > 0 ? '+' : ''}${data.quantity}${data.reason ? ` — ${data.reason}` : ''}`,
    shopIdOverride: shop_id,
  })

  if (data.quantity > 0) {
    const { createGrn } = await import('@/lib/grn')
    await createGrn({
      shop_id,
      source_type: 'manual_adjustment',
      source_description: data.reason || 'Manual Stock Correction',
      received_by: data.adjusted_by,
      items: [{ product_id: data.product_id, quantity: data.quantity }],
    })
  }

  return { success: true }
}
