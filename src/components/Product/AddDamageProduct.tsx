'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import FetchProducts from './actions/FetchProduct'
import { AddDamageProductAction } from './actions/AddDamageProductAction'
import { FetchProductBatches, ProductBatch } from '../OrderProcess/actions/FetchProductBatches'
import PhotoPicker from '../shared/PhotoPicker'
import { UploadEntityPhotos } from '@/lib/entityPhotos'
import { toast } from 'sonner'

type Product = {
  product_id: number
  product_code: string | null
  product_name: string
  measurement_units: string | null
  status: number | null
  barcode: string | null
  inventory: number
}

export default function AddDamageProduct() {
  const { data: session } = useSession()
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [products, setProducts]               = useState<Product[]>([])
  const [searchTerm, setSearchTerm]           = useState('')
  const [searchResults, setSearchResults]     = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [batches, setBatches]                 = useState<ProductBatch[]>([])
  const [loadingBatches, setLoadingBatches]   = useState(false)
  const [qty, setQty]                         = useState<number | ''>('')
  const [note, setNote]                       = useState('')
  const [decrease, setDecrease]               = useState<'1' | '0' | ''>('')
  const [loading, setLoading]                 = useState(false)
  const [highlightedIdx, setHighlightedIdx]   = useState(-1)

  const searchRef = useRef<HTMLInputElement>(null)
  const qtyRef    = useRef<HTMLInputElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    FetchProducts().then(res => {
      setProducts((res || []).map((p: any) => ({
        product_id:        p.product_id,
        product_code:      p.product_code,
        product_name:      p.product_name,
        measurement_units: p.measurement_units || 'pcs',
        status:            p.status,
        barcode:           p.barcode || p.product_code,
        inventory:         Number(p.inventories?.[0]?.product_quantity) || 0,
      })))
    })
    searchRef.current?.focus()
  }, [])

  // Search filter
  useEffect(() => {
    const s = searchTerm.trim().toLowerCase()
    if (!s || selectedProduct) { setSearchResults([]); setHighlightedIdx(-1); return }
    const res = products.filter(p =>
      p.product_name.toLowerCase().includes(s) ||
      (p.product_code?.toLowerCase().includes(s)) ||
      (p.barcode?.toLowerCase().includes(s))
    ).slice(0, 10)
    setSearchResults(res)
    setHighlightedIdx(res.length === 1 ? 0 : -1)
  }, [searchTerm, products, selectedProduct])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select() }
      if (e.key === 'F4') { e.preventDefault(); qtyRef.current?.focus(); qtyRef.current?.select() }
      if (e.key === 'F12' || (e.ctrlKey && e.key === 'Enter')) { e.preventDefault(); submitRef.current?.click() }
      if (e.key === 'Escape') { clearSelection() }

      if (document.activeElement === searchRef.current && searchResults.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, searchResults.length - 1)) }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, 0)) }
        if (e.key === 'Enter' && highlightedIdx >= 0) { e.preventDefault(); selectProduct(searchResults[highlightedIdx]) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchResults, highlightedIdx])

  const selectProduct = async (product: Product) => {
    setSelectedProduct(product)
    setSearchTerm(product.product_name)
    setSearchResults([])
    // Fetch batches for this product
    setLoadingBatches(true)
    const b = await FetchProductBatches(product.product_id)
    setBatches(b)
    setLoadingBatches(false)
    setTimeout(() => { qtyRef.current?.focus(); qtyRef.current?.select() }, 50)
  }

  const clearSelection = () => {
    setSelectedProduct(null)
    setSearchTerm('')
    setSearchResults([])
    setBatches([])
    setQty('')
    setNote('')
    setDecrease('')
    searchRef.current?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct)              { toast.error('Please select a product'); return }
    if (!qty || Number(qty) <= 0)      { toast.error('Please enter a valid quantity'); return }
    if (decrease === '')               { toast.error('Please choose whether to decrease stock'); return }

    setLoading(true)
    const formData = new FormData()
    formData.set('product_id',   selectedProduct.product_id.toString())
    formData.set('product_code', selectedProduct.product_code ?? '')
    formData.set('product_name', selectedProduct.product_name)
    formData.set('qty',          String(qty))
    formData.set('note',         note)
    formData.set('decrease',     decrease)

    const res = await AddDamageProductAction(formData)

    if (res.success && res.data && photoFiles.length > 0) {
      try {
        await UploadEntityPhotos('damage_product', res.data.damage_product_id, photoFiles, session?.user?.name || session?.user?.email || 'Staff')
      } catch (photoErr) {
        console.error('Failed to upload photos:', photoErr)
        toast.error('Recorded, but photos failed to upload')
      }
    }
    setLoading(false)

    if (res.success) {
      toast.success('Damage product recorded successfully')
      setPhotoFiles([])
      clearSelection()
    } else {
      toast.error(res.message || 'Failed to record damage')
    }
  }

  const canSubmit = selectedProduct && qty && Number(qty) > 0 && decrease !== ''

  return (
    <>
      <style>{`
        .dmg-root { background:#f4f6fa; min-height:calc(100vh - 60px); padding:28px 20px; font-family:'Segoe UI',system-ui,sans-serif; }
        .dmg-wrap { max-width:700px; margin:0 auto; }
        .dmg-card { background:#fff; border-radius:14px; box-shadow:0 2px 20px rgba(0,0,0,.08); overflow:hidden; }

        /* Header */
        .dmg-header { background:linear-gradient(135deg,#7f1d1d 0%,#991b1b 100%); padding:18px 24px; display:flex; align-items:center; justify-content:space-between; }
        .dmg-header-left h2 { color:#fff; font-size:17px; font-weight:700; letter-spacing:.5px; margin:0 0 2px; }
        .dmg-header-left p  { color:rgba(255,255,255,.6); font-size:12px; margin:0; }
        .dmg-header-badge { background:rgba(255,255,255,.15); color:#fff; font-size:10px; font-weight:700; padding:4px 10px; border-radius:20px; letter-spacing:1px; border:1px solid rgba(255,255,255,.2); }

        /* Body */
        .dmg-body { padding:24px; display:flex; flex-direction:column; gap:18px; }

        /* Fields */
        .dmg-field { display:flex; flex-direction:column; gap:5px; }
        .dmg-label { font-size:11px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:.8px; display:flex; align-items:center; gap:6px; }
        .dmg-label .kbd { background:#f1f5f9; color:#dc2626; border:1px solid #fecaca; border-radius:3px; font-size:9px; padding:1px 5px; font-family:monospace; }
        .dmg-input { width:100%; background:#fff; border:1.5px solid #e5e7eb; color:#111827; padding:10px 14px; border-radius:8px; font-size:14px; outline:none; transition:border .15s; box-sizing:border-box; }
        .dmg-input:focus { border-color:#dc2626; box-shadow:0 0 0 3px rgba(220,38,38,.08); }
        .dmg-input::placeholder { color:#9ca3af; }
        .dmg-textarea { width:100%; background:#fff; border:1.5px solid #e5e7eb; color:#111827; padding:10px 14px; border-radius:8px; font-size:13px; outline:none; resize:vertical; min-height:80px; box-sizing:border-box; }
        .dmg-textarea:focus { border-color:#dc2626; }
        .dmg-textarea::placeholder { color:#9ca3af; }

        /* Search dropdown */
        .dmg-search-wrap { position:relative; }
        .dmg-dropdown { position:absolute; top:calc(100% + 4px); left:0; right:0; background:#fff; border:1.5px solid #e5e7eb; border-radius:10px; z-index:200; max-height:280px; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,.12); }
        .dmg-drop-item { display:flex; align-items:center; padding:10px 14px; cursor:pointer; border-bottom:1px solid #f3f4f6; gap:10px; transition:background .1s; }
        .dmg-drop-item:last-child { border-bottom:none; }
        .dmg-drop-item:hover, .dmg-drop-item.active { background:#fef2f2; }
        .dmg-drop-item .dcode { color:#9ca3af; font-size:11px; font-family:monospace; min-width:70px; }
        .dmg-drop-item .dname { color:#111827; font-size:13px; font-weight:500; flex:1; }
        .dmg-drop-item .dstock { font-size:11px; font-weight:700; min-width:60px; text-align:right; }

        /* Selected product card */
        .dmg-selected { background:#fff7f7; border:1.5px solid #fecaca; border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; }
        .dmg-sel-name { color:#111827; font-size:14px; font-weight:700; margin-bottom:2px; }
        .dmg-sel-code { color:#9ca3af; font-size:11px; font-family:monospace; }
        .dmg-sel-stock { font-size:13px; font-weight:700; }
        .dmg-change-btn { background:none; border:1px solid #fecaca; color:#dc2626; font-size:11px; padding:3px 10px; border-radius:5px; cursor:pointer; transition:all .1s; }
        .dmg-change-btn:hover { background:#fef2f2; }

        /* Batch section */
        .dmg-batch-section { background:#f9fafb; border:1.5px solid #e5e7eb; border-radius:10px; padding:14px 16px; }
        .dmg-batch-title { font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
        .dmg-batch-title::after { content:''; flex:1; height:1px; background:#e5e7eb; }
        .dmg-batch-item { display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-radius:7px; border:1px solid #e5e7eb; background:#fff; margin-bottom:6px; }
        .dmg-batch-item:last-child { margin-bottom:0; }
        .dmg-batch-item.expired { border-color:#fecaca; background:#fff7f7; }
        .dmg-batch-item.expiring { border-color:#fde68a; background:#fffbeb; }
        .dmg-batch-no { font-family:monospace; font-size:11px; font-weight:700; color:#374151; }
        .dmg-batch-meta { font-size:11px; color:#6b7280; margin-top:2px; }
        .dmg-batch-qty { font-size:13px; font-weight:700; color:#111827; text-align:right; }
        .dmg-batch-status { font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; white-space:nowrap; }
        .dmg-batch-status.expired  { background:#fee2e2; color:#dc2626; }
        .dmg-batch-status.expiring { background:#fef3c7; color:#d97706; }
        .dmg-batch-status.good     { background:#dcfce7; color:#16a34a; }
        .dmg-no-batch { color:#9ca3af; font-size:12px; text-align:center; padding:6px 0; }

        /* Grid */
        .dmg-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }

        /* Decrease buttons */
        .dmg-dec-wrap { display:flex; gap:8px; }
        .dmg-dec-btn { flex:1; padding:10px 8px; background:#fff; border:1.5px solid #e5e7eb; color:#6b7280; font-size:13px; font-weight:600; border-radius:8px; cursor:pointer; text-align:center; transition:all .12s; }
        .dmg-dec-btn:hover { border-color:#dc2626; color:#dc2626; }
        .dmg-dec-btn.yes { background:#fef2f2; border-color:#dc2626; color:#dc2626; }
        .dmg-dec-btn.no  { background:#f0fdf4; border-color:#16a34a; color:#16a34a; }

        /* Warning */
        .dmg-warning { background:#fffbeb; border:1.5px solid #fcd34d; border-radius:8px; padding:10px 14px; color:#92400e; font-size:12px; display:flex; gap:8px; align-items:flex-start; }

        /* Submit */
        .dmg-submit { width:100%; padding:13px; background:linear-gradient(135deg,#dc2626,#b91c1c); border:none; color:#fff; font-size:15px; font-weight:700; letter-spacing:1px; border-radius:8px; cursor:pointer; transition:all .15s; text-transform:uppercase; }
        .dmg-submit:hover:not(:disabled) { background:linear-gradient(135deg,#ef4444,#dc2626); transform:translateY(-1px); box-shadow:0 4px 16px rgba(220,38,38,.3); }
        .dmg-submit:disabled { opacity:.4; cursor:not-allowed; transform:none; }
        .dmg-hint { text-align:center; color:#9ca3af; font-size:11px; margin-top:6px; }
        .dmg-hint .kbd { background:#f1f5f9; color:#dc2626; border:1px solid #fecaca; border-radius:3px; font-size:9px; padding:1px 4px; font-family:monospace; margin:0 2px; }
        .dmg-divider { height:1px; background:#f3f4f6; margin:0 -24px; }
      `}</style>

      <div className="dmg-root">
        <div className="dmg-wrap">
          <div className="dmg-card">

            {/* Header */}
            <div className="dmg-header">
              <div className="dmg-header-left">
                <h2><i className="fa fa-exclamation-triangle" style={{ marginRight: 8 }} />Record Damage / Loss</h2>
                <p>Track damaged, expired or lost stock items</p>
              </div>
              <span className="dmg-header-badge">DAMAGE LOG</span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="dmg-body">

                {/* ── Product Search ── */}
                <div className="dmg-field">
                  <label className="dmg-label">
                    Product <span className="kbd">F2</span>
                  </label>
                  <div className="dmg-search-wrap">
                    {!selectedProduct ? (
                      <>
                        <input
                          ref={searchRef}
                          type="text"
                          className="dmg-input"
                          placeholder="Search by name, code or barcode…"
                          value={searchTerm}
                          autoComplete="off"
                          onChange={e => setSearchTerm(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const s = searchTerm.trim().toLowerCase()
                              if (!s) return
                              const exact = products.find(p =>
                                p.barcode?.toLowerCase() === s || p.product_code?.toLowerCase() === s
                              )
                              if (exact) { selectProduct(exact); return }
                              if (searchResults.length === 1) { selectProduct(searchResults[0]); return }
                              if (highlightedIdx >= 0 && searchResults[highlightedIdx]) selectProduct(searchResults[highlightedIdx])
                            }
                          }}
                        />
                        {searchResults.length > 0 && (
                          <div className="dmg-dropdown">
                            {searchResults.map((p, i) => (
                              <div
                                key={p.product_id}
                                className={`dmg-drop-item ${i === highlightedIdx ? 'active' : ''}`}
                                onClick={() => selectProduct(p)}
                                onMouseEnter={() => setHighlightedIdx(i)}
                              >
                                <span className="dcode">{p.product_code}</span>
                                <span className="dname">{p.product_name}</span>
                                <span className="dstock" style={{ color: p.inventory > 0 ? '#16a34a' : '#dc2626' }}>
                                  {p.inventory} {p.measurement_units}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="dmg-selected">
                        <div>
                          <div className="dmg-sel-name">{selectedProduct.product_name}</div>
                          <div className="dmg-sel-code">{selectedProduct.product_code}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div className="dmg-sel-stock" style={{ color: selectedProduct.inventory > 0 ? '#16a34a' : '#dc2626' }}>
                              {selectedProduct.inventory} {selectedProduct.measurement_units}
                            </div>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>in stock</div>
                          </div>
                          <button type="button" className="dmg-change-btn" onClick={clearSelection}>
                            ✕ Change
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Batch Info (shows when product selected) ── */}
                {selectedProduct && (
                  <div className="dmg-batch-section">
                    <div className="dmg-batch-title">
                      <i className="fa fa-cubes" style={{ color: '#6b7280' }} />
                      Batch Stock
                    </div>
                    {loadingBatches ? (
                      <div className="dmg-no-batch">
                        <i className="fa fa-spinner fa-spin" style={{ marginRight: 5 }} />Loading batches…
                      </div>
                    ) : batches.length === 0 ? (
                      <div className="dmg-no-batch">No batch records found — stock tracked at product level only</div>
                    ) : (
                      batches.map(batch => (
                        <div
                          key={batch.batch_id}
                          className={`dmg-batch-item ${batch.is_expired ? 'expired' : batch.is_expiring_soon ? 'expiring' : ''}`}
                        >
                          <div>
                            <div className="dmg-batch-no">{batch.batch_number}</div>
                            <div className="dmg-batch-meta">
                              {batch.expiry_date ? `Exp: ${batch.expiry_date}` : 'No expiry'}
                              {batch.manufacture_date ? ` · Mfg: ${batch.manufacture_date}` : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div className="dmg-batch-qty">{batch.qty_remaining}</div>
                              <div style={{ fontSize: 10, color: '#6b7280' }}>{selectedProduct.measurement_units}</div>
                            </div>
                            <span className={`dmg-batch-status ${batch.is_expired ? 'expired' : batch.is_expiring_soon ? 'expiring' : 'good'}`}>
                              {batch.is_expired
                                ? 'Expired'
                                : batch.is_expiring_soon
                                ? `${batch.days_until_expiry}d left`
                                : 'Good'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="dmg-divider" />

                {/* ── Qty + Decrease ── */}
                <div className="dmg-grid-2">
                  <div className="dmg-field">
                    <label className="dmg-label">
                      Damage Qty <span className="kbd">F4</span>
                    </label>
                    <input
                      ref={qtyRef}
                      type="number"
                      className="dmg-input"
                      placeholder="0"
                      min={0.1}
                      step={0.1}
                      value={qty}
                      onChange={e => setQty(parseFloat(e.target.value) || '')}
                    />
                    {selectedProduct && qty && Number(qty) > selectedProduct.inventory && (
                      <div style={{ color: '#d97706', fontSize: 11, marginTop: 3 }}>
                        ⚠ Exceeds current stock ({selectedProduct.inventory})
                      </div>
                    )}
                  </div>

                  <div className="dmg-field">
                    <label className="dmg-label">Deduct from Stock?</label>
                    <div className="dmg-dec-wrap">
                      <button type="button" className={`dmg-dec-btn ${decrease === '1' ? 'yes' : ''}`} onClick={() => setDecrease('1')}>
                        <i className="fa fa-arrow-down" style={{ marginRight: 4 }} />Yes
                      </button>
                      <button type="button" className={`dmg-dec-btn ${decrease === '0' ? 'no' : ''}`} onClick={() => setDecrease('0')}>
                        <i className="fa fa-times" style={{ marginRight: 4 }} />No
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                {decrease === '1' && qty && selectedProduct && (
                  <div className="dmg-warning">
                    <i className="fa fa-exclamation-triangle" style={{ marginTop: 1, flexShrink: 0 }} />
                    <span>
                      <strong>{Number(qty)} {selectedProduct.measurement_units}</strong> will be permanently
                      deducted from <strong>{selectedProduct.product_name}</strong>. This cannot be undone.
                    </span>
                  </div>
                )}

                {/* Notes */}
                <div className="dmg-field">
                  <label className="dmg-label">Reason / Notes</label>
                  <textarea
                    className="dmg-textarea"
                    placeholder="Describe the damage, reason, or any additional notes…"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>

                {/* Condition photos */}
                <div className="dmg-field">
                  <PhotoPicker files={photoFiles} onChange={setPhotoFiles} label="Photos (condition of damaged item)" />
                </div>

                {/* Submit */}
                <div>
                  <button ref={submitRef} type="submit" className="dmg-submit" disabled={loading || !canSubmit}>
                    {loading
                      ? <><i className="fa fa-spinner fa-spin" /> Recording…</>
                      : <><i className="fa fa-exclamation-triangle" style={{ marginRight: 8 }} />Record Damage <span style={{ fontFamily:'monospace', fontSize:10, opacity:.7, marginLeft:8 }}>F12</span></>
                    }
                  </button>
                  <div className="dmg-hint">
                    <span className="kbd">F2</span> product &nbsp;
                    <span className="kbd">F4</span> quantity &nbsp;
                    <span className="kbd">F12</span> submit &nbsp;
                    <span className="kbd">Esc</span> clear
                  </div>
                </div>

              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
