'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import FetchProducts from '../Product/actions/FetchProduct'
import { AdjustWarehouseStock } from './actions/AdjustWarehouseStock'
import PhotoPicker from '../shared/PhotoPicker'
import PhotoGallery from '../shared/PhotoGallery'
import { UploadEntityPhotos, FetchEntityPhotos } from '@/lib/entityPhotos'

type Product = { product_id: number; product_name: string; product_code: string; inventory: number }

export default function AddWarehouseStock() {
  const { data: session } = useSession()
  const isWarehouse = Boolean((session?.user as any)?.is_warehouse)
  const adjustedBy = session?.user?.name || session?.user?.email || 'Staff'

  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [existingPhotos, setExistingPhotos] = useState<any[]>([])

  useEffect(() => {
    if (selected) {
      FetchEntityPhotos('warehouse_stock', selected.product_id).then(setExistingPhotos).catch(() => {})
    } else {
      setExistingPhotos([])
    }
  }, [selected])

  useEffect(() => {
    if (!isWarehouse) return
    FetchProducts().then((res: any) => {
      setProducts((res || []).map((p: any) => ({
        product_id: p.product_id,
        product_name: p.product_name,
        product_code: p.product_code,
        inventory: Number(p.inventories?.[0]?.product_quantity) || 0,
      })))
    })
  }, [isWarehouse])

  const searchResults = search.trim() && !selected
    ? products.filter(p =>
        p.product_name.toLowerCase().includes(search.toLowerCase()) ||
        p.product_code.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : []

  const handleSubmit = async (sign: 1 | -1) => {
    if (!selected) { toast.error('Select a product'); return }
    if (!quantity || Number(quantity) <= 0) { toast.error('Enter a quantity'); return }

    setSaving(true)
    try {
      await AdjustWarehouseStock({
        product_id: selected.product_id,
        quantity: Number(quantity) * sign,
        reason,
        adjusted_by: adjustedBy,
      })
      if (photoFiles.length > 0) {
        try {
          await UploadEntityPhotos('warehouse_stock', selected.product_id, photoFiles, adjustedBy)
        } catch (photoErr) {
          console.error('Failed to upload photos:', photoErr)
          toast.error('Stock updated, but photos failed to upload')
        }
      }
      toast.success(sign > 0 ? 'Stock added to warehouse' : 'Stock removed from warehouse')
      setSelected(null)
      setSearch('')
      setQuantity('')
      setReason('')
      setPhotoFiles([])
      // Refresh available stock display
      FetchProducts().then((res: any) => {
        setProducts((res || []).map((p: any) => ({
          product_id: p.product_id,
          product_name: p.product_name,
          product_code: p.product_code,
          inventory: Number(p.inventories?.[0]?.product_quantity) || 0,
        })))
      })
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  if (!isWarehouse) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="container-fluid" style={{ paddingTop: 40 }}>
          <div className="alert alert-warning text-center">
            Direct warehouse stock adjustment is only available to shops flagged as a warehouse.
            Head Office is reports-only. Regular franchises record stock via New Purchase.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Add Stock to Warehouse</a></li>
          <li><a href="#">Warehouse</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-6 col-md-offset-3">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Direct Stock Adjustment</h3>
                </div>
                <div className="box-background" style={{ padding: 20 }}>
                  <p className="text-muted" style={{ fontSize: 12 }}>
                    Use this for initial stocking or manual corrections. For a real purchase from a
                    supplier/factory (with cost tracking and batch/expiry info), use <strong>Manage Purchase → New Purchase</strong> instead —
                    that&apos;s the more complete option and updates your cost basis correctly.
                  </p>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Product <span className="required">*</span></label>
                    <input type="text" className="form-control" placeholder="Search product name or code…"
                      value={selected ? `${selected.product_name} (${selected.product_code})` : search}
                      onChange={(e) => { setSearch(e.target.value); setSelected(null) }} />
                    {searchResults.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: '#fff', border: '1px solid #ddd', borderRadius: 4, maxHeight: 240, overflowY: 'auto',
                      }}>
                        {searchResults.map(p => (
                          <div key={p.product_id} onClick={() => { setSelected(p); setSearch('') }}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{p.product_name} <small className="text-muted">({p.product_code})</small></span>
                            <span className="text-muted">Stock: {p.inventory}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selected && (
                    <p className="text-muted">Current warehouse stock: <strong>{selected.inventory}</strong></p>
                  )}

                  <div className="form-group">
                    <label>Quantity <span className="required">*</span></label>
                    <input type="number" min="0.1" step="0.1" className="form-control" value={quantity}
                      onChange={(e) => setQuantity(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Reason / Note</label>
                    <input type="text" className="form-control" value={reason}
                      onChange={(e) => setReason(e.target.value)} placeholder="e.g. initial stocking, stock count correction" />
                  </div>

                  {existingPhotos.length > 0 && (
                    <div className="form-group">
                      <label>Existing Condition Photos</label>
                      <PhotoGallery photos={existingPhotos} />
                    </div>
                  )}

                  <div className="form-group">
                    <PhotoPicker files={photoFiles} onChange={setPhotoFiles} label="Add Condition Photos" />
                  </div>

                  <div className="row">
                    <div className="col-xs-6">
                      <button className="btn btn-success btn-flat btn-block" onClick={() => handleSubmit(1)} disabled={saving}>
                        {saving ? 'Saving...' : '+ Add Stock'}
                      </button>
                    </div>
                    <div className="col-xs-6">
                      <button className="btn btn-danger btn-flat btn-block" onClick={() => handleSubmit(-1)} disabled={saving}>
                        {saving ? 'Saving...' : '− Remove Stock'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
