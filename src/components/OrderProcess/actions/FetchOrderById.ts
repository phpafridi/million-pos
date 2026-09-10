'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

// Type definition for returning order
export type OrderWithDetails = {
  order_id: number
  order_no: number
  order_number: string | null
  order_date: string  // Changed from Date to string for serialization
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  shipping_address: string
  sales_person: string
  total_tax: number
  sub_total: number
  discount: number
  discount_amount: number
  loyalty_points_redeemed: number
  loyalty_discount_amount: number
  payment_method: string
  grand_total: number
  order_status: number
  details: {
    product_id: number
    product_code: string
    product_name: string
    product_quantity: number
    selling_price: number
    sub_total: number
    product: {
      measurement_units: string
      packet_size: number
      attributes: { attribute_name: string; attribute_value: string }[]
    } | null
  }[]
}

export default async function FetchOrderById(orderId: number): Promise<OrderWithDetails | null> {
  try {
    if (!orderId || isNaN(orderId)) {
      throw new Error('Invalid order ID')
    }

    const scope = await getShopScope()
    const order = await prisma.tbl_order.findFirst({
      where: { order_id: orderId, ...scopeWhere(scope) },
      include: {
        details: {
          include: { 
            product: {
              select: {
                measurement_units: true,
                packet_size: true,
                attributes: {
                  select: { attribute_name: true, attribute_value: true }
                }
              }
            }
          },
        },
      },
    })

    if (!order) return null

    // Convert all Decimal fields to numbers
    return {
      order_id: order.order_id,
      order_no: order.order_no,
      order_number: order.order_number,
      order_date: order.order_date.toISOString(), // Convert Date to string
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address,
      shipping_address: order.shipping_address,
      sales_person: order.sales_person,
      total_tax: Number(order.total_tax), // Convert Decimal to number
      sub_total: Number(order.sub_total),
      discount: Number(order.discount),
      discount_amount: Number(order.discount_amount),
      loyalty_points_redeemed: order.loyalty_points_redeemed,
      loyalty_discount_amount: Number(order.loyalty_discount_amount),
      payment_method: order.payment_method,
      grand_total: Number(order.grand_total), // Convert Decimal to number
      order_status: order.order_status,
      details: order.details.map(detail => ({
        product_id: detail.product_id,
        product_code: detail.product_code,
        product_name: detail.product_name,
        product_quantity: Number(detail.product_quantity),
        selling_price: Number(detail.selling_price),
        sub_total: Number(detail.sub_total),
        product: detail.product ? {
          measurement_units: detail.product.measurement_units || '',
          packet_size: Number(detail.product.packet_size) || 0,
          attributes: detail.product.attributes || []
        } : null
      }))
    }
  } catch (err) {
    console.error(`❌ FetchOrderById error for ID ${orderId}:`, err)
    throw new Error('Failed to fetch order')
  }
}