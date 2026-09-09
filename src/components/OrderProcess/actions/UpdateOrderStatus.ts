'use server'

import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'
import { getShopScope } from '@/lib/getShopScope'
import { nextInvoiceNumber } from '@/lib/documentNumbers'

export async function updateOrderStatus(orderId: number, status: number) {
  const scope = await getShopScope()
  const existing = await prisma.tbl_order.findUnique({ where: { order_id: orderId }, select: { shop_id: true } })
  if (!existing) throw new Error('Order not found')
  if (!scope.isSuperAdmin && scope.shopId !== existing.shop_id) {
    throw new Error('This order does not belong to your franchise')
  }

  // ✅ Update order status
  const order = await prisma.tbl_order.update({
    where: { order_id: orderId },
    data: { order_status: status },
  })

  // ✅ Fetch order details (used for cancel)
  const orderDetails = await prisma.tbl_order_details.findMany({
    where: { order_id: orderId },
    select: { product_id: true, product_quantity: true },
  })

  if (status === 1) {
    // ❌ Cancel → Increment inventory (scoped to the order's own shop, not
    // an arbitrary shop's inventory row for the same product)
    for (const detail of orderDetails) {
      const inventory = await prisma.tbl_inventory.findFirst({
        where: { product_id: detail.product_id, shop_id: order.shop_id },
        select: { inventory_id: true },
      })

      if (inventory) {
        await prisma.tbl_inventory.update({
          where: { inventory_id: inventory.inventory_id },
          data: {
            product_quantity: {
              increment: detail.product_quantity,
            },
          },
        })
      }
    }

    await logActivity({
      action: 'order.cancel',
      entityType: 'order',
      entityId: orderId,
      description: `Order #${orderId} cancelled — ${orderDetails.length} item(s) restored to stock`,
      shopIdOverride: order.shop_id,
    })
  }

  if (status === 2) {
    // ✅ Confirm → Update payment method to cash & Generate invoice

    await prisma.tbl_order.update({
      where: { order_id: orderId },
      data: { payment_method: 'cash' }, // ✅ force update
    })

    // Get last invoice_no
    const lastInvoice = await prisma.tbl_invoice.findFirst({
      orderBy: { invoice_no: 'desc' },
    })
    const nextInvoiceNo = (lastInvoice?.invoice_no ?? 0) + 1

    const invoice = await prisma.tbl_invoice.create({
      data: {
        order_id: orderId,
        invoice_no: nextInvoiceNo,
        invoice_number: await nextInvoiceNumber(order.shop_id),
      },
    })

    return { order, invoice }
  }

  return { order }
}
