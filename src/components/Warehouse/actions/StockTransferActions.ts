'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeShopIdForWrite } from '@/lib/getShopScope'
import { logActivity } from '@/lib/auditLog'

export type TransferItemInput = {
  product_id: number
  quantity: number
  unit_price: number
}

// ── Create / Send ────────────────────────────────────────────────────────

export async function CreateStockTransfer(data: {
  to_shop_id: number
  items: TransferItemInput[]
  notes?: string
  created_by: string
  from_shop_id_override?: number // only honored for super admins (shop-switcher)
}) {
  const scope = await getShopScope()
  if (!scope.isWarehouse) {
    throw new Error('Only a warehouse-flagged shop can send stock transfers — Head Office is reports-only')
  }
  const fromShopId = data.from_shop_id_override ?? scopeShopIdForWrite(scope)

  if (fromShopId === data.to_shop_id) {
    throw new Error('Cannot transfer stock to the same shop')
  }
  if (!data.items || data.items.length === 0) {
    throw new Error('Add at least one product to the transfer')
  }

  const destShop = await prisma.tbl_shop.findUnique({ where: { shop_id: data.to_shop_id } })
  if (!destShop) throw new Error('Destination franchise not found')

  // Confirm the sending shop has enough stock of every item
  const productIds = data.items.map(i => i.product_id)
  const inventories = await prisma.tbl_inventory.findMany({
    where: { product_id: { in: productIds }, shop_id: fromShopId },
  })
  const invMap = new Map(inventories.map(i => [i.product_id, i]))

  for (const item of data.items) {
    const inv = invMap.get(item.product_id)
    const available = inv ? Number(inv.product_quantity) : 0
    if (available < item.quantity) {
      const product = await prisma.tbl_product.findUnique({ where: { product_id: item.product_id } })
      throw new Error(`Not enough stock of "${product?.product_name || item.product_id}" — have ${available}, tried to send ${item.quantity}`)
    }
  }

  const products = await prisma.tbl_product.findMany({
    where: { product_id: { in: productIds } },
    select: { product_id: true, product_name: true },
  })
  const productMap = new Map(products.map(p => [p.product_id, p]))

  // Generate a network-wide sequential tracking number
  const last = await prisma.tbl_stock_transfer.findFirst({
    orderBy: { transfer_id: 'desc' },
    select: { transfer_number: true },
  })
  const lastNum = last ? parseInt(last.transfer_number.replace(/\D/g, ''), 10) || 0 : 0
  const transfer_number = `MLNP-${String(lastNum + 1).padStart(4, '0')}`

  const total_amount = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  const transfer = await prisma.$transaction(async (tx) => {
    const created = await tx.tbl_stock_transfer.create({
      data: {
        transfer_number,
        from_shop_id: fromShopId,
        to_shop_id: data.to_shop_id,
        status: 'pending',
        total_amount,
        notes: data.notes || null,
        created_by: data.created_by,
        items: {
          create: data.items.map(i => ({
            product_id: i.product_id,
            product_name: productMap.get(i.product_id)?.product_name || 'Unknown',
            quantity: i.quantity,
            unit_price: i.unit_price,
            sub_total: i.quantity * i.unit_price,
          })),
        },
      },
    })

    // Deduct stock from the sending shop immediately
    for (const item of data.items) {
      const inv = invMap.get(item.product_id)!
      await tx.tbl_inventory.update({
        where: { inventory_id: inv.inventory_id },
        data: { product_quantity: { decrement: item.quantity } },
      })
    }

    return created
  })

  await logActivity({
    action: 'transfer.send',
    entityType: 'stock_transfer',
    entityId: transfer.transfer_id,
    description: `Sent transfer ${transfer_number} to ${destShop.shop_name} — ${data.items.length} product(s), total ${total_amount.toFixed(2)}`,
    shopIdOverride: fromShopId,
  })

  return transfer
}

// ── Receive ──────────────────────────────────────────────────────────────

export async function ReceiveStockTransfer(transfer_id: number, receivedBy: string) {
  const scope = await getShopScope()
  if (!scope.isWarehouse) {
    throw new Error('Only a warehouse-flagged shop can do this — Head Office is reports-only')
  }
  const transfer = await prisma.tbl_stock_transfer.findUnique({
    where: { transfer_id },
    include: { items: true },
  })
  if (!transfer) throw new Error('Transfer not found')
  if (!scope.isSuperAdmin && transfer.from_shop_id !== scope.shopId) {
    throw new Error('Only the shop that sent this transfer can mark it as delivered')
  }
  if (transfer.status !== 'pending') {
    throw new Error(`Transfer is already ${transfer.status}`)
  }

  // Marking a transfer "received" only confirms delivery for billing
  // purposes — it does NOT add stock to the destination franchise's
  // inventory. The stock already left the sender's inventory when it was
  // sent; the franchise records it as their own incoming stock (the same
  // way they'd record any purchase) once they've actually taken it in.
  await prisma.tbl_stock_transfer.update({
    where: { transfer_id },
    data: { status: 'received', received_date: new Date() },
  })

  await logActivity({
    action: 'transfer.receive',
    entityType: 'stock_transfer',
    entityId: transfer_id,
    description: `Transfer ${transfer.transfer_number} marked as delivered — ${transfer.items.length} product(s), franchise records the stock intake separately`,
    shopIdOverride: transfer.to_shop_id,
  })

  return { success: true }
}

export async function CancelStockTransfer(transfer_id: number, cancelledBy: string) {
  const scope = await getShopScope()
  if (!scope.isWarehouse) {
    throw new Error('Only a warehouse-flagged shop can do this — Head Office is reports-only')
  }
  const transfer = await prisma.tbl_stock_transfer.findUnique({
    where: { transfer_id },
    include: { items: true },
  })
  if (!transfer) throw new Error('Transfer not found')
  if (!scope.isSuperAdmin && transfer.from_shop_id !== scope.shopId) {
    throw new Error('Only the shop that sent this transfer can cancel it')
  }
  if (transfer.status !== 'pending') {
    throw new Error(`Cannot cancel a transfer that is already ${transfer.status}`)
  }

  await prisma.$transaction(async (tx) => {
    // Restore stock to the sender
    for (const item of transfer.items) {
      const inv = await tx.tbl_inventory.findFirst({
        where: { product_id: item.product_id, shop_id: transfer.from_shop_id },
      })
      if (inv) {
        await tx.tbl_inventory.update({
          where: { inventory_id: inv.inventory_id },
          data: { product_quantity: { increment: item.quantity } },
        })
      }
    }
    await tx.tbl_stock_transfer.update({
      where: { transfer_id },
      data: { status: 'cancelled' },
    })
  })

  await logActivity({
    action: 'transfer.cancel',
    entityType: 'stock_transfer',
    entityId: transfer_id,
    description: `Cancelled transfer ${transfer.transfer_number} — stock restored to sender`,
    shopIdOverride: transfer.from_shop_id,
  })

  return { success: true }
}

// ── Payments (settling the balance) ─────────────────────────────────────

export async function RecordTransferPayment(data: {
  transfer_id: number
  amount: number
  method: string
  note?: string
  recorded_by: string
}) {
  const scope = await getShopScope()
  if (!scope.isWarehouse) {
    throw new Error('Only a warehouse-flagged shop can do this — Head Office is reports-only')
  }
  const transfer = await prisma.tbl_stock_transfer.findUnique({ where: { transfer_id: data.transfer_id } })
  if (!transfer) throw new Error('Transfer not found')
  if (!scope.isSuperAdmin && transfer.from_shop_id !== scope.shopId && transfer.to_shop_id !== scope.shopId) {
    throw new Error('This transfer does not involve your shop')
  }

  const balance = Number(transfer.total_amount) - Number(transfer.amount_paid)
  if (data.amount > balance) {
    throw new Error(`Payment (${data.amount}) exceeds remaining balance (${balance.toFixed(2)})`)
  }

  await prisma.$transaction(async (tx) => {
    await tx.tbl_stock_transfer_payment.create({
      data: {
        transfer_id: data.transfer_id,
        amount: data.amount,
        method: data.method,
        note: data.note || null,
        recorded_by: data.recorded_by,
      },
    })
    await tx.tbl_stock_transfer.update({
      where: { transfer_id: data.transfer_id },
      data: { amount_paid: { increment: data.amount } },
    })
  })

  await logActivity({
    action: 'transfer.payment',
    entityType: 'stock_transfer',
    entityId: data.transfer_id,
    description: `Payment of ${data.amount.toFixed(2)} (${data.method}) recorded on transfer ${transfer.transfer_number}`,
    shopIdOverride: transfer.to_shop_id,
  })

  return { success: true }
}

// ── Fetching ─────────────────────────────────────────────────────────────

export async function FetchTransfers(direction: 'all' | 'incoming' | 'outgoing' = 'all') {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin && !scope.isWarehouse) return []

  // Head Office (or a warehouse-flagged shop) can filter by direction
  // relative to its own shop. A non-super-admin warehouse shop only ever
  // sees its own transfers, never another shop's.
  const actingShopId = scope.shopId ?? 1
  const where: any = {}
  if (direction === 'incoming') where.to_shop_id = actingShopId
  else if (direction === 'outgoing') where.from_shop_id = actingShopId
  else if (!scope.isSuperAdmin) where.OR = [{ from_shop_id: actingShopId }, { to_shop_id: actingShopId }]

  const transfers = await prisma.tbl_stock_transfer.findMany({
    where,
    include: {
      from_shop: { select: { shop_name: true, shop_code: true } },
      to_shop: { select: { shop_name: true, shop_code: true } },
      items: true,
    },
    orderBy: { transfer_id: 'desc' },
  })

  return transfers.map(t => ({
    ...t,
    total_amount: Number(t.total_amount),
    amount_paid: Number(t.amount_paid),
    balance: Number(t.total_amount) - Number(t.amount_paid),
    sent_date: t.sent_date.toISOString(),
    received_date: t.received_date ? t.received_date.toISOString() : null,
    items: t.items.map(i => ({
      ...i,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      sub_total: Number(i.sub_total),
    })),
  }))
}

export async function FetchTransferById(transfer_id: number) {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin && !scope.isWarehouse) return null
  const transfer = await prisma.tbl_stock_transfer.findUnique({
    where: { transfer_id },
    include: {
      from_shop: { select: { shop_name: true, shop_code: true } },
      to_shop: { select: { shop_name: true, shop_code: true } },
      items: true,
      payments: { orderBy: { paid_at: 'desc' } },
    },
  })
  if (!transfer) return null

  // A non-super-admin warehouse shop can only view transfers that
  // actually involve its own shop — never another shop's.
  if (!scope.isSuperAdmin && transfer.from_shop_id !== scope.shopId && transfer.to_shop_id !== scope.shopId) {
    return null
  }

  return {
    ...transfer,
    total_amount: Number(transfer.total_amount),
    amount_paid: Number(transfer.amount_paid),
    balance: Number(transfer.total_amount) - Number(transfer.amount_paid),
    sent_date: transfer.sent_date.toISOString(),
    received_date: transfer.received_date ? transfer.received_date.toISOString() : null,
    items: transfer.items.map(i => ({
      ...i,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      sub_total: Number(i.sub_total),
    })),
    payments: transfer.payments.map(p => ({
      ...p,
      amount: Number(p.amount),
      paid_at: p.paid_at.toISOString(),
    })),
  }
}

/** Per-franchise running balance across all their stock transfers — the "remains" view. */
export async function FetchFranchiseBalances() {
  const scope = await getShopScope()
  if (!scope.isSuperAdmin) return []

  const shops = await prisma.tbl_shop.findMany({ where: { is_active: true } })
  const transfers = await prisma.tbl_stock_transfer.findMany({ where: { status: { not: 'cancelled' } } })

  return shops.map(shop => {
    const owedByThisShop = transfers
      .filter(t => t.to_shop_id === shop.shop_id)
      .reduce((s, t) => s + (Number(t.total_amount) - Number(t.amount_paid)), 0)
    const owedToThisShop = transfers
      .filter(t => t.from_shop_id === shop.shop_id)
      .reduce((s, t) => s + (Number(t.total_amount) - Number(t.amount_paid)), 0)

    return {
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      shop_code: shop.shop_code,
      owes: owedByThisShop, // what this shop owes for stock it received
      owed: owedToThisShop, // what this shop is owed for stock it sent out
      net: owedToThisShop - owedByThisShop,
    }
  })
}
