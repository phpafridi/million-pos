'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import FetchProduct from './actions/FetchProduct'
import { fetchCurrency } from '../settings/actions/fetchCurrency'
import { DEFAULT_LABEL_LAYOUT, LabelLayout, readLabelLayout, renderLabel } from '@/lib/labelLayout'
import { printLabelViaQz } from '@/lib/qzLabels'

type Product = {
  product_id: number
  product_code: string | null
  product_name: string
  sku: string | null
  category: string
  price: number | null
}

type PrinterRow = { printer_name: string; applies_to: string; is_default: boolean; layout_json: string }
type LabelPrinter = { name: string; layout: LabelLayout } | null

type Selection = { product: Product; kind: 'barcode' | 'qr'; value: string }

const pickPrinter = (rows: PrinterRow[], type: string): LabelPrinter => {
  const list = rows.filter(r => r.applies_to === type)
  const p = list.find(r => r.is_default) || list[0]
  return p ? { name: p.printer_name, layout: readLabelLayout(p.layout_json) } : null
}

export default function BarcodePrint() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [currency, setCurrency] = useState('Rs')
  const [barcodePrinter, setBarcodePrinter] = useState<LabelPrinter>(null)
  const [qrPrinter, setQrPrinter] = useState<LabelPrinter>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [preview, setPreview] = useState('')
  const [askCopies, setAskCopies] = useState(false)
  const [copies, setCopies] = useState('1')
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [data, cur] = await Promise.all([FetchProduct(), fetchCurrency().catch(() => null)])
        setProducts(data.map((p: any) => ({
          product_id: p.product_id,
          product_code: p.product_code,
          product_name: p.product_name,
          sku: p.sku ?? null,
          category: p.category?.category_name || 'Uncategorized',
          price: p.prices?.[0]?.selling_price ?? null,
        })))
        const c: any = cur
        if (typeof c === 'string') setCurrency(c)
        else if (c && typeof c === 'object' && c.currency) setCurrency(c.currency)
      } finally {
        setLoading(false)
      }
      try {
        const res = await fetch('/api/printer-settings')
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const bc = pickPrinter(json.data, 'barcode')
          setBarcodePrinter(bc)
          setQrPrinter(pickPrinter(json.data, 'qr') || bc) // one label printer can do both
        }
      } catch { /* shown as "no printer set" */ }
    })()
  }, [])

  const printer = selection?.kind === 'qr' ? qrPrinter : barcodePrinter
  const layout = printer?.layout ?? DEFAULT_LABEL_LAYOUT

  // Draw the label exactly as it will print.
  useEffect(() => {
    if (!selection) { setPreview(''); return }
    let cancelled = false
    renderLabel({
      kind: selection.kind, value: selection.value, name: selection.product.product_name,
      price: selection.product.price, currency,
    }, layout).then(url => { if (!cancelled) setPreview(url) })
      .catch(err => { console.error(err); if (!cancelled) setPreview('') })
    return () => { cancelled = true }
  }, [selection, layout, currency])

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))).sort((a, b) =>
    a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)), [products])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = products.filter(p =>
      (!categoryFilter || p.category === categoryFilter) &&
      (!q || p.product_name.toLowerCase().includes(q) || (p.product_code || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)))
    const m = new Map<string, Product[]>()
    for (const p of list) m.set(p.category, [...(m.get(p.category) || []), p])
    return categories.filter(c => m.has(c)).map(c => ({ category: c, items: m.get(c)! }))
  }, [products, search, categoryFilter, categories])

  const searching = search.trim().length > 0 || !!categoryFilter
  const isOpen = (c: string) => searching || open.has(c)
  const toggle = (c: string) => setOpen(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })

  const select = (product: Product, kind: 'barcode' | 'qr', value: string | null) => {
    if (!value) { toast.error('This product has no code to print'); return }
    setSelection({ product, kind, value })
  }

  const doPrint = async () => {
    if (!selection || !printer) return
    const n = Math.floor(Number(copies))
    if (!(n >= 1 && n <= 1000)) { toast.error('Enter a number of labels between 1 and 1000'); return }
    setPrinting(true)
    try {
      await printLabelViaQz(printer.name, layout, preview, n)
      toast.success(`Sent ${n} label${n > 1 ? 's' : ''} to ${printer.name}`)
      setAskCopies(false)
    } catch (err: any) {
      toast.error(err.message || 'Print failed')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <section className="content">
      <style>{`
        .bp-cat{background:#ecf0f5;cursor:pointer;font-weight:700;}
        .bp-cat td{padding:8px 10px!important;}
        .bp-sel{background:#fff8e1!important;}
        .bp-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2000;display:flex;align-items:center;justify-content:center;}
        .bp-modal{background:#fff;border-radius:6px;padding:20px;width:340px;max-width:92vw;box-shadow:0 8px 30px rgba(0,0,0,.3);}
      `}</style>
      <div className="row">
        <div className="col-md-12">
          <div className="portlet">
            <div className="portlet-heading">
              <h3 className="portlet-title text-dark text-uppercase">Product Barcode / QR Label Print</h3>
            </div>
            <div className="portlet-body">
              <div className="row">

                {/* Left: products grouped by category */}
                <div className="col-md-6 col-sm-12">
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input type="text" placeholder="Search by name, code or SKU..." value={search}
                      onChange={e => setSearch(e.target.value)} className="form-control" />
                    <select className="form-control" style={{ maxWidth: 200 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                      <option value="">All categories</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ maxHeight: 620, overflowY: 'auto' }}>
                    <table className="table table-bordered table-hover" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th className="active">Code</th>
                          <th className="active">Product</th>
                          <th className="active">Price</th>
                          <th className="active">Print</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={4} className="text-center"><strong>Loading products...</strong></td></tr>
                        ) : groups.length === 0 ? (
                          <tr><td colSpan={4} className="text-center">No products found</td></tr>
                        ) : groups.map(g => (
                          <React.Fragment key={g.category}>
                            <tr className="bp-cat" onClick={() => !searching && toggle(g.category)}>
                              <td colSpan={4}>
                                <i className={`fa fa-chevron-${isOpen(g.category) ? 'down' : 'right'}`} style={{ marginRight: 8, width: 12 }} />
                                {g.category} <span className="text-muted" style={{ fontWeight: 400 }}>({g.items.length})</span>
                              </td>
                            </tr>
                            {isOpen(g.category) && g.items.map(p => (
                              <tr key={p.product_id} className={selection?.product.product_id === p.product_id ? 'bp-sel' : ''}>
                                <td>{p.product_code}{p.sku && <div className="text-muted" style={{ fontSize: 11 }}>SKU: {p.sku}</div>}</td>
                                <td><small>{p.product_name}</small></td>
                                <td><small>{p.price != null ? `${currency} ${p.price}` : '—'}</small></td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <button type="button" className="btn bg-navy btn-xs" title="Barcode of the product code"
                                    onClick={() => select(p, 'barcode', p.product_code)}>
                                    <i className="glyphicon glyphicon-barcode" /> Barcode
                                  </button>{' '}
                                  <button type="button" className="btn btn-default btn-xs" title="QR code of the product code"
                                    onClick={() => select(p, 'qr', p.product_code)}>
                                    <i className="glyphicon glyphicon-qrcode" /> QR
                                  </button>
                                  {p.sku && (<>{' '}
                                    <button type="button" className="btn btn-default btn-xs" title="Barcode of the SKU"
                                      onClick={() => select(p, 'barcode', p.sku)}>SKU</button>
                                  </>)}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: label preview + print */}
                <div className="col-md-6 col-sm-12">
                  <div className="box box-info">
                    <div className="box-header with-border"><h3 className="box-title">Label</h3></div>
                    <div className="box-body text-center">
                      {!selection ? (
                        <p className="text-muted" style={{ padding: 30 }}>Pick a product and click <b>Barcode</b> or <b>QR</b>.</p>
                      ) : (
                        <>
                          <div style={{ marginBottom: 8 }}>
                            <b>{selection.product.product_name}</b>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {selection.kind === 'qr' ? 'QR code' : 'Barcode'} · {selection.value} · {layout.labelWidthMm} × {layout.labelHeightMm} mm label
                            </div>
                          </div>
                          {preview && (
                            <img src={preview} alt="Label preview"
                              style={{ width: Math.min(420, layout.labelWidthMm * 6), maxWidth: '100%', border: '1px solid #ccc', borderRadius: 6, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }} />
                          )}
                          <div style={{ marginTop: 14 }}>
                            {printer ? (
                              <>
                                <button type="button" className="btn btn-primary" onClick={() => { setCopies('1'); setAskCopies(true) }}>
                                  <i className="fa fa-print" /> Print
                                </button>
                                <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>Printer: {printer.name} (via QZ Tray)</div>
                              </>
                            ) : (
                              <div className="alert alert-warning" style={{ textAlign: 'left' }}>
                                No {selection.kind === 'qr' ? 'QR / barcode' : 'barcode'} label printer is set up yet.{' '}
                                Add your label printer in <Link href="/dashboard/settings/printer-settings">Settings › Printer Settings</Link> with
                                “Applies To” set to <b>{selection.kind === 'qr' ? 'QR Code Labels' : 'Barcode Labels'}</b> and your label size.
                              </div>
                            )}
                          </div>
                          <button type="button" className="btn btn-link btn-sm" onClick={() => setSelection(null)}>Clear</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {askCopies && selection && printer && (
        <div className="bp-modal-bg" onClick={() => !printing && setAskCopies(false)}>
          <div className="bp-modal" onClick={e => e.stopPropagation()}>
            <h4 style={{ marginTop: 0 }}>How many labels?</h4>
            <p className="text-muted" style={{ fontSize: 12 }}>{selection.product.product_name} — {selection.value}</p>
            <input type="number" min={1} max={1000} step="any" autoFocus className="form-control input-lg text-center"
              value={copies} onChange={e => setCopies(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doPrint() }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" className="btn btn-default" disabled={printing} onClick={() => setAskCopies(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={printing} onClick={doPrint}>
                {printing ? <><i className="fa fa-spinner fa-spin" /> Printing…</> : <><i className="fa fa-print" /> Print</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
