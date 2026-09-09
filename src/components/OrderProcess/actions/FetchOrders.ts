'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export type SerializedOrder = {
  order_id: number
  order_no: number
  order_number: string | null
  order_date: string
  order_status: number
  grand_total: number
  sales_person: string
  customer: {
    customer_id: number
    customer_name: string
    discount: string
    customer_code: number
    email: string
    phone: string
    address: string
  }
  details: {
    order_details_id: number
    order_id: number
    product_id: number
    product_code: string
    product_name: string
    product_quantity: number
    buying_price: number
    selling_price: number
    product_tax: number
    price_option: string
    measurement_unit: string
  }[]
  invoices: {
    invoice_id: number
    order_id: number
    invoice_no: number | null
    invoice_date: string
  }[]
}

export async function FetchOrders(): Promise<SerializedOrder[]> {
  try {
    const scope = await getShopScope()
    const orders = await prisma.tbl_order.findMany({
      where: scopeWhere(scope),
      include: {
        customer: true,
        details: {
          include: {
            product: {
              select: {
                measurement_units: true, // ✅ fetch measurement unit
              },
            },
          },
        },
        invoices: true,
      },
      orderBy: {
        order_id: 'desc',
      },
    })

    return orders.map((order) => ({
      order_id: order.order_id,
      order_no: order.order_no,
      order_number: order.order_number,
      order_date: order.order_date.toISOString(),
      order_status: order.order_status,
      grand_total: Number(order.grand_total), // Convert Decimal to number
      sales_person: order.sales_person,
      customer: {
        customer_id: order.customer.customer_id,
        customer_name: order.customer.customer_name,
        discount: order.customer.discount,
        customer_code: order.customer.customer_code,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address,
      },
      details: order.details.map((d) => ({
        order_details_id: d.order_details_id,
        order_id: d.order_id,
        product_id: d.product_id,
        product_code: d.product_code,
        product_name: d.product_name,
        product_quantity: Number(d.product_quantity), // Also convert this if it's Decimal
        buying_price: Number(d.buying_price), // Convert if Decimal
        selling_price: Number(d.selling_price), // Convert if Decimal
        product_tax: Number(d.product_tax), // Convert if Decimal
        price_option: d.price_option,
        measurement_unit: d.product?.measurement_units?.trim() || 'pcs', // ✅ fixed
      })),
      invoices: order.invoices.map((inv) => ({
        invoice_id: inv.invoice_id,
        order_id: inv.order_id,
        invoice_no: inv.invoice_no,
        invoice_date: inv.invoice_date.toISOString(),
      })),
    }))
  } catch (error) {
    console.error('Error fetching orders:', error)
    return []
  }
}