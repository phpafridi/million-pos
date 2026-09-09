'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FetchTailorReport, TailorReportData } from './actions/FetchTailorReport'
import { getTailorReportByShop, TailorShopBreakdown } from './actions/getTailorReportByShop'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function firstOfMonthISO() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

const STATUS_BADGE: Record<string, string> = {
  received: 'label-default',
  in_process: 'label-warning',
  ready: 'label-info',
  delivered: 'label-success',
  cancelled: 'label-danger',
}

export default function TailorReport() {
  const { data: session } = useSession()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)
  const [shopBreakdown, setShopBreakdown] = useState<TailorShopBreakdown[]>([])
  const [startDate, setStartDate] = useState(firstOfMonthISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [data, setData] = useState<TailorReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const result = await FetchTailorReport(startDate, endDate)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isSuperAdmin) {
      getTailorReportByShop().then(setShopBreakdown)
    }
  }, [isSuperAdmin])

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Tailor Report</a></li>
          <li><a href="#">Tailor</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">

          {isSuperAdmin && (
            <div className="box box-primary">
              <div className="box-header box-header-background with-border">
                <h3 className="box-title">Tailor Performance by Franchise</h3>
              </div>
              <div className="box-background" style={{ padding: 0 }}>
                <table className="table table-striped table-bordered" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th className="active">Franchise</th>
                      <th className="active">Orders</th>
                      <th className="active">Total Value</th>
                      <th className="active">Collected</th>
                      <th className="active">Balance Due</th>
                      <th className="active">In Process</th>
                      <th className="active">Ready</th>
                      <th className="active">Delivered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shopBreakdown.length > 0 ? shopBreakdown.map((s) => (
                      <tr key={s.shop_id}>
                        <td><strong>{s.shop_name}</strong> <span className="text-muted">({s.shop_code})</span></td>
                        <td>{s.order_count}</td>
                        <td>{s.total_price.toFixed(2)}</td>
                        <td>{s.total_advance.toFixed(2)}</td>
                        <td style={{ color: s.total_balance > 0 ? '#d9403a' : '#1a9c5c' }}>{s.total_balance.toFixed(2)}</td>
                        <td>{s.status_counts['in_process'] || 0}</td>
                        <td>{s.status_counts['ready'] || 0}</td>
                        <td>{s.status_counts['delivered'] || 0}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={8} className="text-center"><strong>No tailor orders anywhere yet.</strong></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="box box-primary">
            <div className="box-header box-header-background with-border">
              <h3 className="box-title">
                Revenue Date Range
                <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 10 }}>
                  {isSuperAdmin ? '— network-wide, every franchise combined' : '— your franchise only'}
                </span>
              </h3>
            </div>
            <div className="box-background" style={{ padding: 16 }}>
              <div className="row">
                <div className="col-md-3">
                  <label>Start Date</label>
                  <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label>End Date</label>
                  <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="col-md-2" style={{ marginTop: 24 }}>
                  <button className="btn bg-navy btn-flat" onClick={load} disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {data && (
            <>
              <div className="row">
                <div className="col-md-3">
                  <div className="small-box bg-green">
                    <div className="inner"><h3>{data.revenue.total_orders}</h3><p>Orders in Range</p></div>
                    <div className="icon"><i className="fa fa-scissors"></i></div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="small-box bg-aqua">
                    <div className="inner"><h3>{data.revenue.total_price.toFixed(0)}</h3><p>Total Order Value</p></div>
                    <div className="icon"><i className="fa fa-money"></i></div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="small-box bg-yellow">
                    <div className="inner"><h3>{data.revenue.total_advance_collected.toFixed(0)}</h3><p>Advance Collected</p></div>
                    <div className="icon"><i className="fa fa-hand-o-right"></i></div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="small-box bg-red">
                    <div className="inner"><h3>{data.revenue.total_balance_due.toFixed(0)}</h3><p>Balance Due</p></div>
                    <div className="icon"><i className="fa fa-exclamation-circle"></i></div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="small-box bg-purple">
                    <div className="inner"><h3>{data.revenue.average_order_value.toFixed(0)}</h3><p>Average Order Value</p></div>
                    <div className="icon"><i className="fa fa-calculator"></i></div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-4">
                  <div className="box box-primary">
                    <div className="box-header box-header-background with-border">
                      <h3 className="box-title">By Status</h3>
                    </div>
                    <div className="box-background" style={{ padding: 16 }}>
                      {Object.entries(data.statusCounts).map(([status, count]) => (
                        <p key={status}>
                          <span className={`label ${STATUS_BADGE[status] || 'label-default'}`}>{status}</span> {count}
                        </p>
                      ))}
                      {Object.keys(data.statusCounts).length === 0 && <p className="text-muted">No orders yet.</p>}
                    </div>
                  </div>
                </div>

                <div className="col-md-8">
                  <div className="box box-primary">
                    <div className="box-header box-header-background with-border">
                      <h3 className="box-title">Due Within 7 Days (Not Yet Delivered)</h3>
                    </div>
                    <div className="box-background">
                      <table className="table table-bordered table-striped">
                        <thead>
                          <tr>
                            <th className="active">Order #</th>
                            <th className="active">Customer</th>
                            <th className="active">Garment</th>
                            <th className="active">Promised</th>
                            <th className="active">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.dueSoon.length > 0 ? (
                            data.dueSoon.map((o) => (
                              <tr key={o.tailor_order_id}>
                                <td>{o.order_number}</td>
                                <td>{o.customer_name}<br /><small className="text-muted">{o.phone}</small></td>
                                <td>{o.garment_type}</td>
                                <td>{o.promised_date ? new Date(o.promised_date).toLocaleDateString() : '—'}</td>
                                <td><span className={`label ${STATUS_BADGE[o.status]}`}>{o.status_label}</span></td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan={5} className="text-center"><strong>Nothing due soon.</strong></td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {data.overdue.length > 0 && (
                <div className="row">
                  <div className="col-md-12">
                    <div className="box box-danger">
                      <div className="box-header box-header-background with-border" style={{ background: '#fdecea' }}>
                        <h3 className="box-title"><i className="fa fa-exclamation-triangle" style={{ color: '#d9403a' }}></i> Overdue — Past Promised Date, Not Yet Delivered</h3>
                      </div>
                      <div className="box-background">
                        <table className="table table-bordered table-striped">
                          <thead>
                            <tr>
                              <th className="active">Order #</th>
                              <th className="active">Customer</th>
                              <th className="active">Garment</th>
                              <th className="active">Promised</th>
                              <th className="active">Days Overdue</th>
                              <th className="active">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.overdue.map((o) => (
                              <tr key={o.tailor_order_id}>
                                <td>{o.order_number}</td>
                                <td>{o.customer_name}<br /><small className="text-muted">{o.phone}</small></td>
                                <td>{o.garment_type}</td>
                                <td>{o.promised_date ? new Date(o.promised_date).toLocaleDateString() : '—'}</td>
                                <td><span className="label label-danger">{o.days_overdue} day{o.days_overdue === 1 ? '' : 's'}</span></td>
                                <td><span className={`label ${STATUS_BADGE[o.status]}`}>{o.status_label}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="row">
                <div className="col-md-6">
                  <div className="box box-primary">
                    <div className="box-header box-header-background with-border">
                      <h3 className="box-title">
                        By Garment Type
                        {isSuperAdmin && <span className="text-muted" style={{ fontWeight: 400, fontSize: 12, marginLeft: 8 }}>— all franchises</span>}
                      </h3>
                    </div>
                    <div className="box-background">
                      <table className="table table-bordered table-striped" style={{ marginBottom: 0 }}>
                        <thead>
                          <tr>
                            <th className="active">Garment</th>
                            <th className="active text-right">Orders</th>
                            <th className="active text-right">Total Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.garmentBreakdown.length > 0 ? data.garmentBreakdown.map((g) => (
                            <tr key={g.garment_type}>
                              <td>{g.garment_type}</td>
                              <td className="text-right">{g.count}</td>
                              <td className="text-right">{g.total_price.toFixed(2)}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={3} className="text-center"><strong>No orders in this range.</strong></td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="box box-primary">
                    <div className="box-header box-header-background with-border">
                      <h3 className="box-title">
                        Top Customers
                        {isSuperAdmin && <span className="text-muted" style={{ fontWeight: 400, fontSize: 12, marginLeft: 8 }}>— all franchises</span>}
                      </h3>
                    </div>
                    <div className="box-background">
                      <table className="table table-bordered table-striped" style={{ marginBottom: 0 }}>
                        <thead>
                          <tr>
                            <th className="active">Customer</th>
                            <th className="active text-right">Orders</th>
                            <th className="active text-right">Total Spent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topCustomers.length > 0 ? data.topCustomers.map((c) => (
                            <tr key={c.customer_id}>
                              <td>{c.customer_name}<br /><small className="text-muted">{c.phone}</small></td>
                              <td className="text-right">{c.order_count}</td>
                              <td className="text-right">{c.total_spent.toFixed(2)}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={3} className="text-center"><strong>No orders in this range.</strong></td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
