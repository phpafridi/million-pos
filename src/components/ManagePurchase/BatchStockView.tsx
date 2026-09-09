'use client'

import React, { useEffect, useState } from 'react'
import { FetchAllBatches } from '../ManagePurchase/actions/SaveBatchPurchase'
import { fetchCurrency } from '../settings/actions/fetchCurrency'

type Batch = {
  batch_id: number
  batch_number: string
  product_id: number
  product: { product_name: string; product_code: string; measurement_units: string } | null
  purchase: { purchase_order_number: number; supplier_name: string } | null
  qty: number
  qty_remaining: number
  buying_price: number
  selling_price: number
  expiry_date: string | null
  manufacture_date: string | null
  purchase_date: string
  is_active: boolean
}

type Filter = 'all' | 'expiring_soon' | 'expired' | 'active'

export default function BatchStockView() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [currency, setCurrency] = useState('Rs')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const soon = new Date(today)
  soon.setDate(soon.getDate() + 90) // 90 days = expiring soon

  useEffect(() => {
    const load = async () => {
      const data = await FetchAllBatches()
      setBatches(data as Batch[])
      setLoading(false)
    }
    const getCurrency = async () => {
      const data = await fetchCurrency()
      if (data?.currency) setCurrency(data.currency)
    }
    load()
    getCurrency()
  }, [])

  const getExpiryStatus = (expiry: string | null) => {
    if (!expiry) return { label: 'No Expiry', color: '#6c757d', isExpired: false, isExpiringSoon: false }
    const d = new Date(expiry)
    d.setHours(0, 0, 0, 0)
    if (d < today) return { label: 'Expired', color: '#dc3545', isExpired: true, isExpiringSoon: false }
    if (d <= soon) return { label: 'Expiring Soon', color: '#fd7e14', isExpired: false, isExpiringSoon: true }
    return { label: 'Good', color: '#28a745', isExpired: false, isExpiringSoon: false }
  }

  const filteredBatches = batches.filter((b) => {
    const status = getExpiryStatus(b.expiry_date)
    const matchSearch =
      !search ||
      b.product?.product_name.toLowerCase().includes(search.toLowerCase()) ||
      b.product?.product_code.toLowerCase().includes(search.toLowerCase()) ||
      b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      b.purchase?.supplier_name.toLowerCase().includes(search.toLowerCase())

    const matchFilter =
      filter === 'all' ||
      (filter === 'expired' && status.isExpired) ||
      (filter === 'expiring_soon' && status.isExpiringSoon) ||
      (filter === 'active' && !status.isExpired && !status.isExpiringSoon)

    return matchSearch && matchFilter
  })

  const summary = {
    total: batches.length,
    expired: batches.filter((b) => getExpiryStatus(b.expiry_date).isExpired).length,
    expiringSoon: batches.filter((b) => getExpiryStatus(b.expiry_date).isExpiringSoon).length,
    active: batches.filter((b) => {
      const s = getExpiryStatus(b.expiry_date)
      return !s.isExpired && !s.isExpiringSoon
    }).length,
  }

  if (loading) return <div className="right-side">Loading batches...</div>

  return (
    <div className="right-side">
      <section className="content-header">
        <ol className="breadcrumb">
          <li><a href="/dashboard/manage-purchase/purchase/purchase-history">Purchase History</a></li>
          <li>Batch Stock</li>
        </ol>
      </section>
      <br />
      <div className="container-fluid">
        {/* Summary Cards */}
        <div className="row" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Batches', value: summary.total, color: '#007bff' },
            { label: 'Active / Good', value: summary.active, color: '#28a745' },
            { label: 'Expiring ≤90 days', value: summary.expiringSoon, color: '#fd7e14' },
            { label: 'Expired', value: summary.expired, color: '#dc3545' },
          ].map((card) => (
            <div key={card.label} className="col-md-3 col-sm-6">
              <div className="box" style={{ borderTop: `4px solid ${card.color}` }}>
                <div className="box-body" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: card.color }}>{card.value}</div>
                  <div style={{ color: '#666', fontSize: 13 }}>{card.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="box">
          <div className="box-header box-header-background with-border">
            <h3 className="box-title">
              <i className="fa fa-cubes" /> Batch Stock Register
            </h3>
          </div>
          <div className="box-body">
            {/* Search + Filter Row */}
            <div className="row" style={{ marginBottom: 12 }}>
              <div className="col-md-5">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search product, batch no, supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="col-md-7">
                <div className="btn-group">
                  {(['all', 'active', 'expiring_soon', 'expired'] as Filter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-default'}`}
                      onClick={() => setFilter(f)}
                    >
                      {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table table-bordered table-hover" style={{ fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f4f4f4' }}>
                    <th>#</th>
                    <th>Batch No</th>
                    <th>Product</th>
                    <th>Supplier</th>
                    <th>Purchase Date</th>
                    <th>Mfg Date</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Qty (Total)</th>
                    <th style={{ textAlign: 'right' }}>Qty Rem.</th>
                    <th style={{ textAlign: 'right' }}>Buy Price</th>
                    <th style={{ textAlign: 'right' }}>Sell Price</th>
                    <th style={{ textAlign: 'right' }}>Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((b, idx) => {
                    const expStatus = getExpiryStatus(b.expiry_date)
                    const rowStyle = expStatus.isExpired
                      ? { background: '#fff5f5' }
                      : expStatus.isExpiringSoon
                      ? { background: '#fff8f0' }
                      : {}
                    return (
                      <tr key={b.batch_id} style={rowStyle}>
                        <td>{idx + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{b.batch_number}</td>
                        <td>
                          <div>{b.product?.product_name}</div>
                          <div style={{ color: '#888', fontSize: 11 }}>{b.product?.product_code}</div>
                        </td>
                        <td>{b.purchase?.supplier_name}</td>
                        <td>{b.purchase_date ? new Date(b.purchase_date).toLocaleDateString() : '—'}</td>
                        <td>{b.manufacture_date ? new Date(b.manufacture_date).toLocaleDateString() : '—'}</td>
                        <td>{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : '—'}</td>
                        <td>
                          <span style={{
                            background: expStatus.color,
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 'bold',
                          }}>
                            {expStatus.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {b.qty} {b.product?.measurement_units}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong>{b.qty_remaining}</strong> {b.product?.measurement_units}
                        </td>
                        <td style={{ textAlign: 'right' }}>{currency} {b.buying_price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{currency} {b.selling_price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          {currency} {(b.qty_remaining * b.buying_price).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredBatches.length === 0 && (
                    <tr>
                      <td colSpan={13} style={{ textAlign: 'center', color: '#aaa', padding: '30px 0' }}>
                        No batches found
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredBatches.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#f9f9f9', fontWeight: 'bold' }}>
                      <td colSpan={8} style={{ textAlign: 'right' }}>Totals:</td>
                      <td style={{ textAlign: 'right' }}>
                        {filteredBatches.reduce((s, b) => s + b.qty, 0).toFixed(1)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {filteredBatches.reduce((s, b) => s + b.qty_remaining, 0).toFixed(1)}
                      </td>
                      <td colSpan={2}></td>
                      <td style={{ textAlign: 'right' }}>
                        {currency}{' '}
                        {filteredBatches
                          .reduce((s, b) => s + b.qty_remaining * b.buying_price, 0)
                          .toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
