'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FetchCustomerReport, CustomerReportData } from './actions/FetchCustomerReport'

function firstOfMonthISO() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function CustomerReport() {
  const { data: session } = useSession()
  const isSuperAdmin = Boolean((session?.user as any)?.is_super_admin)
  const [startDate, setStartDate] = useState(firstOfMonthISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [data, setData] = useState<CustomerReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const result = await FetchCustomerReport(startDate, endDate)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCustomers = data?.customers.filter((c) =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header text-center">
        <ol className="breadcrumb">
          <li><a href="#">Customer Report</a></li>
          <li><a href="#">Report</a></li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="box box-primary">
            <div className="box-header box-header-background with-border">
              <h3 className="box-title">Activity Date Range</h3>
            </div>
            <div className="box-background" style={{ padding: 16 }}>
              <div className="row">
                <div className="col-sm-4">
                  <label>From</label>
                  <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="col-sm-4">
                  <label>To</label>
                  <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="col-sm-4">
                  <label>&nbsp;</label>
                  <button className="btn bg-navy btn-flat form-control" onClick={load} disabled={loading}>
                    {loading ? 'Loading...' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {data && (
            <>
              <div className="row">
                <div className="col-md-4">
                  <div className="small-box bg-green">
                    <div className="inner"><h3>{data.totalCustomers}</h3><p>Active Customers in Range</p></div>
                    <div className="icon"><i className="fa fa-users"></i></div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="small-box bg-aqua">
                    <div className="inner"><h3>{data.totalRevenue.toFixed(0)}</h3><p>Total Revenue (POS + Tailor)</p></div>
                    <div className="icon"><i className="fa fa-money"></i></div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="small-box" style={{ background: '#b8860b', color: '#fff' }}>
                    <div className="inner"><h3>{data.goldMembers}</h3><p>Gold Members</p></div>
                    <div className="icon"><i className="fa fa-star"></i></div>
                  </div>
                </div>
              </div>

              {isSuperAdmin && data.byShop.length > 0 && (
                <div className="box box-primary">
                  <div className="box-header box-header-background with-border">
                    <h3 className="box-title">By Franchise</h3>
                  </div>
                  <div className="box-background">
                    <table className="table table-bordered table-striped" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th className="active">Franchise</th>
                          <th className="active text-right">Customers</th>
                          <th className="active text-right">Revenue (POS + Tailor)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byShop.map((s) => (
                          <tr key={s.shop_id}>
                            <td><strong>{s.shop_name}</strong> <span className="text-muted">({s.shop_code})</span></td>
                            <td className="text-right">{s.customer_count}</td>
                            <td className="text-right">{s.total_revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="box box-primary">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title">Customers</h3>
                  <input
                    type="text"
                    placeholder="Search by name or phone…"
                    className="form-control"
                    style={{ maxWidth: 260, display: 'inline-block', float: 'right' }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="box-background">
                  <div className="table-responsive">
                  <table className="table table-bordered table-striped" style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th className="active">Customer</th>
                        {isSuperAdmin && <th className="active">Franchise(s)</th>}
                        <th className="active text-right">POS Orders</th>
                        <th className="active text-right">POS Spent</th>
                        <th className="active text-right">Tailor Orders</th>
                        <th className="active text-right">Tailor Spent</th>
                        <th className="active text-right">Total Spent</th>
                        <th className="active">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length > 0 ? filteredCustomers.map((c) => (
                        <tr key={c.customer_id}>
                          <td>
                            {c.customer_name}
                            {c.is_gold_member && <span className="label" style={{ marginLeft: 6, background: '#b8860b', color: '#fff', fontSize: 10 }}>★ GOLD</span>}
                            <br /><small className="text-muted">{c.phone}</small>
                          </td>
                          {isSuperAdmin && <td style={{ fontSize: 12, color: '#4b5563' }}>{c.shops || '—'}</td>}
                          <td className="text-right">{c.pos_order_count}</td>
                          <td className="text-right">{c.pos_total_spent.toFixed(2)}</td>
                          <td className="text-right">{c.tailor_order_count}</td>
                          <td className="text-right">{c.tailor_total_spent.toFixed(2)}</td>
                          <td className="text-right"><strong>{c.total_spent.toFixed(2)}</strong></td>
                          <td>{c.last_activity ? new Date(c.last_activity).toLocaleDateString() : '—'}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={isSuperAdmin ? 8 : 7} className="text-center"><strong>No customer activity in this range.</strong></td></tr>
                      )}
                    </tbody>
                  </table>
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
