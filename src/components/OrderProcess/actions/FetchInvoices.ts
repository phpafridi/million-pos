'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeWhere } from '@/lib/getShopScope'

export type SerializedInvoice = {
  invoice_id: number
  invoice_no: number | null
  invoice_number: string | null
  invoice_date: string
  order_id: number
  order: {
    order_no: number
    order_number: string | null
    grand_total: number
    sub_total: number
    discount: number
    discount_amount: number
    total_tax: number
    sales_person: string
    payment_method: string
    customer: {
      customer_name: string
      phone: string
    }
  }
}

export async function FetchInvoices(): Promise<SerializedInvoice[]> {
  try {
    const scope = await getShopScope()
    const invoices = await prisma.tbl_invoice.findMany({
      where: { order: scopeWhere(scope) },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: {
        invoice_id: 'desc',
      },
    })

    return invoices.map((inv) => ({
      invoice_id: inv.invoice_id,
      invoice_no: inv.invoice_no,
      invoice_number: inv.invoice_number,
      order_id: inv.order_id,
      invoice_date: inv.invoice_date.toISOString(),
      order: {
        order_no: inv.order.order_no,
        order_number: inv.order.order_number,
        grand_total: Number(inv.order.grand_total),
        sub_total: Number(inv.order.sub_total),
        discount: Number(inv.order.discount),
        discount_amount: Number(inv.order.discount_amount),
        total_tax: Number(inv.order.total_tax),
        sales_person: inv.order.sales_person,
        payment_method: inv.order.payment_method,
        customer: {
          customer_name: inv.order.customer.customer_name,
          phone: inv.order.customer.phone,
        }
      }
    }))
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return []
  }
}