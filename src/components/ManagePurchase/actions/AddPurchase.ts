'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeShopIdForWrite } from '@/lib/getShopScope'

type CartItem = {
  product_id: number
  qty: number
  price: number
}

type PurchasePayload = {
  supplier_id: number
  purchase_ref: string
  payment_method: string
  purchase_date?: string
  cart: CartItem[]
}

export async function SavePurchase(data: PurchasePayload) {
  try {
    if (!data.supplier_id || !data.cart || data.cart.length === 0) {
      throw new Error('Supplier and at least one product are required')
    }

    const purchaseDate = data.purchase_date ? new Date(data.purchase_date) : new Date()
    const scope = await getShopScope()
    const shopId = scopeShopIdForWrite(scope)

    // ── 1. Fetch supplier ────────────────────────────────────────────────────
    const supplier = await prisma.tbl_supplier.findUnique({
      where: { supplier_id: data.supplier_id },
    })
    if (!supplier) throw new Error('Supplier not found')

    const grandTotal = data.cart.reduce((sum, item) => sum + item.qty * item.price, 0)

    // ── 2. Fetch products + inventories + prices upfront ────────────────────
    const productIds = data.cart.map(i => i.product_id)

    const [productDetails, inventories, existingPrices] = await Promise.all([
      prisma.tbl_product.findMany({
        where:  { product_id: { in: productIds } },
        select: { product_id: true, product_code: true, product_name: true },
      }),
      prisma.tbl_inventory.findMany({ where: { product_id: { in: productIds }, shop_id: shopId } }),
      prisma.tbl_product_price.findMany({ where: { product_id: { in: productIds }, shop_id: shopId } }),
    ])

    const productMap = new Map(productDetails.map(p => [p.product_id, p]))
    const invMap     = new Map(inventories.map(i => [i.product_id, i]))
    const priceMap   = new Map(existingPrices.map(p => [p.product_id, p]))

    // ── 3. INSERT purchase header ────────────────────────────────────────────
    await prisma.$executeRaw`
      INSERT INTO tbl_purchase (
        shop_id, purchase_order_number, supplier_id, supplier_name,
        grand_total, purchase_ref, payment_method, payment_ref,
        purchase_by, datetime
      ) VALUES (
        ${shopId}, ${Math.floor(100000 + Math.random() * 900000)},
        ${data.supplier_id}, ${supplier.supplier_name},
        ${grandTotal}, ${data.purchase_ref}, ${data.payment_method}, '',
        'Admin', ${purchaseDate}
      )
    `

    // ── 4. Get purchase_id ───────────────────────────────────────────────────
    const idResult: any[] = await prisma.$queryRaw`SELECT LAST_INSERT_ID() as purchase_id`
    const purchaseId = Number(idResult[0]?.purchase_id)
    if (!purchaseId) throw new Error('Failed to get purchase ID')

    // ── 5. Process each cart item ────────────────────────────────────────────
    for (const item of data.cart) {
      const product = productMap.get(item.product_id)
      const qty     = Number(item.qty)
      const price   = Number(item.price)

      // Insert purchase product
      await prisma.$executeRaw`
        INSERT INTO tbl_purchase_product (
          purchase_id, product_id, product_code, product_name,
          qty, unit_price, sub_total
        ) VALUES (
          ${purchaseId}, ${item.product_id},
          ${product?.product_code || ''}, ${product?.product_name || ''},
          ${qty}, ${price}, ${qty * price}
        )
      `

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

      // Update buying price
      const existingPrice = priceMap.get(item.product_id)
      if (existingPrice) {
        await prisma.tbl_product_price.update({
          where: { product_price_id: existingPrice.product_price_id },
          data:  { buying_price: price },
        })
      }
    }

    return {
      success:     true,
      message:     'Purchase saved successfully',
      purchase_id: purchaseId,
    }
  } catch (err: any) {
    console.error('❌ SavePurchase error:', err)
    return { success: false, message: err.message || 'Failed to save purchase' }
  }
}
