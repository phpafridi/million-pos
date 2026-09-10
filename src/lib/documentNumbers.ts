import { prisma } from '@/lib/prisma'

/**
 * Global brand prefix for order/invoice numbers, e.g. "MLN". Reuses the
 * theme settings table (a generic key-value store) rather than adding a
 * new table for one string — falls back to "MLN" if never configured.
 */
async function getDocumentPrefix(): Promise<string> {
  const row = await prisma.tbl_theme_setting.findUnique({ where: { setting_key: 'document_prefix' } })
  return row?.setting_value || 'MLN'
}

async function nextSequential(model: 'order' | 'invoice', shop_id: number, prefix: string, type: 'ORD' | 'INV'): Promise<string> {
  // Format: MLN-2-ORD-0001 — brand prefix, then the franchise's own
  // number (its shop_id), then the document type, then a sequence that's
  // per-franchise (so franchise 2 and franchise 3 both start at 0001,
  // never colliding with each other).
  const numberPrefix = `${prefix}-${shop_id}-${type}-`

  const last = model === 'order'
    ? await prisma.tbl_order.findFirst({
        where: { shop_id, order_number: { startsWith: numberPrefix } },
        orderBy: { order_id: 'desc' },
        select: { order_number: true },
      })
    : await prisma.tbl_invoice.findFirst({
        where: { order: { shop_id }, invoice_number: { startsWith: numberPrefix } },
        orderBy: { invoice_id: 'desc' },
        select: { invoice_number: true },
      })

  const lastNumberField = model === 'order' ? (last as any)?.order_number : (last as any)?.invoice_number
  const lastNum = lastNumberField ? parseInt(lastNumberField.replace(numberPrefix, ''), 10) || 0 : 0
  return `${numberPrefix}${String(lastNum + 1).padStart(4, '0')}`
}

/** e.g. "MLN-2-ORD-0001" — brand prefix + franchise number baked directly into the number. */
export async function nextOrderNumber(shop_id: number): Promise<string> {
  const prefix = await getDocumentPrefix()
  return nextSequential('order', shop_id, prefix, 'ORD')
}

/** e.g. "MLN-2-INV-0001" */
export async function nextInvoiceNumber(shop_id: number): Promise<string> {
  const prefix = await getDocumentPrefix()
  return nextSequential('invoice', shop_id, prefix, 'INV')
}

/** e.g. "MLN-2-TLR-0001" — tailor orders use the same brand-prefixed scheme as POS orders, just a different type code. */
export async function nextTailorOrderNumber(shop_id: number): Promise<string> {
  const prefix = await getDocumentPrefix()
  const numberPrefix = `${prefix}-${shop_id}-TLR-`

  const last = await prisma.tbl_tailor_order.findFirst({
    where: { shop_id, order_number: { startsWith: numberPrefix } },
    orderBy: { tailor_order_id: 'desc' },
    select: { order_number: true },
  })

  const lastNum = last?.order_number ? parseInt(last.order_number.replace(numberPrefix, ''), 10) || 0 : 0
  return `${numberPrefix}${String(lastNum + 1).padStart(4, '0')}`
}

/** e.g. "MLN-2-GRN-0001" — Goods Receive Notes use the same brand-prefixed scheme. */
export async function nextGrnNumber(shop_id: number): Promise<string> {
  const prefix = await getDocumentPrefix()
  const numberPrefix = `${prefix}-${shop_id}-GRN-`

  const last = await prisma.tbl_grn.findFirst({
    where: { shop_id, grn_number: { startsWith: numberPrefix } },
    orderBy: { grn_id: 'desc' },
    select: { grn_number: true },
  })

  const lastNum = last?.grn_number ? parseInt(last.grn_number.replace(numberPrefix, ''), 10) || 0 : 0
  return `${numberPrefix}${String(lastNum + 1).padStart(4, '0')}`
}
