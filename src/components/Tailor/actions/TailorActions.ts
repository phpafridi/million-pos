'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope, scopeShopIdForWrite, scopeWhere } from '@/lib/getShopScope'
import { logActivity } from '@/lib/auditLog'
import { sharedOrOwnWhere, shopIdForNewRecord, isSynced } from '@/lib/syncSettings'
import { notifyTailorStatusChange } from '@/lib/notifications'
import { nextTailorOrderNumber } from '@/lib/documentNumbers'

// ── Customers ────────────────────────────────────────────────────────────
// Tailor customers are just customers — the same tbl_customer used by the
// POS, now carrying measurements too. One customer record across the
// whole business (purchase history, tailor history, and eventually gold
// card / loyalty points all live in one place), not a separate table per
// module. Whether a customer is shared across franchises or private is
// controlled by the existing "Customers" sync setting.

export type TailorMeasurements = {
  measurement_length?: number | null
  measurement_teera?: number | null
  measurement_chest?: number | null
  measurement_waist?: number | null
  measurement_hip?: number | null
  measurement_shoulder?: number | null
  measurement_sleeve_length?: number | null
  measurement_sleeve_round?: number | null
  measurement_neck?: number | null
  measurement_daman?: number | null
  measurement_shalwar_length?: number | null
  measurement_bottom?: number | null
  measurement_notes?: string | null
}

export async function FetchTailorCustomers(search?: string) {
  const scope = await getShopScope()
  const where: any = sharedOrOwnWhere(scope)
  if (search) {
    where.OR = [
      { customer_name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ]
  }
  const customers = await prisma.tbl_customer.findMany({
    where,
    orderBy: { customer_id: 'desc' },
  })

  // Checked once, not per-customer — measurement sharing is a single
  // network-wide policy, not something that varies row to row.
  const measurementsShared = await isSynced('tailor_measurements')

  return customers.map((c) => {
    const ownRecord = c.shop_id === scope.shopId
    const redact = !ownRecord && !measurementsShared
    return {
    ...c,
    tailor_customer_id: c.customer_id, // kept for the UI's existing field name
    measurement_length: redact ? null : (c.measurement_length ? Number(c.measurement_length) : null),
    measurement_teera: redact ? null : (c.measurement_teera ? Number(c.measurement_teera) : null),
    measurement_chest: redact ? null : (c.measurement_chest ? Number(c.measurement_chest) : null),
    measurement_waist: redact ? null : (c.measurement_waist ? Number(c.measurement_waist) : null),
    measurement_hip: redact ? null : (c.measurement_hip ? Number(c.measurement_hip) : null),
    measurement_shoulder: redact ? null : (c.measurement_shoulder ? Number(c.measurement_shoulder) : null),
    measurement_sleeve_length: redact ? null : (c.measurement_sleeve_length ? Number(c.measurement_sleeve_length) : null),
    measurement_sleeve_round: redact ? null : (c.measurement_sleeve_round ? Number(c.measurement_sleeve_round) : null),
    measurement_neck: redact ? null : (c.measurement_neck ? Number(c.measurement_neck) : null),
    measurement_daman: redact ? null : (c.measurement_daman ? Number(c.measurement_daman) : null),
    measurement_shalwar_length: redact ? null : (c.measurement_shalwar_length ? Number(c.measurement_shalwar_length) : null),
    measurement_bottom: redact ? null : (c.measurement_bottom ? Number(c.measurement_bottom) : null),
  }})
}

export async function AddOrUpdateTailorCustomer(
  data: {
    tailor_customer_id?: number
    customer_name: string
    phone: string
    email?: string
    address?: string
    custom_measurements?: Record<string, number | null>
  } & TailorMeasurements
) {
  const scope = await getShopScope()

  const measurementPayload = {
    measurement_length: data.measurement_length ?? null,
    measurement_teera: data.measurement_teera ?? null,
    measurement_chest: data.measurement_chest ?? null,
    measurement_waist: data.measurement_waist ?? null,
    measurement_hip: data.measurement_hip ?? null,
    measurement_shoulder: data.measurement_shoulder ?? null,
    measurement_sleeve_length: data.measurement_sleeve_length ?? null,
    measurement_sleeve_round: data.measurement_sleeve_round ?? null,
    measurement_neck: data.measurement_neck ?? null,
    measurement_daman: data.measurement_daman ?? null,
    measurement_shalwar_length: data.measurement_shalwar_length ?? null,
    measurement_bottom: data.measurement_bottom ?? null,
    measurement_notes: data.measurement_notes || null,
  }

  // Catch a malformed measurement here, with a clear message, rather
  // than letting it crash as a cryptic MySQL "out of range" error deep
  // in a create() call. No real body measurement comes anywhere close
  // to the column's 999.99 ceiling — anything over 200 almost certainly
  // means something upstream (a fraction that parsed wrong, a stray
  // extra digit) produced a bad number, not a genuine measurement.
  for (const [field, val] of Object.entries(measurementPayload)) {
    if (field === 'measurement_notes') continue
    if (typeof val === 'number' && (val < 0 || val > 200)) {
      throw new Error(`${field.replace('measurement_', '').replace(/_/g, ' ')} measurement (${val}) looks wrong — please re-check what was typed.`)
    }
  }

  if (data.tailor_customer_id) {
    // Only allow editing a customer visible to this shop (shared or their own)
    const existing = await prisma.tbl_customer.findFirst({
      where: { customer_id: data.tailor_customer_id, ...sharedOrOwnWhere(scope) },
    })
    if (!existing) throw new Error('Customer not found or belongs to another franchise')

    const mergedCustom = data.custom_measurements
      ? { ...(existing.custom_measurements as object || {}), ...data.custom_measurements }
      : undefined

    const updated = await prisma.tbl_customer.update({
      where: { customer_id: data.tailor_customer_id },
      data: {
        customer_name: data.customer_name,
        phone: data.phone,
        email: data.email || existing.email,
        address: data.address || existing.address,
        ...measurementPayload,
        ...(mergedCustom ? { custom_measurements: mergedCustom } : {}),
      },
    })
    return { ...updated, tailor_customer_id: updated.customer_id }
  }

  const shop_id = await shopIdForNewRecord('customers', scope, scopeShopIdForWrite(scope))
  const created = await prisma.tbl_customer.create({
    data: {
      shop_id,
      customer_code: Math.floor(Math.random() * 100000000),
      customer_name: data.customer_name,
      phone: data.phone,
      email: data.email || `${data.phone}@placeholder.local`,
      address: data.address || 'nil',
      discount: '0',
      ...measurementPayload,
      ...(data.custom_measurements ? { custom_measurements: data.custom_measurements } : {}),
    },
  })
  return { ...created, tailor_customer_id: created.customer_id }
}

// ── Orders ───────────────────────────────────────────────────────────────

/** Converts a customer's Decimal measurement fields to plain numbers — raw Prisma Decimal objects can't cross the server-to-client boundary. */
function serializeCustomerMeasurements(customer: any) {
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

const STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  in_process: 'In Process (Cutting/Stitching)',
  ready: 'Ready for Pickup/Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export type TailorStyleOptions = Record<string, boolean>

export async function AddTailorOrder(data: {
  tailor_customer_id: number
  garment_type: string
  fabric_details?: string
  quantity: number
  tailoring_amount: number
  extra_stitching_amount?: number
  other_charges_amount?: number
  advance_paid?: number
  promised_date?: string
  taken_by: string
  notes?: string
  delivery_method?: 'pickup' | 'home_delivery'
  delivery_address?: string
  delivery_phone?: string
  design_number?: string
  size_1?: string
  size_2?: string
  pocket_style?: string
  collar_style?: string
  collar_cut?: string
  qurta_style?: string
  style_options?: TailorStyleOptions
}) {
  const scope = await getShopScope()
  const shop_id = scopeShopIdForWrite(scope)

  // Confirm the customer is visible to this shop (shared or their own)
  const customer = await prisma.tbl_customer.findFirst({
    where: { customer_id: data.tailor_customer_id, ...sharedOrOwnWhere(scope) },
  })
  if (!customer) throw new Error('Customer not found for this franchise')

  // Order number uses the same MLN-{shop}-{TYPE}-#### scheme as POS
  // orders/invoices, just with TLR as the type code, instead of a
  // completely separate, inconsistent numbering format.
  const order_number = await nextTailorOrderNumber(shop_id)

  const tailoringAmount = data.tailoring_amount || 0
  const extraStitching = data.extra_stitching_amount || 0
  const otherCharges = data.other_charges_amount || 0
  const totalPrice = tailoringAmount + extraStitching + otherCharges

  const order = await prisma.tbl_tailor_order.create({
    data: {
      shop_id,
      customer_id: data.tailor_customer_id,
      order_number,
      garment_type: data.garment_type,
      fabric_details: data.fabric_details || null,
      quantity: data.quantity || 1,
      design_number: data.design_number || null,
      size_1: data.size_1 || null,
      size_2: data.size_2 || null,
      pocket_style: data.pocket_style || null,
      collar_style: data.collar_style || null,
      collar_cut: data.collar_cut || null,
      qurta_style: data.qurta_style || null,
      style_options: data.style_options ?? undefined,
      tailoring_amount: tailoringAmount,
      extra_stitching_amount: extraStitching,
      other_charges_amount: otherCharges,
      price: totalPrice,
      advance_paid: data.advance_paid || 0,
      status: 'received',
      promised_date: data.promised_date ? new Date(data.promised_date) : null,
      taken_by: data.taken_by,
      notes: data.notes || null,
      delivery_method: data.delivery_method || null,
      delivery_address: data.delivery_address || null,
      delivery_phone: data.delivery_phone || null,
      status_history: {
        create: { status: 'received', changed_by: data.taken_by, note: 'Order taken' },
      },
    },
  })

  await logActivity({
    action: 'tailor.order_create',
    entityType: 'tailor_order',
    entityId: order.tailor_order_id,
    description: `Tailor order ${order_number} taken for ${customer.customer_name} — ${data.garment_type} x${data.quantity}, total ${totalPrice}`,
    shopIdOverride: shop_id,
  })

  // Award loyalty points on the advance actually collected — same rule
  // as POS, only real money paid earns points, not the full order value.
  let loyaltyAwarded = 0
  if (data.advance_paid && data.advance_paid > 0) {
    try {
      const { awardLoyaltyPoints } = await import('@/lib/loyalty')
      const result = await awardLoyaltyPoints(data.tailor_customer_id, data.advance_paid)
      loyaltyAwarded = result.awarded
    } catch (err) {
      console.error('Failed to award loyalty points for tailor order:', err)
    }
  }

  return {
    ...order,
    tailoring_amount: Number(order.tailoring_amount),
    extra_stitching_amount: Number(order.extra_stitching_amount),
    other_charges_amount: Number(order.other_charges_amount),
    price: Number(order.price),
    advance_paid: Number(order.advance_paid),
    loyalty_points_awarded: loyaltyAwarded,
  }
}

export async function FetchTailorOrders(filters?: { status?: string; search?: string }) {
  const scope = await getShopScope()
  const where: any = { ...scopeWhere(scope) }
  if (filters?.status) where.status = filters.status
  if (filters?.search) {
    where.OR = [
      { order_number: { contains: filters.search } },
      { customer: { customer_name: { contains: filters.search } } },
      { customer: { phone: { contains: filters.search } } },
    ]
  }

  const orders = await prisma.tbl_tailor_order.findMany({
    where,
    include: { customer: true, shop: { select: { shop_name: true } } },
    orderBy: { tailor_order_id: 'desc' },
  })

  return orders.map((o) => {
    const serializedCustomer = serializeCustomerMeasurements(o.customer)
    return {
      ...o,
      customer: serializedCustomer,
      tailor_customer: { ...serializedCustomer, tailor_customer_id: o.customer.customer_id }, // kept for the UI's existing field name
      price: Number(o.price),
      advance_paid: Number(o.advance_paid),
      tailoring_amount: Number(o.tailoring_amount),
      extra_stitching_amount: Number(o.extra_stitching_amount),
      other_charges_amount: Number(o.other_charges_amount),
    status_label: STATUS_LABELS[o.status] || o.status,
    order_date: o.order_date.toISOString(),
    promised_date: o.promised_date ? o.promised_date.toISOString() : null,
    ready_date: o.ready_date ? o.ready_date.toISOString() : null,
    delivered_date: o.delivered_date ? o.delivered_date.toISOString() : null,
    created_at: o.created_at.toISOString(),
    updated_at: o.updated_at.toISOString(),
    }
  })
}

export async function FetchTailorOrderById(tailor_order_id: number) {
  const scope = await getShopScope()
  const order = await prisma.tbl_tailor_order.findFirst({
    where: { tailor_order_id, ...scopeWhere(scope) },
    include: {
      customer: true,
      shop: { select: { shop_name: true } },
      status_history: { orderBy: { changed_at: 'asc' } },
    },
  })
  if (!order) return null

  const serializedCustomer = serializeCustomerMeasurements(order.customer)

  return {
    ...order,
    customer: serializedCustomer,
    tailor_customer: { ...serializedCustomer, tailor_customer_id: order.customer.customer_id }, // kept for the UI's existing field name
    price: Number(order.price),
    advance_paid: Number(order.advance_paid),
    tailoring_amount: Number(order.tailoring_amount),
    extra_stitching_amount: Number(order.extra_stitching_amount),
    other_charges_amount: Number(order.other_charges_amount),
    status_label: STATUS_LABELS[order.status] || order.status,
    order_date: order.order_date.toISOString(),
    promised_date: order.promised_date ? order.promised_date.toISOString() : null,
    ready_date: order.ready_date ? order.ready_date.toISOString() : null,
    delivered_date: order.delivered_date ? order.delivered_date.toISOString() : null,
    created_at: order.created_at.toISOString(),
    updated_at: order.updated_at.toISOString(),
    status_history: order.status_history.map((h) => ({
      ...h,
      changed_at: h.changed_at.toISOString(),
    })),
  }
}

/** Records a payment against a tailor order's balance — the missing piece: advance_paid could only ever be set once, at order creation, with no way to record later payments. */
export async function RecordTailorPayment(data: {
  tailor_order_id: number
  amount: number
  recorded_by: string
  note?: string
}) {
  const scope = await getShopScope()
  if (data.amount <= 0) throw new Error('Payment amount must be greater than zero')

  const existing = await prisma.tbl_tailor_order.findFirst({
    where: { tailor_order_id: data.tailor_order_id, ...scopeWhere(scope) },
  })
  if (!existing) throw new Error('Tailor order not found or belongs to another franchise')

  const currentBalance = Number(existing.price) - Number(existing.advance_paid)
  if (data.amount > currentBalance + 0.01) {
    throw new Error(`Payment (${data.amount}) is more than the remaining balance (${currentBalance.toFixed(2)})`)
  }

  const newAdvancePaid = Number(existing.advance_paid) + data.amount

  const updated = await prisma.tbl_tailor_order.update({
    where: { tailor_order_id: data.tailor_order_id },
    data: {
      advance_paid: newAdvancePaid,
      status_history: {
        create: {
          status: existing.status,
          changed_by: data.recorded_by,
          note: `Payment received: ${data.amount.toFixed(2)}${data.note ? ` — ${data.note}` : ''}`,
        },
      },
    },
  })

  await logActivity({
    action: 'tailor.payment_received',
    entityType: 'tailor_order',
    entityId: data.tailor_order_id,
    description: `Payment of ${data.amount.toFixed(2)} recorded for tailor order ${existing.order_number}`,
  })

  let loyaltyAwarded = 0
  try {
    const { awardLoyaltyPoints } = await import('@/lib/loyalty')
    const result = await awardLoyaltyPoints(existing.customer_id, data.amount)
    loyaltyAwarded = result.awarded
  } catch (err) {
    console.error('Failed to award loyalty points for tailor payment:', err)
  }

  return {
    ...updated,
    tailoring_amount: Number(updated.tailoring_amount),
    extra_stitching_amount: Number(updated.extra_stitching_amount),
    other_charges_amount: Number(updated.other_charges_amount),
    price: Number(updated.price),
    advance_paid: Number(updated.advance_paid),
    loyalty_points_awarded: loyaltyAwarded,
  }
}

export async function UpdateTailorOrderStatus(data: {
  tailor_order_id: number
  status: 'received' | 'in_process' | 'ready' | 'delivered' | 'cancelled'
  changed_by: string
  note?: string
  // delivery details, settable when marking as delivered
  delivery_method?: 'pickup' | 'home_delivery'
  delivery_address?: string
  delivery_phone?: string
  rider_name?: string
  tracking_note?: string
}) {
  const scope = await getShopScope()
  const existing = await prisma.tbl_tailor_order.findFirst({
    where: { tailor_order_id: data.tailor_order_id, ...scopeWhere(scope) },
    include: { customer: true },
  })
  if (!existing) throw new Error('Tailor order not found or belongs to another franchise')

  const updateData: any = { status: data.status }
  if (data.status === 'ready') updateData.ready_date = new Date()
  if (data.status === 'delivered') updateData.delivered_date = new Date()
  if (data.delivery_method) updateData.delivery_method = data.delivery_method
  if (data.delivery_address) updateData.delivery_address = data.delivery_address
  if (data.delivery_phone) updateData.delivery_phone = data.delivery_phone
  if (data.rider_name) updateData.rider_name = data.rider_name
  if (data.tracking_note) updateData.tracking_note = data.tracking_note

  const updated = await prisma.tbl_tailor_order.update({
    where: { tailor_order_id: data.tailor_order_id },
    data: {
      ...updateData,
      status_history: {
        create: { status: data.status, changed_by: data.changed_by, note: data.note || null },
      },
    },
  })

  await logActivity({
    action: 'tailor.status_update',
    entityType: 'tailor_order',
    entityId: data.tailor_order_id,
    description: `Order ${existing.order_number} status changed to "${STATUS_LABELS[data.status] || data.status}"${data.note ? `: ${data.note}` : ''}`,
    shopIdOverride: existing.shop_id,
  })

  // Best-effort — a failed notification should never undo or block the
  // status change itself. Errors are logged but swallowed here.
  notifyTailorStatusChange({
    customerName: existing.customer.customer_name,
    customerEmail: existing.customer.email,
    customerPhone: existing.customer.phone,
    orderNumber: existing.order_number,
    statusLabel: STATUS_LABELS[data.status] || data.status,
  }).catch((err) => console.error('Tailor status notification failed:', err))

  return updated
}

/** Every past tailor order for this customer — the full history view when looking them up by phone or email. */
export async function FetchTailorOrdersByCustomer(customer_id: number) {
  const scope = await getShopScope()
  const where: any = scope.isSuperAdmin ? { customer_id } : { customer_id, shop_id: scope.shopId ?? 1 }

  const orders = await prisma.tbl_tailor_order.findMany({
    where,
    orderBy: { order_date: 'desc' },
  })

  return orders.map((o) => ({
    tailor_order_id: o.tailor_order_id,
    order_number: o.order_number,
    garment_type: o.garment_type,
    quantity: o.quantity,
    price: Number(o.price),
    advance_paid: Number(o.advance_paid),
    status: o.status,
    status_label: STATUS_LABELS[o.status] || o.status,
    order_date: o.order_date.toISOString(),
    promised_date: o.promised_date ? o.promised_date.toISOString() : null,
  }))
}
