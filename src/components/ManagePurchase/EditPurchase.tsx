'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import SearchableSelect from '../shared/SearchableSelect'
import FetchProducts from '../Product/actions/FetchProduct'
import { FetchSuppliers } from './actions/FetchSupplier'
import { FetchPurchaseForEdit, UpdatePurchase } from './actions/PurchaseEditActions'
import type { PurchaseForEdit } from './actions/PurchaseEditActions'

type Product = {
  product_id: number
  product_code: string
  product_name: string
  measurement_units: string
  buying_price: number
  selling_price: number
}

type LineForm = { qty: string; buy: string; sell: string; remove: boolean }

type NewItem = {
  key: number
  product: Product
  qty: string
  buy: string
  sell: string
  damaged: string
  batch: string
  expiry: string
  mfg: string
  showMore: boolean
}

const PAYMENT_METHODS = [
  { val: 'cash', label: 'Cash' },
  { val: 'cheque', label: 'Cheque' },
  { val: 'card', label: 'Card' },
]

const num = (v: string) => (v.trim() === '' ? NaN : Number(v))
const fmt = (n: number) => n.toFixed(2)
const same = (a: number, b: number) => Math.abs(a - b) < 0.0001

export default function EditPurchase({ id }: { id: string }) {
  const router = useRouter()
  const purchaseId = Number(id)

  const [data, setData] = useState<PurchaseForEdit | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [suppliers, setSuppliers] = useState<{ supplier_id: number; supplier_name: string }[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [supplierId, setSupplierId] = useState('')
  const [ref, setRef] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [lineForms, setLineForms] = useState<Record<number, LineForm>>({})
  const [newItems, setNewItems] = useState<NewItem[]>([])
  const [pickerValue, setPickerValue] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await FetchPurchaseForEdit(purchaseId)
      if (cancelled) return
      if (!res.ok) { setLoadError(res.error); setLoading(false); return }
      const d = res.data
      setData(d)
      setSupplierId(String(d.supplier_id))
      setRef(d.purchase_ref)
      setPaymentMethod(d.payment_method)
      const forms: Record<number, LineForm> = {}
      for (const l of d.lines) {
        forms[l.purchase_product_id] = {
          qty: String(l.qty),
          buy: String(l.unit_price),
          sell: String(l.selling_price ?? l.unit_price),
          remove: false,
        }
      }
      setLineForms(forms)
      setLoading(false)

      FetchSuppliers().then((s: any[]) => !cancelled && setSuppliers((s || []).map((x) => ({ supplier_id: x.supplier_id, supplier_name: x.supplier_name }))))
      FetchProducts().then((res: any[]) => {
        if (cancelled) return
        setProducts((res || []).map((p: any) => ({
          product_id: p.product_id,
          product_code: p.product_code,
          product_name: p.product_name,
          measurement_units: p.measurement_units || '',
          buying_price: Number(p.prices?.[0]?.buying_price) || 0,
          selling_price: Number(p.prices?.[0]?.selling_price) || 0,
        })))
      })
    })()
    return () => { cancelled = true }
  }, [purchaseId])

  // Suppliers: make sure the current one is always selectable even if it has since become hidden.
  const supplierOptions = useMemo(() => {
    if (!data) return suppliers
    return suppliers.some((s) => s.supplier_id === data.supplier_id)
      ? suppliers
      : [{ supplier_id: data.supplier_id, supplier_name: data.supplier_name }, ...suppliers]
  }, [suppliers, data])

  const takenProductIds = useMemo(() => {
    const ids = new Set<number>(data?.lines.map((l) => l.product_id) ?? [])
    newItems.forEach((n) => ids.add(n.product.product_id))
    return ids
  }, [data, newItems])

  const pickerOptions = useMemo(
    () => products
      .filter((p) => !takenProductIds.has(p.product_id))
      .map((p) => ({ value: String(p.product_id), label: `${p.product_code} — ${p.product_name}`, sublabel: p.measurement_units })),
    [products, takenProductIds]
  )

  const addItem = (value: string) => {
    const product = products.find((p) => String(p.product_id) === value)
    if (!product) return
    setNewItems((prev) => [
      ...prev,
      { key: Date.now() + prev.length, product, qty: '1', buy: String(product.buying_price), sell: String(product.selling_price), damaged: '', batch: '', expiry: '', mfg: '', showMore: false },
    ])
    setPickerValue('')
  }

  const setLine = (lineId: number, patch: Partial<LineForm>) =>
    setLineForms((f) => ({ ...f, [lineId]: { ...f[lineId], ...patch } }))
  const setNew = (key: number, patch: Partial<NewItem>) =>
    setNewItems((items) => items.map((n) => (n.key === key ? { ...n, ...patch } : n)))

  // What will actually change — shown before saving, and used for the totals.
  const review = useMemo(() => {
    if (!data) return { changes: [] as string[], total: 0 }
    const changes: string[] = []
    let total = 0
    for (const l of data.lines) {
      const f = lineForms[l.purchase_product_id]
      if (!f) { total += l.qty * l.unit_price; continue }
      if (f.remove) { changes.push(`Remove ${l.product_name}`); continue }
      const q = num(f.qty), b = num(f.buy), s = num(f.sell)
      if (Number.isFinite(q) && Number.isFinite(b)) total += q * b
      if (!l.editable) continue
      const parts: string[] = []
      if (Number.isFinite(q) && !same(q, l.qty)) parts.push(`qty ${l.qty} → ${q}`)
      if (Number.isFinite(b) && !same(b, l.unit_price)) parts.push(`buying price ${fmt(l.unit_price)} → ${fmt(b)}`)
      if (Number.isFinite(s) && l.selling_price !== null && !same(s, l.selling_price)) parts.push(`selling price ${fmt(l.selling_price)} → ${fmt(s)}`)
      if (parts.length) changes.push(`${l.product_name}: ${parts.join(', ')}`)
    }
    for (const n of newItems) {
      const q = num(n.qty), b = num(n.buy)
      if (Number.isFinite(q) && Number.isFinite(b)) total += q * b
      changes.push(`Add ${n.product.product_name} × ${n.qty || '?'}`)
    }
    if (data && Number(supplierId) !== data.supplier_id) changes.push('Change supplier')
    if (data && ref.trim() !== data.purchase_ref) changes.push('Change reference')
    if (data && paymentMethod !== data.payment_method) changes.push(`Payment method → ${paymentMethod}`)
    return { changes, total }
  }, [data, lineForms, newItems, supplierId, ref, paymentMethod])

  const handleSave = async () => {
    if (!data) return
    if (review.changes.length === 0) { toast.info('Nothing has been changed yet.'); return }

    setSaving(true)
    const res = await UpdatePurchase(data.purchase_id, {
      supplier_id: Number(supplierId),
      purchase_ref: ref,
      payment_method: paymentMethod,
      lines: data.lines.map((l) => {
        const f = lineForms[l.purchase_product_id]
        return {
          purchase_product_id: l.purchase_product_id,
          qty: num(f.qty),
          buying_price: num(f.buy),
          selling_price: num(f.sell),
          remove: f.remove,
          expected_qty: l.qty, // lets the server notice if someone else edited it meanwhile
        }
      }),
      newItems: newItems.map((n) => ({
        product_id: n.product.product_id,
        qty: num(n.qty),
        buying_price: num(n.buy),
        selling_price: num(n.sell),
        damaged_qty: n.damaged.trim() === '' ? 0 : num(n.damaged),
        batch_number: n.batch || undefined,
        expiry_date: n.expiry || undefined,
        manufacture_date: n.mfg || undefined,
      })),
    })
    setSaving(false)

    if (res.success) {
      toast.success(res.message)
      router.push('/dashboard/manage-purchase/purchase/purchase-history')
    } else {
      toast.error(res.message)
    }
  }

  // ── states ─────────────────────────────────────────────────────────────
  if (loading) {
    return <section className="content"><div className="box box-primary"><div className="box-body">Loading purchase…</div></div></section>
  }
  if (loadError || !data) {
    return (
      <section className="content">
        <div className="box box-warning">
          <div className="box-header with-border"><h3 className="box-title">Can't open this purchase for editing</h3></div>
          <div className="box-body">
            <p>{loadError || 'Purchase not found.'}</p>
            <Link href="/dashboard/manage-purchase/purchase/purchase-history" className="btn btn-default">Back to Purchase History</Link>
          </div>
        </div>
      </section>
    )
  }

  const numberLabel = data.purchase_order_number.includes('PUR') ? data.purchase_order_number : `PUR-${data.purchase_order_number}`
  const cellInput: React.CSSProperties = { width: 90, textAlign: 'right' }

  return (
    <section className="content">
      <div className="row">
        <div className="col-md-12">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border">
              <h3 className="box-title">Edit Purchase — {numberLabel}</h3>
              <div className="box-tools pull-right" style={{ fontSize: 12 }}>
                Purchased on {new Date(data.purchase_date).toLocaleDateString('en-GB')}
              </div>
            </div>

            <div className="box-body">
              {data.is_warehouse && (
                <div className="alert alert-info" style={{ marginBottom: 15 }}>
                  This purchase went into a warehouse and a goods-received note (GRN) was already issued, so you can add items and increase quantities, but not reduce or remove them. Use Stock Adjustment to reduce warehouse stock.
                </div>
              )}

              {/* ── Details ── */}
              <div className="row">
                <div className="col-md-4 form-group">
                  <label>Supplier</label>
                  <select className="form-control" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    {supplierOptions.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
                  </select>
                </div>
                <div className="col-md-4 form-group">
                  <label>Reference</label>
                  <input className="form-control" value={ref} maxLength={128} onChange={(e) => setRef(e.target.value)} />
                </div>
                <div className="col-md-4 form-group">
                  <label>Payment method</label>
                  <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    {!PAYMENT_METHODS.some((p) => p.val === data.payment_method) && <option value={data.payment_method}>{data.payment_method}</option>}
                    {PAYMENT_METHODS.map((p) => <option key={p.val} value={p.val}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Existing items ── */}
              <h4 style={{ marginTop: 10 }}>Items on this purchase</h4>
              <p className="text-muted" style={{ fontSize: 12 }}>
                Quantities are in the product's own unit (pieces, meters…). A quantity can't be reduced below what has already been sold.
              </p>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Buying price</th>
                      <th className="text-right">Selling price</th>
                      <th className="text-right">Subtotal</th>
                      <th className="text-right">Already sold</th>
                      <th style={{ width: 90 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((l) => {
                      const f = lineForms[l.purchase_product_id]
                      if (!f) return null
                      const q = num(f.qty), b = num(f.buy)
                      const minQty = l.in_stock !== null ? Math.max(0.1, +(l.qty - l.in_stock).toFixed(1)) : undefined
                      const struck: React.CSSProperties = f.remove ? { textDecoration: 'line-through', opacity: 0.5 } : {}
                      const disabled = !l.editable || f.remove
                      return (
                        <tr key={l.purchase_product_id}>
                          <td style={struck}>
                            <strong>{l.product_name}</strong> <small className="text-muted">{l.product_code}</small>
                            {!l.editable && (
                              <div className="text-muted" style={{ fontSize: 12 }} title={l.lockReason ?? ''}>
                                <i className="fa fa-lock" /> Can't be changed here — {l.lockReason}
                              </div>
                            )}
                          </td>
                          <td className="text-right" style={struck}>
                            <input type="number" step="any" className="form-control input-sm" style={cellInput}
                              value={f.qty} disabled={disabled}
                              min={data.is_warehouse ? l.qty : minQty}
                              onChange={(e) => setLine(l.purchase_product_id, { qty: e.target.value })} />
                            <small className="text-muted">{l.measurement_units}</small>
                          </td>
                          <td className="text-right" style={struck}>
                            <input type="number" step="0.01" className="form-control input-sm" style={cellInput}
                              value={f.buy} disabled={disabled}
                              onChange={(e) => setLine(l.purchase_product_id, { buy: e.target.value })} />
                          </td>
                          <td className="text-right" style={struck}>
                            {l.selling_price === null ? <span className="text-muted">—</span> : (
                              <input type="number" step="0.01" className="form-control input-sm" style={cellInput}
                                value={f.sell} disabled={disabled}
                                onChange={(e) => setLine(l.purchase_product_id, { sell: e.target.value })} />
                            )}
                          </td>
                          <td className="text-right" style={struck}>{Number.isFinite(q) && Number.isFinite(b) ? fmt(q * b) : '—'}</td>
                          <td className="text-right">
                            {l.editable && l.consumed > 0 ? l.consumed : <span className="text-muted">—</span>}
                            {l.editable && l.in_stock !== null && !data.is_warehouse && (
                              <div className="text-muted" style={{ fontSize: 11 }}>can reduce by {l.in_stock}</div>
                            )}
                          </td>
                          <td className="text-center">
                            {f.remove ? (
                              <button type="button" className="btn btn-default btn-xs" onClick={() => setLine(l.purchase_product_id, { remove: false })}>Undo</button>
                            ) : (
                              <button type="button" className="btn btn-danger btn-xs"
                                disabled={!l.canRemove || data.is_warehouse}
                                title={data.is_warehouse ? 'Warehouse purchases can\'t have items removed' : (l.removeBlockReason ?? 'Remove this item from the purchase')}
                                onClick={() => setLine(l.purchase_product_id, { remove: true })}>
                                <i className="fa fa-trash-o" /> Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Add forgotten items ── */}
              <h4 style={{ marginTop: 20 }}>Add forgotten items</h4>
              <div style={{ maxWidth: 480, marginBottom: 12 }}>
                <SearchableSelect
                  className="form-control"
                  placeholder="Search a product to add…"
                  value={pickerValue}
                  onChange={addItem}
                  options={pickerOptions}
                />
              </div>

              {newItems.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Buying price</th>
                        <th className="text-right">Selling price</th>
                        <th className="text-right">Damaged</th>
                        <th className="text-right">Subtotal</th>
                        <th style={{ width: 60 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newItems.map((n) => {
                        const q = num(n.qty), b = num(n.buy)
                        return (
                          <React.Fragment key={n.key}>
                            <tr>
                              <td>
                                <strong>{n.product.product_name}</strong> <small className="text-muted">{n.product.product_code}</small>
                                <div>
                                  <a href="#" style={{ fontSize: 12 }} onClick={(e) => { e.preventDefault(); setNew(n.key, { showMore: !n.showMore }) }}>
                                    {n.showMore ? 'Hide' : 'Batch / expiry details'}
                                  </a>
                                </div>
                              </td>
                              <td className="text-right">
                                <input type="number" step="any" min="0.1" className="form-control input-sm" style={cellInput} value={n.qty} onChange={(e) => setNew(n.key, { qty: e.target.value })} />
                                <small className="text-muted">{n.product.measurement_units}</small>
                              </td>
                              <td className="text-right"><input type="number" step="0.01" min="0" className="form-control input-sm" style={cellInput} value={n.buy} onChange={(e) => setNew(n.key, { buy: e.target.value })} /></td>
                              <td className="text-right"><input type="number" step="0.01" min="0" className="form-control input-sm" style={cellInput} value={n.sell} onChange={(e) => setNew(n.key, { sell: e.target.value })} /></td>
                              <td className="text-right"><input type="number" step="any" min="0" className="form-control input-sm" style={cellInput} placeholder="0" value={n.damaged} onChange={(e) => setNew(n.key, { damaged: e.target.value })} /></td>
                              <td className="text-right">{Number.isFinite(q) && Number.isFinite(b) ? fmt(q * b) : '—'}</td>
                              <td className="text-center">
                                <button type="button" className="btn btn-default btn-xs" title="Don't add this item" onClick={() => setNewItems((items) => items.filter((x) => x.key !== n.key))}>
                                  <i className="fa fa-times" />
                                </button>
                              </td>
                            </tr>
                            {n.showMore && (
                              <tr>
                                <td colSpan={7} style={{ background: '#f9fafb' }}>
                                  <div className="row">
                                    <div className="col-md-4 form-group" style={{ marginBottom: 0 }}>
                                      <label style={{ fontSize: 12 }}>Batch number <span className="text-muted">(optional)</span></label>
                                      <input className="form-control input-sm" maxLength={100} value={n.batch} onChange={(e) => setNew(n.key, { batch: e.target.value })} />
                                    </div>
                                    <div className="col-md-4 form-group" style={{ marginBottom: 0 }}>
                                      <label style={{ fontSize: 12 }}>Manufacture date</label>
                                      <input type="date" className="form-control input-sm" value={n.mfg} onChange={(e) => setNew(n.key, { mfg: e.target.value })} />
                                    </div>
                                    <div className="col-md-4 form-group" style={{ marginBottom: 0 }}>
                                      <label style={{ fontSize: 12 }}>Expiry date</label>
                                      <input type="date" className="form-control input-sm" value={n.expiry} onChange={(e) => setNew(n.key, { expiry: e.target.value })} />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Review ── */}
              <div className="row" style={{ marginTop: 20 }}>
                <div className="col-md-7">
                  <div className="well well-sm" style={{ marginBottom: 0 }}>
                    <strong>Changes to be saved</strong>
                    {review.changes.length === 0 ? (
                      <div className="text-muted">Nothing changed yet.</div>
                    ) : (
                      <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                        {review.changes.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="col-md-5 text-right">
                  <div className="text-muted">Previous total: {fmt(data.grand_total)}</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>New total: {fmt(review.total)}</div>
                </div>
              </div>
            </div>

            <div className="box-footer">
              <button type="button" className="btn btn-success" disabled={saving || review.changes.length === 0} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>{' '}
              <Link href="/dashboard/manage-purchase/purchase/purchase-history" className="btn btn-default">Cancel</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
