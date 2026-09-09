'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FetchStockComparison, StockComparisonRow } from './actions/FetchStockComparison'

export default function StockComparisonReport() {
  const { data: session } = useSession()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)

  const [rows, setRows] = useState<StockComparisonRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await FetchStockComparison(search || undefined)
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const shopColumns = rows[0]?.shop_stock.map(s => ({ shop_id: s.shop_id, shop_name: s.shop_name })) || []

  if (!isSuperAdmin) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="container-fluid" style={{ paddingTop: 40 }}>
          <div className="alert alert-warning text-center">
            Stock comparison across franchises is only available to the CEO / head-office account.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Stock Comparison</a></li>
          <li><a href="#">Head Office</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border">
              <h3 className="box-title">Search Products</h3>
            </div>
            <div className="box-background" style={{ padding: 16 }}>
              <div className="row">
                <div className="col-md-6">
                  <input type="text" className="form-control" placeholder="Product name or code"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="col-md-2">
                  <button className="btn bg-navy btn-flat" onClick={load} disabled={loading}>
                    {loading ? 'Loading...' : 'Search'}
                  </button>
                </div>
              </div>
              <p className="text-muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                Showing up to 300 products. Narrow your search for a specific item.
              </p>
            </div>
          </div>

          <div className="box-footer">
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th className="active">Product</th>
                  {shopColumns.map((s) => (
                    <th className="active text-center" key={s.shop_id}>{s.shop_name}</th>
                  ))}
                  <th className="active text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((r) => (
                    <tr key={r.product_id}>
                      <td>{r.product_name}<br /><small className="text-muted">{r.product_code}</small></td>
                      {r.shop_stock.map((s) => (
                        <td key={s.shop_id} className="text-center" style={s.low_stock ? { background: '#fdecea', color: '#b91c1c', fontWeight: 'bold' } : undefined}>
                          {s.qty} {r.measurement_units}
                        </td>
                      ))}
                      <td className="text-center"><strong>{r.total_qty} {r.measurement_units}</strong></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={shopColumns.length + 2} className="text-center">
                      <strong>{loading ? 'Loading...' : 'No products found.'}</strong>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="text-muted" style={{ fontSize: 12 }}>
              <span style={{ background: '#fdecea', color: '#b91c1c', padding: '2px 6px', fontWeight: 'bold' }}>Highlighted</span> cells are at or below that franchise&apos;s low-stock threshold.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
