'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import FetchProducts from '../Product/actions/FetchProduct'
import { CreateStockTransfer, TransferItemInput } from './actions/StockTransferActions'

type Shop = { shop_id: number; shop_name: string; shop_code: string }
type Product = { product_id: number; product_name: string; product_code: string; inventory: number; selling_price: number }
type CartLine = { product_id: number; product_name: string; available: number; quantity: string; unit_price: string }

export default function SendStockTransfer() {
  const { data: session } = useSession()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)
  const isWarehouseShop = Boolean((session?.user as any)?.is_warehouse)
  const createdBy = session?.user?.name || session?.user?.email || 'Staff'

  const [shops, setShops] = useState<Shop[]>([])
  const [fromShopId, setFromShopId] = useState<number | undefined>(undefined)
  const [toShopId, setToShopId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // A franchise sending a damage return can only ship it to a
    // warehouse — a warehouse sending a normal restock can go to any
    // franchise. Fetch the right list for whichever this account is.
    const url = isWarehouseShop ? '/api/shops' : '/api/shops?type=warehouse'
    fetch(url).then(r => r.json()).then(json => { if (json.success) setShops(json.data) })
  }, [isWarehouseShop])

  useEffect(() => {
    FetchProducts(fromShopId).then((res: any) => {
      setProducts((res || []).map((p: any) => ({
        product_id: p.product_id,
        product_name: p.product_name,
        product_code: p.product_code,
        inventory: Number(p.inventories?.[0]?.product_quantity) || 0,
        selling_price: Number(p.prices?.[0]?.selling_price) || 0,
      })))
    })
  }, [fromShopId])

  const searchResults = search.trim()
    ? products.filter(p =>
        p.product_name.toLowerCase().includes(search.toLowerCase()) ||
        p.product_code.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : []

  const addToCart = (p: Product) => {
    if (cart.some(c => c.product_id === p.product_id)) {
      toast.error('Already added — adjust the quantity below')
      return
    }
    setCart([...cart, {
      product_id: p.product_id,
      product_name: p.product_name,
      available: p.inventory,
      quantity: '1',
      unit_price: p.selling_price.toString(),
    }])
    setSearch('')
  }

  const updateLine = (product_id: number, field: 'quantity' | 'unit_price', value: string) => {
    setCart(cart.map(c => c.product_id === product_id ? { ...c, [field]: value } : c))
  }

  const removeLine = (product_id: number) => setCart(cart.filter(c => c.product_id !== product_id))

  const total = cart.reduce((s, c) => s + (Number(c.quantity) || 0) * (Number(c.unit_price) || 0), 0)

  const handleSubmit = async () => {
    if (!toShopId) { toast.error(isWarehouseShop ? 'Select a destination franchise' : 'Select a warehouse'); return }
    if (cart.length === 0) { toast.error('Add at least one product'); return }

    const items: TransferItemInput[] = cart.map(c => ({
      product_id: c.product_id,
      quantity: Number(c.quantity),
      unit_price: isWarehouseShop ? Number(c.unit_price) : 0,
    }))

    setSaving(true)
    try {
      const transfer = await CreateStockTransfer({
        to_shop_id: Number(toShopId),
        items,
        notes,
        created_by: createdBy,
        from_shop_id_override: fromShopId,
        transfer_type: isWarehouseShop ? 'restock' : 'damage_return',
      })
      toast.success(`Transfer ${transfer.transfer_number} sent!`)
      setCart([])
      setNotes('')
      setToShopId('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send transfer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">{isWarehouseShop ? 'Send Stock Transfer' : 'Send Damage Return'}</a></li>
          <li><a href="#">Warehouse</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-8 col-md-offset-2">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">{isWarehouseShop ? 'New Transfer' : 'New Damage Return'}</h3>
                </div>
                <div className="box-background" style={{ padding: 20 }}>

                  {isSuperAdmin && (
                    <div className="form-group">
                      <label>Sending Franchise (Head Office default)</label>
                      <select className="form-control" value={fromShopId ?? ''} onChange={(e) => setFromShopId(e.target.value ? Number(e.target.value) : undefined)}>
                        <option value="">Head Office</option>
                        {shops.filter(s => !s.shop_code.includes('HEAD-OFFICE')).map(s => (
                          <option key={s.shop_id} value={s.shop_id}>{s.shop_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>{isWarehouseShop ? 'Send To' : 'Send To Warehouse'} <span className="required">*</span></label>
                    <select className="form-control" value={toShopId} onChange={(e) => setToShopId(e.target.value)}>
                      <option value="">{isWarehouseShop ? 'Select destination franchise…' : 'Select warehouse…'}</option>
                      {shops.filter(s => s.shop_id !== fromShopId).map(s => (
                        <option key={s.shop_id} value={s.shop_id}>{s.shop_name} ({s.shop_code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Add Products</label>
                    <input type="text" className="form-control" placeholder="Search product name or code…"
                      value={search} onChange={(e) => setSearch(e.target.value)} />
                    {searchResults.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: '#fff', border: '1px solid #ddd', borderRadius: 4, maxHeight: 260, overflowY: 'auto',
                      }}>
                        {searchResults.map(p => (
                          <div key={p.product_id} onClick={() => addToCart(p)}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{p.product_name} <small className="text-muted">({p.product_code})</small></span>
                            <span className="text-muted">Stock: {p.inventory}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: 100 }}>Available</th>
                        <th style={{ width: 110 }}>Qty</th>
                        {isWarehouseShop && <th style={{ width: 130 }}>Unit Price</th>}
                        {isWarehouseShop && <th style={{ width: 100 }}>Subtotal</th>}
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.length === 0 ? (
                        <tr><td colSpan={isWarehouseShop ? 6 : 4} className="text-center text-muted">No products added yet</td></tr>
                      ) : cart.map(c => (
                        <tr key={c.product_id}>
                          <td>{c.product_name}</td>
                          <td>{c.available}</td>
                          <td>
                            <input type="number" min={1} step={1} className="form-control input-sm" value={c.quantity}
                              onChange={(e) => updateLine(c.product_id, 'quantity', e.target.value)} />
                          </td>
                          {isWarehouseShop && (
                            <td>
                              <input type="number" min={0} step={0.01} className="form-control input-sm" value={c.unit_price}
                                onChange={(e) => updateLine(c.product_id, 'unit_price', e.target.value)} />
                            </td>
                          )}
                          {isWarehouseShop && <td>{((Number(c.quantity) || 0) * (Number(c.unit_price) || 0)).toFixed(2)}</td>}
                          <td>
                            <button className="btn btn-danger btn-xs" onClick={() => removeLine(c.product_id)}>
                              <i className="fa fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isWarehouseShop && (
                    <div className="text-right" style={{ marginBottom: 16, fontSize: 16 }}>
                      <strong>Total: {total.toFixed(2)}</strong>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>

                  <button className="btn bg-navy btn-flat btn-block" onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Sending...' : (isWarehouseShop ? 'Send Transfer' : 'Send Damage Return')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
