'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeShopIdForWrite, scopeWhere } from '@/lib/getShopScope'
import { logActivity } from '@/lib/auditLog'

export type BatchItem = {
  product_id: number
  qty: number
  buying_price: number
  selling_price: number
  expiry_date?: string
  manufacture_date?: string
  batch_number?: string
  is_existing_batch?: boolean
}

export type BatchPurchasePayload = {
  supplier_id: number
  purchase_ref: string
  payment_method: string
  purchase_date?: string
  cart: BatchItem[]
  shop_id_override?: number // only honored for super admins, via a shop-switcher control
}

export async function SaveBatchPurchase(data: BatchPurchasePayload) {
  try {
    if (!data.supplier_id || !data.cart || data.cart.length === 0) {
      throw new Error('Supplier and at least one product are required')
    }

    const scope = await getShopScope()
    const shopId = scope.isSuperAdmin && data.shop_id_override
      ? data.shop_id_override
      : scopeShopIdForWrite(scope)

    const purchaseDate = data.purchase_date ? new Date(data.purchase_date) : new Date()

    // ── 1. Fetch supplier ────────────────────────────────────────────────────
    const supplier = await prisma.tbl_supplier.findUnique({
      where: { supplier_id: data.supplier_id },
    })
    if (!supplier) throw new Error('Supplier not found')

    const grandTotal = data.cart.reduce((sum, item) => sum + item.qty * item.buying_price, 0)

    // ── 2. Fetch all product details upfront ─────────────────────────────────
    const productIds = data.cart.map(i => i.product_id)
    const productDetails = await prisma.tbl_product.findMany({
      where: { product_id: { in: productIds } },
      select: { product_id: true, product_code: true, product_name: true },
    })
    const productMap = new Map(productDetails.map(p => [p.product_id, p]))

    // ── 3. Fetch this shop's inventory rows upfront ───────────────────────────
    const inventories = await prisma.tbl_inventory.findMany({
      where: { product_id: { in: productIds }, shop_id: shopId },
    })
    const invMap = new Map(inventories.map(i => [i.product_id, i]))

    // ── 4. Fetch this shop's product prices upfront ───────────────────────────
    const prices = await prisma.tbl_product_price.findMany({
      where: { product_id: { in: productIds }, shop_id: shopId },
    })
    const priceMap = new Map(prices.map(p => [p.product_id, p]))

    // ── 5. INSERT purchase header ────────────────────────────────────────────
    const purchaseOrderNumber = Math.floor(100000 + Math.random() * 900000)
    await prisma.$executeRaw`
      INSERT INTO tbl_purchase (
        shop_id, purchase_order_number, supplier_id, supplier_name,
        grand_total, purchase_ref, payment_method, payment_ref,
        purchase_by, datetime
      ) VALUES (
        ${shopId}, ${purchaseOrderNumber}, ${data.supplier_id}, ${supplier.supplier_name},
        ${grandTotal}, ${data.purchase_ref}, ${data.payment_method}, '',
        'Admin', ${purchaseDate}
      )
    `

    // ── 6. Get purchase_id ───────────────────────────────────────────────────
    const idResult: any[] = await prisma.$queryRaw`SELECT LAST_INSERT_ID() as purchase_id`
    const purchaseId = Number(idResult[0]?.purchase_id)
    if (!purchaseId) throw new Error('Failed to get purchase ID after insert')

    // ── 7. Process each cart item ────────────────────────────────────────────
    for (const item of data.cart) {
      const product      = productMap.get(item.product_id)
      const qty          = Number(item.qty)
      const buyingPrice  = Number(item.buying_price)
      const sellingPrice = Number(item.selling_price)

      // Insert purchase product audit record
      await prisma.$executeRaw`
        INSERT INTO tbl_purchase_product (
          purchase_id, product_id, product_code, product_name,
          qty, unit_price, sub_total
        ) VALUES (
          ${purchaseId}, ${item.product_id},
          ${product?.product_code || ''}, ${product?.product_name || ''},
          ${qty}, ${buyingPrice}, ${qty * buyingPrice}
        )
      `

      // Batch: top-up existing or create new
      if (item.is_existing_batch && item.batch_number) {
        await prisma.$executeRaw`
          UPDATE tbl_purchase_batch
          SET
            qty           = qty + ${qty},
            qty_remaining = qty_remaining + ${qty},
            buying_price  = ${buyingPrice},
            selling_price = ${sellingPrice},
            is_active     = true
          WHERE product_id   = ${item.product_id}
            AND shop_id      = ${shopId}
            AND batch_number = ${item.batch_number}
          LIMIT 1
        `
      } else {
        const batchNumber = (item.batch_number && item.batch_number.trim())
          ? item.batch_number.trim()
          : `B${purchaseId}-${item.product_id}-${Date.now()}`
        const expiryDate = item.expiry_date      ? new Date(item.expiry_date)      : null
        const mfgDate    = item.manufacture_date  ? new Date(item.manufacture_date) : null

        await prisma.$executeRaw`
          INSERT INTO tbl_purchase_batch (
            purchase_id, product_id, shop_id, product_code, product_name,
            batch_number, qty, qty_remaining,
            buying_price, selling_price,
            expiry_date, manufacture_date, purchase_date, is_active
          ) VALUES (
            ${purchaseId}, ${item.product_id}, ${shopId},
            ${product?.product_code || ''}, ${product?.product_name || ''},
            ${batchNumber}, ${qty}, ${qty},
            ${buyingPrice}, ${sellingPrice},
            ${expiryDate}, ${mfgDate}, ${purchaseDate}, true
          )
        `
      }

      // Update or create inventory
      const inv = invMap.get(item.product_id)
      if (inv) {
        const newQty = Number(inv.product_quantity) + qty
        await prisma.$executeRaw`
          UPDATE tbl_inventory
          SET product_quantity = CAST(${newQty} AS DECIMAL(10,1))
          WHERE inventory_id = ${inv.inventory_id}
        `
      } else {
        await prisma.$executeRaw`
          INSERT INTO tbl_inventory (product_id, shop_id, product_quantity, notify_quantity)
          VALUES (${item.product_id}, ${shopId}, ${qty}, 0)
        `
      }

      // Update product default price
      const existingPrice = priceMap.get(item.product_id)
      if (existingPrice) {
        await prisma.tbl_product_price.update({
          where: { product_price_id: existingPrice.product_price_id },
          data:  { buying_price: buyingPrice, selling_price: sellingPrice },
        })
      } else {
        await prisma.tbl_product_price.create({
          data: { product_id: item.product_id, shop_id: shopId, buying_price: buyingPrice, selling_price: sellingPrice },
        })
      }
    }

    await logActivity({
      action: 'purchase.create',
      entityType: 'purchase',
      entityId: purchaseId,
      description: `Purchase recorded — ${data.cart.length} item(s), ref: ${data.purchase_ref || 'n/a'}, supplier #${data.supplier_id}`,
      shopIdOverride: shopId,
    })

    return {
      success: true,
      message: 'Batch purchase saved successfully',
      purchase_id: purchaseId,
    }
  } catch (err: any) {
    console.error('❌ SaveBatchPurchase error:', err)
    return { success: false, message: err.message || 'Failed to save batch purchase' }
  }
}

export async function FetchBatchesByProduct(product_id: number) {
  try {
    const scope = await getShopScope()
    const batches = await prisma.tbl_purchase_batch.findMany({
      where:   { product_id, is_active: true, ...scopeWhere(scope) },
      orderBy: [{ expiry_date: 'asc' }, { purchase_date: 'asc' }],
    })
    return batches.map(b => ({
      ...b,
      qty:              Number(b.qty),
      qty_remaining:    Number(b.qty_remaining),
      buying_price:     Number(b.buying_price),
      selling_price:    Number(b.selling_price),
      expiry_date:      b.expiry_date      ? b.expiry_date.toISOString().slice(0, 10)      : null,
      manufacture_date: b.manufacture_date ? b.manufacture_date.toISOString().slice(0, 10) : null,
      purchase_date:    b.purchase_date.toISOString(),
    }))
  } catch { return [] }
}

export async function FetchAllBatches() {
  try {
    const scope = await getShopScope()
    const batches = await prisma.tbl_purchase_batch.findMany({
      where: scopeWhere(scope),
      include: {
        product:  { select: { product_name: true, product_code: true, measurement_units: true } },
        purchase: { select: { purchase_order_number: true, supplier_name: true } },
      },
      orderBy: [{ expiry_date: 'asc' }, { purchase_date: 'desc' }],
    })
    return batches.map(b => ({
      ...b,
      qty:              Number(b.qty),
      qty_remaining:    Number(b.qty_remaining),
      buying_price:     Number(b.buying_price),
      selling_price:    Number(b.selling_price),
      expiry_date:      b.expiry_date      ? b.expiry_date.toISOString().slice(0, 10)      : null,
      manufacture_date: b.manufacture_date ? b.manufacture_date.toISOString().slice(0, 10) : null,
      purchase_date:    b.purchase_date.toISOString(),
    }))
  } catch { return [] }
}
