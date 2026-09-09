'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import FetchShopRollup, { ShopRollupRow } from './actions/FetchShopRollup'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function firstOfMonthISO() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

export default function AllShopsReport() {
  const { data: session } = useSession()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)

  const [startDate, setStartDate] = useState(firstOfMonthISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [rows, setRows] = useState<ShopRollupRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const result = await FetchShopRollup(startDate, endDate)
      setRows(result.rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totals = rows.reduce(
    (acc, r) => ({
      sales: acc.sales + r.sales_total,
      purchases: acc.purchases + r.purchase_total,
    }),
    { sales: 0, purchases: 0 }
  )

  if (!isSuperAdmin) {
    return (
      <div className="right-side" style={{ minHeight: '945px' }}>
        <div className="container-fluid" style={{ paddingTop: 40 }}>
          <div className="alert alert-warning text-center">
            This cross-franchise report is only available to the CEO / head-office account.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">All Franchises — Purchases & Sales</a></li>
          <li><a href="#">Head Office</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary">
                <div className="box-header box-header-background with-border text-center">
                  <h3 className="box-title">Date Range</h3>
                </div>
                <div className="box-background" style={{ padding: 20 }}>
                  <div className="row">
                    <div className="col-md-4 col-md-offset-1">
                      <div className="form-group">
                        <label>Start Date</label>
                        <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>End Date</label>
                        <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-2" style={{ marginTop: 24 }}>
                      <button className="btn bg-navy btn-flat" onClick={load} disabled={loading}>
                        {loading ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="small-box bg-green">
                <div className="inner">
                  <h3>{totals.sales.toFixed(2)}</h3>
                  <p>Total Sales — All Franchises</p>
                </div>
                <div className="icon"><i className="fa fa-money"></i></div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="small-box bg-yellow">
                <div className="inner">
                  <h3>{totals.purchases.toFixed(2)}</h3>
                  <p>Total Purchases — All Franchises</p>
                </div>
                <div className="icon"><i className="fa fa-shopping-cart"></i></div>
              </div>
            </div>
          </div>

          <div className="box-footer text-center">
            <div className="row">
              <div className="col-md-12">
                <table className="table table-bordered table-striped text-center">
                  <thead>
                    <tr>
                      <th className="active text-center">Franchise</th>
                      <th className="active text-center">Status</th>
                      <th className="active text-center">Sales (# orders)</th>
                      <th className="active text-center">Sales Total</th>
                      <th className="active text-center">Purchases (#)</th>
                      <th className="active text-center">Purchase Total</th>
                      <th className="active text-center">Net (Sales − Purchases)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length > 0 ? (
                      rows.map((r) => (
                        <tr key={r.shop_id} className="text-center">
                          <td>{r.shop_name} <small className="text-muted">({r.shop_code})</small></td>
                          <td>{r.is_active ? <span className="label label-success">Active</span> : <span className="label label-default">Inactive</span>}</td>
                          <td>{r.sales_count}</td>
                          <td>{r.sales_total.toFixed(2)}</td>
                          <td>{r.purchase_count}</td>
                          <td>{r.purchase_total.toFixed(2)}</td>
                          <td>{(r.sales_total - r.purchase_total).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={7} className="text-center"><strong>{loading ? 'Loading...' : 'No franchises found.'}</strong></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
