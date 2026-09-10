'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeShopIdForWrite } from '@/lib/getShopScope'
import { logActivity } from '@/lib/auditLog'
import { nextOrderNumber, nextInvoiceNumber } from '@/lib/documentNumbers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type OrderItem = {
  product_id: number
  qty: number
  price: number
  tax_amount?: number
}

type OrderPayload = {
  sales_person: string
  customer_id: number
  sale_ref: string
  payment_method: 'cash' | 'cheque' | 'card' | 'easypaisa' | 'pending'
  paid_amount: number
  points_redeemed?: number
  discount: number
  sale_date?: string
  cart: OrderItem[]
  shop_id_override?: number // only honored for super admins, via a shop-switcher control
}

export async function AddOrder(payload: OrderPayload) {
  try {
    const { customer_id, sale_ref, payment_method,
            paid_amount, discount, cart, sale_date, points_redeemed } = payload

    // Resolved server-side, not trusted from the client — avoids a
    // timing issue where an order submitted before the session finishes
    // loading in the browser would fall back to a generic "Staff" label
    // even though the person is genuinely logged in.
    const session = await getServerSession(authOptions)
    const sales_person = session?.user?.name || session?.user?.email || payload.sales_person || 'Unknown'

    if (!cart || cart.length === 0) {
      throw new Error('Cart cannot be empty')
    }

    const scope = await getShopScope()
    const shopId = scope.isSuperAdmin && payload.shop_id_override
      ? payload.shop_id_override
      : scopeShopIdForWrite(scope)

    // ── 1. Fetch customer ────────────────────────────────────────────────────
    const customer = await prisma.tbl_customer.findUnique({
      where: { customer_id },
    })
    const custId      = customer?.customer_id  ?? 0
    const custName    = customer?.customer_name ?? 'Walking Client'
    const custEmail   = customer?.email         ?? 'null'
    const custPhone   = customer?.phone         ?? '00'
    const custAddress = customer?.address       ?? 'null'

    // Never trust the client's claimed redemption amount — clamp to
    // whatever the customer's actual current balance is, only if
    // they're a real gold member, and only if Head Office currently has
    // the loyalty system turned on at all (checked here server-side so
    // a disabled system can't be bypassed by an outdated client still
    // showing the redemption UI).
    const { getLoyaltyConfig } = await import('@/lib/loyaltyConfig')
    const loyaltyConfig = await getLoyaltyConfig()
    const pointsToDeduct = (loyaltyConfig.enabled && customer?.is_gold_member && points_redeemed && points_redeemed > 0)
      ? Math.min(points_redeemed, customer.loyalty_points)
      : 0
    const loyaltyDiscountAmount = pointsToDeduct * loyaltyConfig.redeemValuePerPoint

    // ── 2. Compute totals ────────────────────────────────────────────────────
    const subtotal       = cart.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0)
    const discountAmount = Number(discount)
    const orderStatus    = payment_method === 'pending' ? 0 : 2
    const orderDate      = sale_date ? new Date(sale_date) : new Date()
    const orderNo        = Math.floor(Date.now() / 1000)
    const orderNumber    = await nextOrderNumber(shopId)

    // ── 3. Fetch product details before writing anything ────────────────────
    const productIds = cart.map(i => i.product_id)
    const products   = await prisma.tbl_product.findMany({
      where: { product_id: { in: productIds } },
      include: { prices: { where: { shop_id: shopId } }, tax: true },
    })
    const productMap = new Map(products.map(p => [p.product_id, p]))

    // ── 4. Pre-compute taxes ─────────────────────────────────────────────────
    let totalTax = 0
    const enrichedCart = cart.map(item => {
      const product    = productMap.get(item.product_id)
      const buyPrice   = Number(product?.prices?.[0]?.buying_price  ?? 0)
      const taxRate    = Number(product?.tax?.tax_rate               ?? 0)
      const taxType    = product?.tax?.tax_type ?? 1
      const itemQty    = Number(item.qty)
      const itemPrice  = Number(item.price)
      let   taxAmount  = item.tax_amount ? Number(item.tax_amount) : 0
      if (taxAmount === 0) {
        taxAmount = taxType === 1
          ? (itemPrice * itemQty * taxRate) / 100
          : taxRate * itemQty
      }
      totalTax += taxAmount
      return {
        ...item,
        itemQty,
        itemPrice,
        buyPrice,
        taxAmount,
        productCode: product?.product_code ?? '',
        productName: product?.product_name ?? '',
        inventory:   null as null, // filled below
      }
    })

    // ── 5. Fetch inventories ────────────────────────────────────────────────
    const inventories = await prisma.tbl_inventory.findMany({
      where: { product_id: { in: productIds }, shop_id: shopId },
    })
    const invMap = new Map(inventories.map(i => [i.product_id, i]))

    // ── 6. INSERT order (raw — no transaction) ───────────────────────────────
    await prisma.$executeRaw`
      INSERT INTO tbl_order (
        shop_id, order_no, order_number, customer_id, customer_name, customer_email,
        customer_phone, customer_address, shipping_address,
        sub_total, discount, discount_amount, loyalty_points_redeemed, loyalty_discount_amount, total_tax, grand_total,
        payment_method, payment_ref, order_status, note, sales_person,
        order_date
      ) VALUES (
        ${shopId}, ${orderNo}, ${orderNumber}, ${custId}, ${custName}, ${custEmail},
        ${custPhone}, ${custAddress}, ${custAddress},
        ${subtotal}, ${discount}, ${discountAmount}, ${pointsToDeduct}, ${loyaltyDiscountAmount}, 0, ${subtotal - discountAmount},
        ${payment_method}, ${sale_ref}, ${orderStatus}, '', ${sales_person || 'Unknown'},
        ${orderDate}
      )
    `

    // ── 7. Get order_id ───────────────────────────────────────────────────────
    const idResult: any[] = await prisma.$queryRaw`SELECT LAST_INSERT_ID() as order_id`
    const orderId = Number(idResult[0]?.order_id)
    if (!orderId) throw new Error('Failed to get order ID after insert')

    // ── 8. INSERT order details ──────────────────────────────────────────────
    for (const item of enrichedCart) {
      await prisma.$executeRaw`
        INSERT INTO tbl_order_details (
          product_id, order_id, product_code, product_name,
          product_quantity, buying_price, selling_price,
          product_tax, sub_total, price_option
        ) VALUES (
          ${item.product_id}, ${orderId}, ${item.productCode}, ${item.productName},
          CAST(${item.itemQty} AS DECIMAL(10,1)),
          CAST(${item.buyPrice} AS DECIMAL(10,2)),
          CAST(${item.itemPrice} AS DECIMAL(10,2)),
          CAST(${item.taxAmount} AS DECIMAL(10,2)),
          CAST(${item.itemQty * item.itemPrice + item.taxAmount} AS DECIMAL(10,2)),
          'default'
        )
      `
    }

    // ── 9. UPDATE order total_tax + grand_total ──────────────────────────────
    await prisma.$executeRaw`
      UPDATE tbl_order
      SET total_tax   = ${totalTax},
          grand_total = ${subtotal - discountAmount + totalTax}
      WHERE order_id  = ${orderId}
    `

    // ── 10. UPDATE inventory ─────────────────────────────────────────────────
    for (const item of enrichedCart) {
      const inv = invMap.get(item.product_id)
      if (inv) {
        const newQty = Number(inv.product_quantity) - item.itemQty
        await prisma.$executeRaw`
          UPDATE tbl_inventory
          SET product_quantity = CAST(${newQty} AS DECIMAL(10,1))
          WHERE inventory_id  = ${inv.inventory_id}
        `
      }
    }

    // ── 11. CREATE invoice (if not pending) ──────────────────────────────────
    let invoice = null
    if (payment_method !== 'pending') {
      invoice = await prisma.tbl_invoice.create({
        data: {
          invoice_no:   Math.floor(Date.now() / 1000),
          invoice_number: await nextInvoiceNumber(shopId),
          order_id:     orderId,
          invoice_date: orderDate,
        },
      })
    }

    // ── 12. FETCH completed order OUTSIDE transaction ─────────────────────────
    // Small retry in case replication lag on PlanetScale/serverless
    let order = null
    for (let attempt = 0; attempt < 3; attempt++) {
      order = await prisma.tbl_order.findUnique({
        where:   { order_id: orderId },
        include: { details: true },
      })
      if (order) break
      await new Promise(r => setTimeout(r, 200))
    }

    if (!order) throw new Error('Failed to retrieve created order')

    // ── 13. Serialize Decimals ───────────────────────────────────────────────
    const serializedOrder = {
      ...order,
      sub_total:       Number(order.sub_total),
      discount:        Number(order.discount),
      discount_amount: Number(order.discount_amount),
      total_tax:       Number(order.total_tax),
      grand_total:     Number(order.grand_total),
      order_date:      order.order_date.toISOString(),
      details: order.details.map((d: any) => ({
        ...d,
        product_quantity: Number(d.product_quantity),
        buying_price:     Number(d.buying_price),
        selling_price:    Number(d.selling_price),
        product_tax:      Number(d.product_tax),
        sub_total:        Number(d.sub_total),
      })),
    }

    const serializedInvoice = invoice ? {
      ...invoice,
      invoice_date: invoice.invoice_date.toISOString(),
    } : null

    await logActivity({
      action: 'sale.create',
      entityType: 'order',
      entityId: order.order_id,
      description: `Sale #${orderNo} — ${cart.length} item(s), total ${(subtotal - discountAmount).toFixed(2)}, payment: ${payment_method}`,
      shopIdOverride: shopId,
    })

    // Deduct redeemed points — separate from the awarding step below,
    // since a customer can redeem and earn in the same transaction
    // (e.g. redeem some toward this purchase, earn new ones on what's
    // still paid in cash).
    if (pointsToDeduct > 0) {
      await prisma.tbl_customer.update({
        where: { customer_id: custId },
        data: { loyalty_points: { decrement: pointsToDeduct } },
      })
    }

    // Award loyalty points — only for actually-paid orders (not pending),
    // and only if this sale didn't ALSO redeem points. Earning and
    // redeeming on the same transaction would often cancel each other
    // out (e.g. redeem 1 point, spend enough to immediately earn 1 back),
    // making a real redemption look like it silently failed even though
    // both operations worked correctly. Standard loyalty program rule:
    // you don't earn on a transaction you paid for partly with points.
    let loyaltyAwarded = 0
    if (payment_method !== 'pending' && custId && pointsToDeduct === 0) {
      try {
        const { awardLoyaltyPoints } = await import('@/lib/loyalty')
        const result = await awardLoyaltyPoints(custId, subtotal - discountAmount + totalTax)
        loyaltyAwarded = result.awarded
      } catch (err) {
        console.error('Failed to award loyalty points:', err)
        // Never let a loyalty-points failure block the sale itself
      }
    }

    return {
      success: true,
      order:   serializedOrder,
      invoice: serializedInvoice,
      loyalty_points_awarded: loyaltyAwarded,
      loyalty_points_redeemed: pointsToDeduct,
      message: payment_method === 'pending'
        ? 'Order saved as pending'
        : 'Order completed successfully',
    }
  } catch (err: any) {
    console.error('❌ AddOrder error:', err.message)
    return { success: false, message: err.message || 'Failed to save order' }
  }
}
