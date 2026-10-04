'use server'

import { prisma } from '@/lib/prisma'
import { getShopScope } from '@/lib/getShopScope'
import { logActivity } from '@/lib/auditLog'
import { createGrn } from '@/lib/grn'
import { sessionHasPermission } from '@/lib/serverPermissions'
import { toFriendlyError } from '@/lib/friendlyError'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { traceLines, planEdit, round2 } from '@/lib/purchaseEdit'
import type { DetailRow, BatchRow, LineEdit, NewItemInput } from '@/lib/purchaseEdit'

// NOTE: a 'use server' file may only export async functions (types are fine).
// Constants and the helper below are deliberately not exported.

const PERMISSION = 'action:edit-purchase'
const PAYMENT_METHODS = ['cash', 'cheque', 'card']

// Everything below talks to the database through raw SQL on purpose. These
// queries do relative arithmetic ("quantity = quantity - 5, but only if that
// stays >= 0") so that a sale happening while an edit is in flight can never
// be overwritten with a stale number — an ORM read-modify-write can't give
// that guarantee.
// Defined by shape rather than as Pick<typeof prisma, ...>: both the normal
// client and the transaction client satisfy it, with no dependence on Prisma's
// generated generic types.
type Db = {
  $queryRaw: (query: TemplateStringsArray, ...values: any[]) => PromiseLike<any>
  $executeRaw: (query: TemplateStringsArray, ...values: any[]) => PromiseLike<number>
}

/** An expected, user-facing problem. Thrown inside the transaction it rolls everything back and is shown as-is. */
class EditError extends Error {}

export type EditableLine = {
  purchase_product_id: number
  product_id: number
  product_code: string
  product_name: string
  measurement_units: string
  qty: number
  unit_price: number
  selling_price: number | null
  editable: boolean
  lockReason: string | null
  consumed: number
  /** How much of this line's stock is still unsold — the most the quantity can be reduced by. */
  in_stock: number | null
  canRemove: boolean
  removeBlockReason: string | null
  batch_number: string | null
  expiry_date: string | null
}

export type PurchaseForEdit = {
  purchase_id: number
  purchase_order_number: string
  supplier_id: number
  supplier_name: string
  purchase_ref: string
  payment_method: string
  purchase_date: string
  is_warehouse: boolean
  grand_total: number
  lines: EditableLine[]
}

export type FetchForEditResult = { ok: true; data: PurchaseForEdit } | { ok: false; error: string }

export type UpdatePurchasePayload = {
  supplier_id: number
  purchase_ref: string
  payment_method: string
  lines: LineEdit[]
  newItems: NewItemInput[]
}

export type UpdatePurchaseResult = { success: true; message: string } | { success: false; message: string }

const dateOnly = (v: unknown): string | null => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

async function loadState(db: Db, purchaseId: number, shopId: number, lock: boolean) {
  const headerRows: any[] = lock
    ? await db.$queryRaw`
        SELECT purchase_id, purchase_order_number, supplier_id, supplier_name, purchase_ref, payment_method, grand_total, datetime
        FROM tbl_purchase WHERE purchase_id = ${purchaseId} AND shop_id = ${shopId} LIMIT 1 FOR UPDATE`
    : await db.$queryRaw`
        SELECT purchase_id, purchase_order_number, supplier_id, supplier_name, purchase_ref, payment_method, grand_total, datetime
        FROM tbl_purchase WHERE purchase_id = ${purchaseId} AND shop_id = ${shopId} LIMIT 1`
  const h = headerRows[0]
  if (!h) return null

  const detailRows: any[] = await db.$queryRaw`
    SELECT pp.purchase_product_id, pp.product_id, pp.product_code, pp.product_name, pp.qty, pp.unit_price, pr.measurement_units
    FROM tbl_purchase_product pp
    JOIN tbl_product pr ON pr.product_id = pp.product_id
    WHERE pp.purchase_id = ${purchaseId}
    ORDER BY pp.purchase_product_id`

  // Locked while editing so a sale can't move qty_remaining between our read and our write.
  const batchRows: any[] = lock
    ? await db.$queryRaw`
        SELECT batch_id, product_id, batch_number, qty, qty_remaining, buying_price, selling_price, expiry_date
        FROM tbl_purchase_batch WHERE purchase_id = ${purchaseId} FOR UPDATE`
    : await db.$queryRaw`
        SELECT batch_id, product_id, batch_number, qty, qty_remaining, buying_price, selling_price, expiry_date
        FROM tbl_purchase_batch WHERE purchase_id = ${purchaseId}`

  const shopRows: any[] = await db.$queryRaw`SELECT is_warehouse FROM tbl_shop WHERE shop_id = ${shopId} LIMIT 1`

  const units: Record<number, string> = {}
  const details: DetailRow[] = detailRows.map((r) => {
    units[Number(r.product_id)] = String(r.measurement_units ?? '')
    return {
      purchase_product_id: Number(r.purchase_product_id),
      product_id: Number(r.product_id),
      product_code: String(r.product_code),
      product_name: String(r.product_name),
      qty: Number(r.qty),
      unit_price: Number(r.unit_price),
    }
  })
  const batches: BatchRow[] = batchRows.map((r) => ({
    batch_id: Number(r.batch_id),
    product_id: Number(r.product_id),
    batch_number: String(r.batch_number),
    qty: Number(r.qty),
    qty_remaining: Number(r.qty_remaining),
    buying_price: Number(r.buying_price),
    selling_price: Number(r.selling_price),
    expiry_date: dateOnly(r.expiry_date),
  }))

  return {
    header: {
      purchase_id: Number(h.purchase_id),
      purchase_order_number: String(h.purchase_order_number),
      supplier_id: Number(h.supplier_id),
      supplier_name: String(h.supplier_name),
      purchase_ref: String(h.purchase_ref ?? ''),
      payment_method: String(h.payment_method ?? ''),
      grand_total: Number(h.grand_total),
      datetime: h.datetime instanceof Date ? h.datetime.toISOString() : String(h.datetime),
    },
    details,
    batches,
    units,
    isWarehouse: Boolean(Number(shopRows[0]?.is_warehouse ?? 0)),
  }
}

export async function FetchPurchaseForEdit(purchaseId: number): Promise<FetchForEditResult> {
  try {
    // Checked here as well as in the UI — the middleware doesn't gate page
    // URLs, so anyone logged in can open the edit page's address directly.
    if (!(await sessionHasPermission(PERMISSION, 'edit'))) {
      return { ok: false, error: 'You do not have permission to edit purchases.' }
    }
    const scope = await getShopScope()
    if (!scope.shopId || !Number.isInteger(purchaseId) || purchaseId <= 0) {
      return { ok: false, error: 'Purchase not found.' }
    }

    // Scoped to the caller's own shop: another franchise's purchase is "not found".
    const state = await loadState(prisma, purchaseId, scope.shopId, false)
    if (!state) return { ok: false, error: 'Purchase not found.' }

    const lines: EditableLine[] = traceLines(state.details, state.batches).map((l) => ({
      purchase_product_id: l.purchase_product_id,
      product_id: l.product_id,
      product_code: l.product_code,
      product_name: l.product_name,
      measurement_units: state.units[l.product_id] ?? '',
      qty: l.qty,
      unit_price: l.unit_price,
      selling_price: l.batch ? l.batch.selling_price : null,
      editable: l.editable,
      lockReason: l.lockReason,
      consumed: l.consumed,
      in_stock: l.batch ? l.batch.qty_remaining : null,
      canRemove: l.canRemove,
      removeBlockReason: l.removeBlockReason,
      batch_number: l.batch ? l.batch.batch_number : null,
      expiry_date: l.batch ? l.batch.expiry_date : null,
    }))

    return {
      ok: true,
      data: {
        purchase_id: state.header.purchase_id,
        purchase_order_number: state.header.purchase_order_number,
        supplier_id: state.header.supplier_id,
        supplier_name: state.header.supplier_name,
        purchase_ref: state.header.purchase_ref,
        payment_method: state.header.payment_method,
        purchase_date: state.header.datetime,
        is_warehouse: state.isWarehouse,
        grand_total: state.header.grand_total,
        lines,
      },
    }
  } catch (err) {
    console.error('FetchPurchaseForEdit failed:', err)
    return { ok: false, error: toFriendlyError(err) }
  }
}

export async function UpdatePurchase(purchaseId: number, payload: UpdatePurchasePayload): Promise<UpdatePurchaseResult> {
  const fail = (message: string): UpdatePurchaseResult => ({ success: false, message })

  try {
    if (!(await sessionHasPermission(PERMISSION, 'edit'))) {
      return fail('You do not have permission to edit purchases.')
    }
    const scope = await getShopScope()
    const shopId = scope.shopId
    if (!shopId) return fail('Your account is not linked to a franchise.')
    if (!Number.isInteger(purchaseId) || purchaseId <= 0) return fail('Purchase not found.')

    // Shape checks up front, so malformed input is a clear message rather than a database error.
    if (!payload || !Array.isArray(payload.lines) || !Array.isArray(payload.newItems)) return fail('Invalid request.')
    if (payload.lines.some((e) => !Number.isInteger(e?.purchase_product_id))) return fail('Invalid request.')
    if (payload.newItems.some((n) => !Number.isInteger(n?.product_id))) return fail('One of the new items has no product selected.')
    const supplierId = Number(payload.supplier_id)
    if (!Number.isInteger(supplierId) || supplierId <= 0) return fail('Please select a supplier.')
    const ref = String(payload.purchase_ref ?? '').trim()
    if (ref.length > 128) return fail('The reference is too long (128 characters max).')
    const paymentMethod = String(payload.payment_method ?? '')

    const outcome = await prisma.$transaction(
      async (tx) => {
        // Locks the purchase row, so two edits of the same purchase run one after the other.
        const state = await loadState(tx, purchaseId, shopId, true)
        if (!state) throw new EditError('Purchase not found.')
        const { header, details, batches } = state

        if (paymentMethod !== header.payment_method && !PAYMENT_METHODS.includes(paymentMethod)) {
          throw new EditError('Choose a valid payment method.')
        }

        let supplierName = header.supplier_name
        if (supplierId !== header.supplier_id) {
          const rows: any[] = await tx.$queryRaw`
            SELECT supplier_name, shop_id, warehouse_only FROM tbl_supplier WHERE supplier_id = ${supplierId} LIMIT 1`
          const s = rows[0]
          const visible = s && (s.shop_id === null || Number(s.shop_id) === shopId) && !(s.shop_id === null && Number(s.warehouse_only) === 1 && !state.isWarehouse)
          if (!visible) throw new EditError('That supplier is not available to your franchise.')
          supplierName = String(s.supplier_name)
        }

        // Look up each newly added product (must be visible to this shop).
        const productInfo = new Map<number, { code: string; name: string; category: string }>()
        for (const n of payload.newItems) {
          const rows: any[] = await tx.$queryRaw`
            SELECT p.product_code, p.product_name, COALESCE(c.category_name, 'Unknown') AS category_name
            FROM tbl_product p LEFT JOIN tbl_category c ON c.category_id = p.category_id
            WHERE p.product_id = ${n.product_id} AND (p.shop_id IS NULL OR p.shop_id = ${shopId}) LIMIT 1`
          if (!rows[0]) throw new EditError('One of the products you added could not be found.')
          productInfo.set(n.product_id, {
            code: String(rows[0].product_code),
            name: String(rows[0].product_name),
            category: String(rows[0].category_name),
          })
        }

        const result = planEdit({
          lines: traceLines(details, batches),
          edits: payload.lines,
          newItems: payload.newItems,
          isWarehouse: state.isWarehouse,
          productNames: Object.fromEntries([...productInfo].map(([id, v]) => [id, v.name])),
        })
        if (!result.ok) throw new EditError(result.error)
        const plan = result.plan

        // Header-only differences count as changes too.
        const headerSummary: string[] = []
        if (supplierId !== header.supplier_id) headerSummary.push(`Supplier ${header.supplier_name} → ${supplierName}`)
        if (ref !== header.purchase_ref) headerSummary.push(`Reference "${header.purchase_ref}" → "${ref}"`)
        if (paymentMethod !== header.payment_method) headerSummary.push(`Payment ${header.payment_method} → ${paymentMethod}`)

        if (plan.changes.length === 0 && plan.newItems.length === 0 && headerSummary.length === 0) {
          return { changed: false as const }
        }

        // The default price on the product follows the most recent purchase of
        // it (that's how a normal purchase works). Editing an OLDER purchase
        // must not overwrite a newer purchase's price.
        const isLatestPurchaseFor = async (productId: number) => {
          const rows: any[] = await tx.$queryRaw`
            SELECT MAX(pp.purchase_id) AS latest
            FROM tbl_purchase_product pp JOIN tbl_purchase p ON p.purchase_id = pp.purchase_id
            WHERE pp.product_id = ${productId} AND p.shop_id = ${shopId}`
          return Number(rows[0]?.latest) === purchaseId
        }
        const applyDefaultPrice = async (productId: number, buy: number, sell: number) => {
          if (!(await isLatestPurchaseFor(productId))) return
          await tx.$executeRaw`
            INSERT INTO tbl_product_price (product_id, shop_id, buying_price, selling_price)
            VALUES (${productId}, ${shopId}, CAST(${buy} AS DECIMAL(10,2)), CAST(${sell} AS DECIMAL(10,2)))
            ON DUPLICATE KEY UPDATE buying_price = CAST(${buy} AS DECIMAL(10,2)), selling_price = CAST(${sell} AS DECIMAL(10,2))`
        }
        const addStock = (productId: number, qty: number) => tx.$executeRaw`
          INSERT INTO tbl_inventory (product_id, shop_id, product_quantity, notify_quantity)
          VALUES (${productId}, ${shopId}, CAST(${qty} AS DECIMAL(10,1)), 0)
          ON DUPLICATE KEY UPDATE product_quantity = product_quantity + CAST(${qty} AS DECIMAL(10,1))`
        const removeStock = async (productId: number, qty: number, label: string) => {
          const n = await tx.$executeRaw`
            UPDATE tbl_inventory SET product_quantity = product_quantity - CAST(${qty} AS DECIMAL(10,1))
            WHERE product_id = ${productId} AND shop_id = ${shopId}
              AND product_quantity - CAST(${qty} AS DECIMAL(10,1)) >= 0`
          if (n !== 1) throw new EditError(`"${label}" can't be reduced — its stock has changed since you opened this page. Please reload and try again.`)
        }

        // ── Existing lines ─────────────────────────────────────────────────
        for (const c of plan.changes) {
          const { line } = c
          const batch = line.batch!

          if (c.remove) {
            await removeStock(line.product_id, batch.qty, line.product_name)
            await tx.$executeRaw`DELETE FROM tbl_purchase_batch WHERE batch_id = ${batch.batch_id}`
            await tx.$executeRaw`DELETE FROM tbl_purchase_product WHERE purchase_product_id = ${line.purchase_product_id}`
            continue
          }

          if (c.qtyChanged) {
            if (c.stockDelta > 0) await addStock(line.product_id, c.stockDelta)
            else await removeStock(line.product_id, -c.stockDelta, line.product_name)

            // Guarded: the batch can never be taken below what has already been sold.
            const n = await tx.$executeRaw`
              UPDATE tbl_purchase_batch
              SET qty = qty + CAST(${c.stockDelta} AS DECIMAL(10,1)),
                  qty_remaining = qty_remaining + CAST(${c.stockDelta} AS DECIMAL(10,1)),
                  buying_price = CAST(${c.newBuyingPrice} AS DECIMAL(10,2)),
                  selling_price = CAST(${c.newSellingPrice} AS DECIMAL(10,2))
              WHERE batch_id = ${batch.batch_id}
                AND qty_remaining + CAST(${c.stockDelta} AS DECIMAL(10,1)) >= 0`
            if (n !== 1) throw new EditError(`"${line.product_name}" can't be reduced that far — some of it was sold while you were editing. Please reload and try again.`)
          } else if (c.pricesChanged) {
            await tx.$executeRaw`
              UPDATE tbl_purchase_batch
              SET buying_price = CAST(${c.newBuyingPrice} AS DECIMAL(10,2)),
                  selling_price = CAST(${c.newSellingPrice} AS DECIMAL(10,2))
              WHERE batch_id = ${batch.batch_id}`
          }

          const subTotal = round2(c.newQty * c.newBuyingPrice)
          await tx.$executeRaw`
            UPDATE tbl_purchase_product
            SET qty = CAST(${c.newQty} AS DECIMAL(10,1)),
                unit_price = CAST(${c.newBuyingPrice} AS DECIMAL(10,2)),
                sub_total = CAST(${subTotal} AS DECIMAL(10,2))
            WHERE purchase_product_id = ${line.purchase_product_id}`

          if (c.pricesChanged) await applyDefaultPrice(line.product_id, c.newBuyingPrice, c.newSellingPrice)
        }

        // ── Newly added items — same effects as a normal purchase line ─────
        const receivedAt = new Date(header.datetime)
        for (const n of plan.newItems) {
          const info = productInfo.get(n.product_id)!
          const subTotal = round2(n.qty * n.buying_price)
          await tx.$executeRaw`
            INSERT INTO tbl_purchase_product (purchase_id, product_id, product_code, product_name, qty, unit_price, sub_total)
            VALUES (${purchaseId}, ${n.product_id}, ${info.code}, ${info.name},
                    CAST(${n.qty} AS DECIMAL(10,1)), CAST(${n.buying_price} AS DECIMAL(10,2)), CAST(${subTotal} AS DECIMAL(10,2)))`

          if (n.damaged_qty > 0) {
            const note = `Arrived damaged from supplier "${supplierName}" — added when editing purchase ${header.purchase_order_number}`
            await tx.$executeRaw`
              INSERT INTO tbl_damage_product (shop_id, product_id, product_code, product_name, category, qty, note, decrease, date)
              VALUES (${shopId}, ${n.product_id}, ${info.code}, ${info.name}, ${info.category},
                      CAST(${n.damaged_qty} AS DECIMAL(10,1)), ${note}, 0, ${receivedAt.toISOString()})`
          }

          if (n.sellable_qty > 0) {
            const batchNumber = n.batch_number ?? `B${purchaseId}-${n.product_id}-${Date.now()}`
            await tx.$executeRaw`
              INSERT INTO tbl_purchase_batch (
                purchase_id, product_id, shop_id, product_code, product_name, batch_number, qty, qty_remaining,
                buying_price, selling_price, expiry_date, manufacture_date, purchase_date, is_active
              ) VALUES (
                ${purchaseId}, ${n.product_id}, ${shopId}, ${info.code}, ${info.name}, ${batchNumber},
                CAST(${n.sellable_qty} AS DECIMAL(10,1)), CAST(${n.sellable_qty} AS DECIMAL(10,1)),
                CAST(${n.buying_price} AS DECIMAL(10,2)), CAST(${n.selling_price} AS DECIMAL(10,2)),
                ${n.expiry_date}, ${n.manufacture_date}, ${receivedAt}, true
              )`
            await addStock(n.product_id, n.sellable_qty)
          }

          await applyDefaultPrice(n.product_id, n.buying_price, n.selling_price)
        }

        await tx.$executeRaw`
          UPDATE tbl_purchase
          SET supplier_id = ${supplierId}, supplier_name = ${supplierName}, purchase_ref = ${ref},
              payment_method = ${paymentMethod}, grand_total = CAST(${plan.grandTotal} AS DECIMAL(10,2))
          WHERE purchase_id = ${purchaseId}`

        // A warehouse already issued a GRN for the original quantities; what
        // was added now gets its own, rather than rewriting a signed-off document.
        const grnItems = [
          ...plan.changes.filter((c) => !c.remove && c.deltaQty > 0)
            .map((c) => ({ product_id: c.line.product_id, quantity: c.deltaQty, unit_cost: c.newBuyingPrice })),
          ...plan.newItems.map((n) => ({ product_id: n.product_id, quantity: n.qty, unit_cost: n.buying_price })),
        ]

        return {
          changed: true as const,
          number: header.purchase_order_number,
          supplierName,
          isWarehouse: state.isWarehouse,
          grnItems,
          summary: [...headerSummary, ...plan.summary],
        }
      },
      { timeout: 30000, maxWait: 5000 }
    )

    if (!outcome.changed) return { success: true, message: 'No changes to save.' }

    // After the commit: both are best-effort and never undo a saved edit.
    await logActivity({
      action: 'purchase.edit',
      entityType: 'purchase',
      entityId: purchaseId,
      description: `Purchase ${outcome.number} edited — ${outcome.summary.join('; ')}`.slice(0, 2000),
      shopIdOverride: shopId,
    })

    if (outcome.isWarehouse && outcome.grnItems.length > 0) {
      const session = await getServerSession(authOptions)
      await createGrn({
        shop_id: shopId,
        source_type: 'supplier_purchase',
        source_reference: purchaseId,
        source_description: `Supplier: ${outcome.supplierName} (additions to ${outcome.number})`,
        received_by: session?.user?.name || session?.user?.email || 'Unknown',
        notes: `Extra quantities recorded when editing purchase ${outcome.number}`,
        items: outcome.grnItems,
      })
    }

    return { success: true, message: 'Purchase updated successfully.' }
  } catch (err) {
    if (err instanceof EditError) return fail(err.message)
    console.error('UpdatePurchase failed:', err)
    return fail(toFriendlyError(err))
  }
}
