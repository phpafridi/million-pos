'use server'

import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export type ReturnItem = {
  product_id: number
  product_name: string
  product_code: string
  qty: number
  unit_price: number
}

export type ExchangeItem = {
  product_id: number
  product_name: string
  product_code: string
  qty: number
  unit_price: number
}

export type ReturnPayload = {
  order_id: number
  return_type: 'payment' | 'exchange'
  // Only meaningful when return_type = 'payment'. How the money actually
  // went back to the customer — distinct from an exchange, where no cash
  // moves at all.
  refund_method?: 'cash' | 'card' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'store_credit'
  returned_items: ReturnItem[]
  exchange_items?: ExchangeItem[]
  note?: string
  processed_by: string
}

export async function ProcessReturn(payload: ReturnPayload) {
  try {
    const { order_id, return_type, refund_method, returned_items, exchange_items, note, processed_by } = payload

    if (!returned_items || returned_items.length === 0) {
      throw new Error('No return items specified')
    }

    if (return_type === 'exchange') {
      if (!exchange_items || exchange_items.length === 0) {
        throw new Error('Exchange items are required for exchange return type')
      }
      const returnTotal   = returned_items.reduce((s, i) => s + i.qty * i.unit_price, 0)
      const exchangeTotal = exchange_items.reduce((s, i) => s + i.qty * i.unit_price, 0)
      if (Math.abs(returnTotal - exchangeTotal) > returnTotal * 0.05 + 1) {
        throw new Error(
          `Exchange value mismatch: returned ${returnTotal.toFixed(2)} vs exchange ${exchangeTotal.toFixed(2)}`
        )
      }
    }

    // The return always belongs to the same shop as the original order —
    // stock gets restored/deducted there, not wherever the current user
    // happens to be scoped to (relevant for a CEO processing a return
    // on behalf of a franchise).
    const order = await prisma.tbl_order.findUnique({
      where: { order_id },
      select: { shop_id: true },
    })
    if (!order) throw new Error('Original order not found')
    const shopId = order.shop_id

    const scope = await getShopScope()
    if (!scope.isSuperAdmin && scope.shopId !== shopId) {
      throw new Error('This order does not belong to your franchise')
    }

    // ── Fetch all inventories upfront ────────────────────────────────────────
    const allProductIds = [
      ...returned_items.map(i => i.product_id),
      ...(exchange_items?.map(i => i.product_id) ?? []),
    ]
    const inventories = await prisma.tbl_inventory.findMany({
      where: { product_id: { in: allProductIds }, shop_id: shopId },
    })
    const invMap = new Map(inventories.map(i => [i.product_id, i]))

    // ── 1. Create return header ──────────────────────────────────────────────
    const returnNo = Math.floor(Date.now() / 1000)
    const returnRecord = await prisma.tbl_return.create({
      data: {
        shop_id: shopId,
        return_no: returnNo,
        order_id,
        return_type,
        refund_method: return_type === 'payment' ? (refund_method || 'cash') : null,
        note: note || '',
        processed_by,
      },
    })

    // ── 2. Insert returned items + restore inventory ─────────────────────────
    for (const item of returned_items) {
      await prisma.$executeRaw`
        INSERT INTO tbl_return_item (
          return_id, product_id, product_name, product_code,
          qty, unit_price, sub_total, item_type
        ) VALUES (
          ${returnRecord.return_id}, ${item.product_id},
          ${item.product_name}, ${item.product_code},
          CAST(${item.qty} AS DECIMAL(10,1)),
          CAST(${item.unit_price} AS DECIMAL(10,2)),
          CAST(${item.qty * item.unit_price} AS DECIMAL(10,2)),
          'returned'
        )
      `
      const inv = invMap.get(item.product_id)
      if (inv) {
        const newQty = Number(inv.product_quantity) + Number(item.qty)
        await prisma.$executeRaw`
          UPDATE tbl_inventory
          SET product_quantity = CAST(${newQty} AS DECIMAL(10,1))
          WHERE inventory_id = ${inv.inventory_id}
        `
        // Update local map so subsequent items use fresh qty
        invMap.set(item.product_id, { ...inv, product_quantity: newQty as any })
      }
    }

    if (return_type === 'payment') {
      // ── 3a. Payment return: void order + invoice ─────────────────────────
      await prisma.$executeRaw`UPDATE tbl_order SET order_status = 3 WHERE order_id = ${order_id}`
      await prisma.$executeRaw`UPDATE tbl_invoice SET invoice_no = NULL WHERE order_id = ${order_id}`

    } else if (return_type === 'exchange' && exchange_items) {
      // ── 3b. Exchange: insert exchange items + deduct inventory ────────────
      for (const exItem of exchange_items) {
        await prisma.$executeRaw`
          INSERT INTO tbl_return_item (
            return_id, product_id, product_name, product_code,
            qty, unit_price, sub_total, item_type
          ) VALUES (
            ${returnRecord.return_id}, ${exItem.product_id},
            ${exItem.product_name}, ${exItem.product_code},
            CAST(${exItem.qty} AS DECIMAL(10,1)),
            CAST(${exItem.unit_price} AS DECIMAL(10,2)),
            CAST(${exItem.qty * exItem.unit_price} AS DECIMAL(10,2)),
            'exchange'
          )
        `
        const inv = invMap.get(exItem.product_id)
        if (inv) {
          const newQty = Number(inv.product_quantity) - Number(exItem.qty)
          await prisma.$executeRaw`
            UPDATE tbl_inventory
            SET product_quantity = CAST(${newQty} AS DECIMAL(10,1))
            WHERE inventory_id = ${inv.inventory_id}
          `
          invMap.set(exItem.product_id, { ...inv, product_quantity: newQty as any })
        }
      }
      await prisma.$executeRaw`UPDATE tbl_order SET order_status = 4 WHERE order_id = ${order_id}`
    }

    const totalReturned = returned_items.reduce((s, i) => s + i.qty * i.unit_price, 0)
    await logActivity({
      action: return_type === 'payment' ? 'refund.process' : 'exchange.process',
      entityType: 'return',
      entityId: returnRecord.return_id,
      description: return_type === 'payment'
        ? `Refund #${returnRecord.return_no} for order #${order_id} — ${returned_items.length} item(s), ${totalReturned.toFixed(2)} refunded via ${refund_method || 'cash'}`
        : `Exchange #${returnRecord.return_no} for order #${order_id} — ${returned_items.length} returned, ${exchange_items?.length ?? 0} exchanged`,
      shopIdOverride: shopId,
    })

    return {
      success:   true,
      return_id: returnRecord.return_id,
      return_no: returnRecord.return_no,
      message: return_type === 'payment'
        ? 'Payment return processed successfully. Stock restored.'
        : 'Exchange processed successfully. Stock updated.',
    }
  } catch (err: any) {
    console.error('❌ ProcessReturn error:', err)
    return { success: false, message: err.message || 'Failed to process return' }
  }
}

export async function FetchReturnByOrder(order_id: number) {
  try {
    const scope = await getShopScope()
    const returns = await prisma.tbl_return.findMany({
      where:   { order_id, order: scopeWhere(scope) },
      include: {
        items: {
          include: {
            product: {
              select: {
                attributes: { select: { attribute_name: true, attribute_value: true } },
              },
            },
          },
        },
      },
      orderBy: { return_date: 'desc' },
    })
    return returns.map(r => ({
      ...r,
      return_date: r.return_date.toISOString(),
      items: r.items.map(item => ({
        ...item,
        qty:        Number(item.qty),
        unit_price: Number(item.unit_price),
        sub_total:  Number(item.sub_total),
        attributes: item.product?.attributes || [],
      })),
    }))
  } catch { return [] }
}

export async function FetchAllReturns() {
  try {
    const scope = await getShopScope()
    const returns = await prisma.tbl_return.findMany({
      where: scopeWhere(scope),
      include: {
        order: { select: { order_id: true, order_no: true, customer_name: true, grand_total: true } },
        items: {
          include: {
            product: {
              select: {
                attributes: { select: { attribute_name: true, attribute_value: true } },
              },
            },
          },
        },
      },
      orderBy: { return_date: 'desc' },
    })
    return returns.map(r => ({
      ...r,
      return_date: r.return_date.toISOString(),
      order: { ...r.order, grand_total: Number(r.order.grand_total) },
      items: r.items.map(item => ({
        ...item,
        qty:        Number(item.qty),
        unit_price: Number(item.unit_price),
        sub_total:  Number(item.sub_total),
        attributes: item.product?.attributes || [],
      })),
    }))
  } catch { return [] }
}
