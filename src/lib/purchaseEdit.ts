// Rules for editing an existing purchase. Plain TypeScript — no database, no
// framework — so every rule can be tested on its own. The server action
// (PurchaseEditActions.ts) loads the current state, asks this file "is this
// edit allowed, and what exactly would change?", and only then touches the
// database.
//
// Why the rules are shaped this way: saving a purchase adds stock (a batch +
// inventory), but it doesn't record WHICH batch each line fed — a line that
// topped up an older batch leaves no trace of it, and damaged quantities
// aren't stored on the line. So an edit can only safely reverse a line whose
// stock can be traced to the batch THIS purchase created. Everything else is
// locked rather than guessed at — a wrong guess would silently corrupt stock.

export type DetailRow = {
  purchase_product_id: number
  product_id: number
  product_code: string
  product_name: string
  qty: number
  unit_price: number
}

export type BatchRow = {
  batch_id: number
  product_id: number
  batch_number: string
  qty: number
  qty_remaining: number
  buying_price: number
  selling_price: number
  expiry_date: string | null
}

export type LineState = DetailRow & {
  /** Quantity / price can be changed. False = shown read-only with lockReason. */
  editable: boolean
  lockReason: string | null
  /** The batch this purchase created for the line (only when editable). */
  batch: BatchRow | null
  /** How much of that batch has already been sold or moved out. */
  consumed: number
  canRemove: boolean
  removeBlockReason: string | null
}

export type LineEdit = {
  purchase_product_id: number
  qty: number
  buying_price: number
  selling_price: number
  remove?: boolean
  /**
   * The quantity this line had when the person opened the edit screen. If it
   * differs from what's in the database now, someone else changed the
   * purchase in the meantime — saving would silently overwrite their change,
   * so the edit is refused and they're asked to reload.
   */
  expected_qty?: number
}

export type NewItemInput = {
  product_id: number
  qty: number
  buying_price: number
  selling_price: number
  damaged_qty?: number
  batch_number?: string
  expiry_date?: string
  manufacture_date?: string
}

// Quantities are stored to 1 decimal place and money to 2. Comparing floats
// directly (0.1 + 0.2 !== 0.3) would make "did this change?" and "is there
// enough stock?" occasionally wrong, so compare in whole tenths / cents.
const tenths = (n: number) => Math.round(n * 10)
export const round1 = (n: number) => tenths(n) / 10
export const round2 = (n: number) => Math.round(n * 100) / 100

export const WAREHOUSE_MESSAGE =
  'This purchase went into a warehouse and a goods-received note (GRN) was already issued for it, so here you can only add items or increase quantities. To reduce warehouse stock, use Stock Adjustment.'

/** Works out, for each line, whether it can be edited and how its stock traces back. */
export function traceLines(details: DetailRow[], batches: BatchRow[]): LineState[] {
  return details.map((d) => {
    const linesForProduct = details.filter((x) => x.product_id === d.product_id).length
    const productBatches = batches.filter((b) => b.product_id === d.product_id)

    let lockReason: string | null = null
    if (linesForProduct > 1) {
      lockReason = 'This product appears on more than one line of this purchase.'
    } else if (productBatches.length === 0) {
      lockReason =
        'This line did not create its own batch of stock (it was added to an older batch, or all of it arrived damaged), so it can\'t be changed safely here.'
    } else if (productBatches.length > 1) {
      lockReason = 'This line is linked to more than one batch.'
    }

    const batch = lockReason ? null : productBatches[0]
    const consumed = batch ? round1(batch.qty - batch.qty_remaining) : 0

    let removeBlockReason: string | null = null
    if (lockReason) removeBlockReason = lockReason
    else if (batch && tenths(consumed) > 0) {
      removeBlockReason = `${consumed} of this stock has already been sold or moved.`
    } else if (batch && tenths(batch.qty) > tenths(d.qty)) {
      removeBlockReason = 'A later purchase added more stock to this same batch.'
    }

    return {
      ...d,
      editable: !lockReason,
      lockReason,
      batch,
      consumed,
      canRemove: !removeBlockReason,
      removeBlockReason,
    }
  })
}

export type PlannedLineChange = {
  line: LineState
  remove: boolean
  newQty: number
  newBuyingPrice: number
  newSellingPrice: number
  /** Change to the purchase LINE's quantity (can be negative). */
  deltaQty: number
  /** Change to sellable stock — equals deltaQty for a quantity edit, -batch.qty for a removal. */
  stockDelta: number
  qtyChanged: boolean
  pricesChanged: boolean
}

export type PlannedNewItem = {
  product_id: number
  qty: number
  damaged_qty: number
  sellable_qty: number
  buying_price: number
  selling_price: number
  batch_number: string | null
  expiry_date: string | null
  manufacture_date: string | null
}

export type EditPlan = {
  changes: PlannedLineChange[]
  newItems: PlannedNewItem[]
  grandTotal: number
  summary: string[]
}

export type PlanResult = { ok: true; plan: EditPlan } | { ok: false; error: string }

const fail = (error: string): PlanResult => ({ ok: false, error })
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))

export function planEdit(args: {
  lines: LineState[]
  edits: LineEdit[]
  newItems: NewItemInput[]
  isWarehouse: boolean
  productNames?: Record<number, string>
}): PlanResult {
  const { lines, edits, newItems, isWarehouse } = args
  const names = args.productNames ?? {}

  const byId = new Map(lines.map((l) => [l.purchase_product_id, l]))
  const editFor = new Map<number, LineEdit>()
  for (const e of edits) {
    if (!byId.has(e.purchase_product_id)) return fail('A line in your changes is no longer part of this purchase — it may have been changed by someone else. Please reload and try again.')
    if (editFor.has(e.purchase_product_id)) return fail('The same line was submitted twice.')
    editFor.set(e.purchase_product_id, e)
  }

  const changes: PlannedLineChange[] = []
  const summary: string[] = []
  let grandTotal = 0
  let keptLines = 0

  for (const line of lines) {
    const e = editFor.get(line.purchase_product_id)
    const label = line.product_name

    if (e && e.expected_qty !== undefined && tenths(e.expected_qty) !== tenths(line.qty)) {
      return fail('This purchase was changed by someone else since you opened it. Please reload and try again.')
    }

    // Not mentioned in the submission = untouched.
    if (!e) {
      grandTotal += round2(line.qty * line.unit_price)
      keptLines++
      continue
    }

    // Locked lines may be echoed back unchanged, but never modified.
    if (!line.editable) {
      const unchanged =
        !e.remove && tenths(e.qty) === tenths(line.qty) && round2(e.buying_price) === round2(line.unit_price)
      if (!unchanged) return fail(`"${label}" can't be changed here. ${line.lockReason}`)
      grandTotal += round2(line.qty * line.unit_price)
      keptLines++
      continue
    }

    const batch = line.batch!

    if (e.remove) {
      if (!line.canRemove) return fail(`"${label}" can't be removed. ${line.removeBlockReason}`)
      if (isWarehouse) return fail(WAREHOUSE_MESSAGE)
      changes.push({
        line, remove: true, newQty: 0, newBuyingPrice: line.unit_price, newSellingPrice: batch.selling_price,
        deltaQty: -line.qty, stockDelta: -batch.qty, qtyChanged: true, pricesChanged: false,
      })
      summary.push(`Removed ${label} (qty ${line.qty})`)
      continue
    }

    if (!isNum(e.qty) || e.qty <= 0) return fail(`Enter a quantity greater than zero for "${label}".`)
    if (!isNum(e.buying_price) || e.buying_price < 0) return fail(`Enter a valid buying price for "${label}".`)
    if (!isNum(e.selling_price) || e.selling_price <= 0) return fail(`Set a selling price for "${label}".`)

    const newQty = round1(e.qty)
    const newBuy = round2(e.buying_price)
    const newSell = round2(e.selling_price)
    const deltaQty = round1(newQty - line.qty)
    const qtyChanged = tenths(deltaQty) !== 0
    const pricesChanged = newBuy !== round2(line.unit_price) || newSell !== round2(batch.selling_price)

    if (tenths(deltaQty) < 0) {
      if (isWarehouse) return fail(WAREHOUSE_MESSAGE)
      // Can't take back more than is still in stock from this purchase.
      if (tenths(batch.qty_remaining) + tenths(deltaQty) < 0) {
        return fail(
          `Can't reduce "${label}" by ${Math.abs(deltaQty)} — only ${batch.qty_remaining} from this purchase is still in stock (${line.consumed} already sold or moved).`
        )
      }
    }

    if (qtyChanged || pricesChanged) {
      changes.push({
        line, remove: false, newQty, newBuyingPrice: newBuy, newSellingPrice: newSell,
        deltaQty, stockDelta: deltaQty, qtyChanged, pricesChanged,
      })
      const parts: string[] = []
      if (qtyChanged) parts.push(`qty ${line.qty} → ${newQty}`)
      if (newBuy !== round2(line.unit_price)) parts.push(`buying price ${round2(line.unit_price)} → ${newBuy}`)
      if (newSell !== round2(batch.selling_price)) parts.push(`selling price ${round2(batch.selling_price)} → ${newSell}`)
      summary.push(`Changed ${label}: ${parts.join(', ')}`)
    }
    grandTotal += round2(newQty * newBuy)
    keptLines++
  }

  // ── Newly added items ──────────────────────────────────────────────────
  const onPurchase = new Set(lines.map((l) => l.product_id))
  const addedIds = new Set<number>()
  const planned: PlannedNewItem[] = []

  for (const n of newItems) {
    if (!Number.isInteger(n.product_id) || n.product_id <= 0) return fail('One of the new items has no product selected.')
    const label = names[n.product_id] ?? `product #${n.product_id}`
    if (onPurchase.has(n.product_id)) {
      return fail(`"${label}" is already on this purchase — change its quantity in the list above instead of adding it again.`)
    }
    if (addedIds.has(n.product_id)) return fail(`"${label}" was added twice.`)
    addedIds.add(n.product_id)

    if (!isNum(n.qty) || n.qty <= 0) return fail(`Enter a quantity greater than zero for "${label}".`)
    if (!isNum(n.buying_price) || n.buying_price < 0) return fail(`Enter a valid buying price for "${label}".`)
    if (!isNum(n.selling_price) || n.selling_price <= 0) return fail(`Set a selling price for "${label}".`)

    const damagedRaw = n.damaged_qty ?? 0
    if (!isNum(damagedRaw) || damagedRaw < 0) return fail(`Damaged quantity for "${label}" is not valid.`)

    const batchNumber = typeof n.batch_number === 'string' ? n.batch_number.trim() : ''
    if (batchNumber.length > 100) return fail(`Batch number for "${label}" is too long (100 characters max).`)
    if (n.expiry_date && !isDate(n.expiry_date)) return fail(`Expiry date for "${label}" is not a valid date.`)
    if (n.manufacture_date && !isDate(n.manufacture_date)) return fail(`Manufacture date for "${label}" is not a valid date.`)

    const qty = round1(n.qty)
    const damaged = Math.min(round1(damagedRaw), qty) // can't be more damaged than arrived
    const buy = round2(n.buying_price)
    planned.push({
      product_id: n.product_id,
      qty,
      damaged_qty: damaged,
      sellable_qty: round1(qty - damaged),
      buying_price: buy,
      selling_price: round2(n.selling_price),
      batch_number: batchNumber || null,
      expiry_date: n.expiry_date || null,
      manufacture_date: n.manufacture_date || null,
    })
    grandTotal += round2(qty * buy)
    keptLines++
    summary.push(`Added ${label} (qty ${qty})`)
  }

  if (keptLines === 0) return fail('A purchase must keep at least one item.')

  return { ok: true, plan: { changes, newItems: planned, grandTotal: round2(grandTotal), summary } }
}
