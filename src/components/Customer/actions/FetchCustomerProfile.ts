'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { sharedOrOwnWhere } from '@/lib/syncSettings'

export async function FetchCustomerProfile(customer_id: number) {
  const scope = await getShopScope()
  const customer = await prisma.tbl_customer.findFirst({
    where: { customer_id, ...sharedOrOwnWhere(scope) },
  })
  if (!customer) return null

  return {
    ...customer,
    measurement_length: customer.measurement_length ? Number(customer.measurement_length) : null,
    measurement_teera: customer.measurement_teera ? Number(customer.measurement_teera) : null,
    measurement_chest: customer.measurement_chest ? Number(customer.measurement_chest) : null,
    measurement_waist: customer.measurement_waist ? Number(customer.measurement_waist) : null,
    measurement_hip: customer.measurement_hip ? Number(customer.measurement_hip) : null,
    measurement_shoulder: customer.measurement_shoulder ? Number(customer.measurement_shoulder) : null,
    measurement_sleeve_length: customer.measurement_sleeve_length ? Number(customer.measurement_sleeve_length) : null,
    measurement_sleeve_round: customer.measurement_sleeve_round ? Number(customer.measurement_sleeve_round) : null,
    measurement_neck: customer.measurement_neck ? Number(customer.measurement_neck) : null,
    measurement_daman: customer.measurement_daman ? Number(customer.measurement_daman) : null,
    measurement_shalwar_length: customer.measurement_shalwar_length ? Number(customer.measurement_shalwar_length) : null,
    measurement_bottom: customer.measurement_bottom ? Number(customer.measurement_bottom) : null,
  }
}

/** This customer's POS purchase history. */
export async function FetchCustomerPurchaseHistory(customer_id: number) {
  const scope = await getShopScope()
  const where: any = scope.isSuperAdmin ? { customer_id } : { customer_id, shop_id: scope.shopId ?? 1 }

  const orders = await prisma.tbl_order.findMany({
    where,
    orderBy: { order_date: 'desc' },
    select: {
      order_id: true,
      order_no: true,
      order_number: true,
      order_date: true,
      grand_total: true,
      order_status: true,
    },
  })

  return orders.map((o) => ({
    order_id: o.order_id,
    order_number: o.order_number || String(o.order_no),
    order_date: o.order_date.toISOString(),
    grand_total: Number(o.grand_total),
    order_status: o.order_status,
  }))
}
